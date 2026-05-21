from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
import random
import logging
import re
import requests
import os
from typing import Optional

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

    if not send_otp_email(new_user.email, new_user.username, otp):
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

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
        if not send_otp_email(user.email, user.username, otp):
            raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

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
    
    if not send_otp_email(user.email, user.username, otp):
        raise HTTPException(status_code=500, detail="Failed to resend verification email. Please try again.")
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

    if not send_password_reset_email(user.email, user.username, otp):
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
    credential = payload.credential
    if not credential:
        raise HTTPException(status_code=400, detail="Missing Google credential or access token")
    
    user_info = None
    access_token_used = False
    
    # 1. Resiliently check whether the credential is an ID token (JWT) or access token.
    # A standard JWT has 3 parts separated by dots.
    if len(credential.split('.')) == 3:
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            
            client_id = os.getenv("GOOGLE_CLIENT_ID")
            id_info = id_token.verify_oauth2_token(credential, google_requests.Request(), audience=client_id)
            if id_info.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
            
            user_info = {
                "google_id": id_info.get("sub"),
                "email": id_info.get("email"),
                "name": id_info.get("name"),
                "picture": id_info.get("picture"),
                "email_verified": id_info.get("email_verified", False)
            }
        except Exception as e:
            log.warning(f"Failed to verify credential as ID token: {e}")
            
    # 2. If not verified as ID token, attempt to verify it as an OAuth 2.0 access token.
    if not user_info:
        try:
            headers = {"Authorization": f"Bearer {credential}"}
            resp = requests.get("https://www.googleapis.com/oauth2/v3/userinfo", headers=headers)
            if resp.status_code == 200:
                info = resp.json()
                user_info = {
                    "google_id": info.get("sub"),
                    "email": info.get("email"),
                    "name": info.get("name"),
                    "picture": info.get("picture"),
                    "email_verified": info.get("email_verified", True)
                }
                access_token_used = True
            else:
                log.warning(f"Google Userinfo API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            log.error(f"Error fetching Userinfo using access token: {e}")
            
    if not user_info:
        raise HTTPException(status_code=400, detail="Invalid Google credentials or access token")
        
    google_id = user_info["google_id"]
    email = user_info["email"]
    name = user_info["name"]
    picture = user_info["picture"]
    
    # 3. Fetch birthdate and gender from Google People API if access token is used
    birth_date = None
    age = None
    gender = None
    
    if access_token_used:
        try:
            headers = {"Authorization": f"Bearer {credential}"}
            people_resp = requests.get(
                "https://people.googleapis.com/v1/people/me?personFields=birthdays,genders", 
                headers=headers
            )
            if people_resp.status_code == 200:
                people_data = people_resp.json()
                
                # Parse gender
                genders = people_data.get("genders", [])
                if genders:
                    primary_gender = next(
                        (g for g in genders if g.get("metadata", {}).get("primary")), 
                        genders[0]
                    )
                    gender_value = primary_gender.get("value", "").lower()
                    if gender_value == "male":
                        gender = "Male"
                    elif gender_value == "female":
                        gender = "Female"
                    else:
                        gender = "Other"
                        
                # Parse birthdate
                birthdays = people_data.get("birthdays", [])
                if birthdays:
                    primary_birthday = next(
                        (b for b in birthdays if b.get("metadata", {}).get("primary")), 
                        birthdays[0]
                    )
                    bdate_obj = primary_birthday.get("date", {})
                    year = bdate_obj.get("year")
                    month = bdate_obj.get("month")
                    day = bdate_obj.get("day")
                    if month and day:
                        if year:
                            try:
                                birth_date = date(year, month, day)
                                # Calculate age
                                today = date.today()
                                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                            except ValueError:
                                pass
            else:
                log.warning(f"Google People API returned status {people_resp.status_code}: {people_resp.text}")
        except Exception as e:
            log.error(f"Error fetching Google People API details: {e}")
            
    # 4. Check if user already exists (by google_id or email)
    user = None
    if google_id:
        user = db.query(DBUser).filter(DBUser.google_id == google_id).first()
    if not user and email:
        user = db.query(DBUser).filter(DBUser.email == email).first()
        if user and google_id:
            # Associate google_id if not already associated
            user.google_id = google_id
            db.commit()
            
    is_new_user = False
    
    if user:
        # Existing User: Log them in, update any missing/stale profile attributes
        updated = False
        if not user.google_id and google_id:
            user.google_id = google_id
            updated = True
        if not user.profile_picture and picture:
            user.profile_picture = picture
            updated = True
        if not user.birth_date and birth_date:
            user.birth_date = birth_date
            updated = True
        if not user.age and age:
            user.age = age
            updated = True
        if not user.gender and gender:
            user.gender = gender
            updated = True
            
        # Ensure is_verified is set to 1 (verified)
        if user.is_verified != 1:
            user.is_verified = 1
            updated = True
            
        if updated:
            db.commit()
            db.refresh(user)
    else:
        # New User: Auto-generate a unique and well-formatted username
        is_new_user = True
        username = generate_formatted_username(name, email, db)
        
        # Register a verified user with a secure randomized password
        import secrets
        random_password = secrets.token_urlsafe(16)
        hashed_password = get_password_hash(random_password)
        
        user = DBUser(
            username=username,
            email=email,
            hashed_password=hashed_password,
            is_verified=1,
            google_id=google_id,
            profile_picture=picture,
            birth_date=birth_date,
            age=age,
            gender=gender or "Other"  # default to "Other"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Trigger background tasks for new user complete registration
        background_tasks.add_task(send_welcome_email, user.email, user.username)
        background_tasks.add_task(initial_pull_all, user.username)
        
    access_token = create_access_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": "patient",
        "is_new_user": is_new_user,
        "email": user.email,
        "birth_date": user.birth_date,
        "gender": user.gender,
        "is_verified": True
    }
