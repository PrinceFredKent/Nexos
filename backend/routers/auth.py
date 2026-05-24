from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
import random
import logging
import re
import requests
import os
from typing import Optional

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    _GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    _GOOGLE_AUTH_AVAILABLE = False

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

from database import get_db, cloud_engine
from models.user import User as DBUser
from schemas import (
    UserSignup, UserLogin, VerifyOTP, 
    ForgotPasswordRequest, VerifyPasswordOTPRequest, ResetPasswordRequest,
    GoogleLogin
)
from auth_service import (
    get_password_hash, verify_password, create_access_token
)
from sync_service import (
    initial_pull_credentials, initial_pull_all, run_sync
)
from services.email_service import (
    send_otp_email, send_welcome_email, send_password_reset_email
)
from services.sms_service import send_otp_sms, send_password_reset_sms


def _deliver_otp(phone: str | None, email: str, username: str, otp: str) -> bool:
    """Always deliver OTP via email. SMS via Termii is disabled/bypassed for now."""
    log.info(f"Bypassing SMS for {username}. Delivering OTP via email to {email}.")
    return send_otp_email(email, username, otp)


def _deliver_reset_otp(phone: str | None, email: str, username: str, otp: str) -> bool:
    """Always deliver password reset OTP via email. SMS via Termii is disabled/bypassed for now."""
    log.info(f"Bypassing SMS for {username}. Delivering password reset OTP via email to {email}.")
    return send_password_reset_email(email, username, otp)

log = logging.getLogger("nexos.auth")

router = APIRouter(tags=["Authentication"])

def _merge_cloud_user_into_local(db: Session, user: Optional[DBUser], cloud_data: dict) -> DBUser:
    valid_cols = {c.key for c in DBUser.__table__.columns}
    filtered = {k: v for k, v in cloud_data.items() if k in valid_cols}
    if user:
        for key, value in filtered.items():
            setattr(user, key, value)
    else:
        user = db.merge(DBUser(**filtered))

    user.synced_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user

@router.post("/signup")
async def signup(user: UserSignup, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    if user.email:
        db_email = db.query(DBUser).filter(DBUser.email == user.email).first()
        if db_email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the password
    hashed_password = get_password_hash(user.password)
    
    # Store user data
    new_user = DBUser(
        username=user.username,
        email=user.email,
        phone=user.phone,
        hashed_password=hashed_password,
        age=user.age,
        gender=user.gender,
        blood_type=user.blood_type,
        weight=user.weight,
        height=user.height,
        allergies=user.allergies,
        chronic_conditions=user.chronic_conditions,
        emergency_contact_name=user.emergency_contact_name,
        emergency_contact_phone=user.emergency_contact_phone,
        profile_picture=user.profile_picture,
        birth_date=user.birth_date,
        google_id=user.google_id
    )
    
    # If Google ID is provided, auto-verify
    if user.google_id:
        new_user.is_verified = 1
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    if new_user.is_verified:
        # Send Welcome Email immediately if verified (Google signup)
        background_tasks.add_task(send_welcome_email, new_user.email, new_user.username)
        background_tasks.add_task(initial_pull_all, new_user.username)
        access_token = create_access_token(data={"sub": new_user.username})
        return {
            "message": "Welcome to Nexos! Registration complete.",
            "access_token": access_token,
            "token_type": "bearer",
            "username": new_user.username,
            "is_verified": True,
            "is_new_device": True
        }

    # Generate OTP for email signups
    otp = f"{random.randint(100000, 999999)}"
    new_user.otp_code = otp
    new_user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    if not _deliver_otp(new_user.phone, new_user.email, new_user.username, otp):
        raise HTTPException(status_code=500, detail="Failed to send verification code. Please try again.")

    background_tasks.add_task(run_sync)
    return {
        "message": "Account created. Please verify your email.", 
        "username": new_user.username,
        "email": new_user.email,
        "is_verified": False
    }

@router.post("/login")
async def login(credentials: UserLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Step 1: Check local SQLite first — instant, no network latency
    user = db.query(DBUser).filter(DBUser.email == credentials.email).first()
    is_new_device = False
    cloud_data = None

    if cloud_engine:
        cloud_data = await initial_pull_credentials(credentials.email)

    # Step 2: Not found locally? Try pulling credentials from Supabase only
    if not user and cloud_data:
        user = _merge_cloud_user_into_local(db, None, cloud_data)
        is_new_device = True

    # Step 3: Validate local password first
    if user and verify_password(credentials.password, user.hashed_password):
        if cloud_engine and cloud_data:
            local_last_modified = user.last_modified or datetime.min
            cloud_last_modified = cloud_data.get("last_modified")
            if cloud_last_modified and cloud_last_modified > local_last_modified:
                if not verify_password(credentials.password, cloud_data["hashed_password"]):
                    raise HTTPException(status_code=401, detail="Invalid email or password")
                user = _merge_cloud_user_into_local(db, user, cloud_data)
                background_tasks.add_task(initial_pull_all, user.username)

    # Step 4: Fallback to cloud verification when local password is stale or invalid
    elif user and cloud_engine and cloud_data and verify_password(credentials.password, cloud_data["hashed_password"]):
        user = _merge_cloud_user_into_local(db, user, cloud_data)
        background_tasks.add_task(initial_pull_all, user.username)

    else:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        # Re-send OTP if not verified
        otp = f"{random.randint(100000, 999999)}"
        user.otp_code = otp
        user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
        db.commit()
        if not _deliver_otp(user.phone, user.email, user.username, otp):
            raise HTTPException(status_code=500, detail="Failed to send verification code. Please try again.")

        return {
            "access_token": None,
            "username": user.username,
            "email": user.email,
            "is_verified": False,
            "detail": "Account not verified. Code sent."
        }

    access_token = create_access_token(data={"sub": user.username})

    # Step 5: New device — stream remaining data in background while user enters app
    if is_new_device:
        background_tasks.add_task(initial_pull_all, user.username)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": "patient",
        "is_new_device": is_new_device,
    }

@router.post("/verify-otp")
async def verify_otp(data: VerifyOTP, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.otp_code != data.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="Code expired")
    
    user.is_verified = 1
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    
    # Send Welcome Email
    background_tasks.add_task(send_welcome_email, user.email, user.username)
    background_tasks.add_task(initial_pull_all, user.username)
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": "patient",
        "is_new_device": True,
        "message": "Verification successful. Welcome to Nexos!"
    }

@router.post("/resend-otp")
async def resend_otp(email_data: dict, db: Session = Depends(get_db)):
    email = email_data.get("email")
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp = f"{random.randint(100000, 999999)}"
    user.otp_code = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    if not _deliver_otp(user.phone, user.email, user.username, otp):
        raise HTTPException(status_code=500, detail="Failed to resend verification code. Please try again.")
    return {"message": "Verification code resent"}

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address")

    otp = f"{random.randint(100000, 999999)}"
    user.otp_code = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    if not _deliver_reset_otp(user.phone, user.email, user.username, otp):
        raise HTTPException(status_code=500, detail="Failed to send password reset code. Please try again.")
    return {"message": "Password reset code sent"}

@router.post("/verify-password-otp")
async def verify_password_otp(req: VerifyPasswordOTPRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.otp_code != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if user.otp_expiry is None or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="Code expired")
        
    return {"message": "Code verified"}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.otp_code != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if user.otp_expiry is None or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="Code expired")
        
    user.hashed_password = get_password_hash(req.new_password)
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    
    return {"message": "Password has been reset successfully"}


def generate_formatted_username(full_name: str, email: str, db: Session) -> str:
    # Base username from full_name or email prefix
    name_source = full_name if (full_name and full_name.strip()) else email.split('@')[0]
    # Remove non-alphanumeric characters, convert to lowercase
    base_username = re.sub(r'[^a-zA-Z0-9]', '', name_source).lower()
    
    # Enforce min length of 3
    if not base_username:
        base_username = "user"
    elif len(base_username) < 3:
        base_username = f"{base_username}user"[:3]
        
    # Enforce uniqueness
    username = base_username
    suffix = 1
    while db.query(DBUser).filter(DBUser.username == username).first() is not None:
        username = f"{base_username}{suffix}"
        suffix += 1
        
    return username


@router.post("/google-login")
async def google_login(payload: GoogleLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Authenticate using a Google Identity Services credential (ID token)."""
    if not _GOOGLE_AUTH_AVAILABLE:
        raise HTTPException(status_code=503, detail="Google auth library not installed on this server.")
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on this server.")

    # Verify the ID token with Google's servers
    try:
        id_info = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except ValueError as e:
        log.warning(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google credential.")

    google_id = id_info.get("sub")
    email = id_info.get("email")
    full_name = id_info.get("name", "")
    profile_picture = id_info.get("picture", "")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Incomplete Google profile data.")

    # Look up by google_id first, fall back to email
    user = (
        db.query(DBUser).filter(DBUser.google_id == google_id).first()
        or db.query(DBUser).filter(DBUser.email == email).first()
    )

    if user:
        # Existing user — update google_id and profile picture if needed
        if not user.google_id:
            user.google_id = google_id
        if profile_picture and not user.profile_picture:
            user.profile_picture = profile_picture
        if not user.is_verified:
            user.is_verified = 1
        db.commit()
        db.refresh(user)
        is_new = False
    else:
        # New user via Google — auto-create and verify
        username = generate_formatted_username(full_name, email, db)
        user = DBUser(
            username=username,
            email=email,
            google_id=google_id,
            profile_picture=profile_picture,
            is_verified=1,
            gender="other",
            blood_type="Unknown",
            phone="0000000000",
            hashed_password=get_password_hash(os.urandom(32).hex()),  # Unusable password
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        background_tasks.add_task(send_welcome_email, user.email, user.username)
        background_tasks.add_task(initial_pull_all, user.username)
        is_new = True

    access_token = create_access_token(data={"sub": user.username})
    log.info(f"Google login: user='{user.username}' new={is_new}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": "patient",
        "is_new_device": is_new,
    }
