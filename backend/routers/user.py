from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import logging

log = logging.getLogger("nexos.user")

from database import get_db, cloud_engine, get_cloud_db
from sqlalchemy import text
from models.user import User as DBUser
from schemas import UserUpdate, PasswordChangeRequest, PasswordChange, PasswordVerifyRequest
from auth_service import verify_password, get_password_hash, get_current_user
from services.email_service import send_security_otp_email
from sync_service import push_user_to_cloud

router = APIRouter(tags=["User Profile"])

@router.get("/status")
def get_status(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    return {
        "status": "online", 
        "mode": "patient-assistant",
        "email": user.email if user else None
    }

@router.get("/check-email")
def check_email(email: str, db: Session = Depends(get_db)):
    """Check if an email is already registered."""
    email_clean = email.strip()
    user = db.query(DBUser).filter(DBUser.email == email_clean).first()
    if user:
        return {"exists": True}
        
    if cloud_engine:
        with get_cloud_db() as cloud_db:
            if cloud_db:
                res = cloud_db.execute(
                    text("SELECT id FROM users WHERE email = :e LIMIT 1"),
                    {"e": email_clean}
                ).first()
                if res:
                    return {"exists": True}
    return {"exists": False}

@router.get("/patient-info")
async def get_patient_info(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_data = {
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "age": user.age,
        "gender": user.gender,
        "blood_type": user.blood_type,
        "weight": user.weight,
        "height": user.height,
        "allergies": user.allergies,
        "chronic_conditions": user.chronic_conditions,
        "emergency_contact_name": user.emergency_contact_name,
        "emergency_contact_phone": user.emergency_contact_phone,
        "profile_picture": user.profile_picture,
        "birth_date": user.birth_date,
        "is_pregnant": user.is_pregnant,
        "pregnancy_conception_date": user.pregnancy_conception_date,
        "pregnancy_due_date": user.pregnancy_due_date
    }
    return user_data

@router.patch("/update-profile")
async def update_profile(update: UserUpdate, background_tasks: BackgroundTasks, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = update.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(user, key, value)

    # Always stamp last_modified so the cloud upsert reflects the latest data
    user.last_modified = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Push directly to Supabase — covers the "Skip for Now" flow where Railway
    # may restart before the periodic scheduler runs a full sync.
    background_tasks.add_task(push_user_to_cloud, user.id)
    response_data = {
        "message": "Profile updated",
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "age": user.age,
        "gender": user.gender,
        "is_pregnant": user.is_pregnant,
        "pregnancy_conception_date": user.pregnancy_conception_date,
        "pregnancy_due_date": user.pregnancy_due_date,
        "blood_type": user.blood_type,
        "weight": user.weight,
        "height": user.height,
        "allergies": user.allergies,
        "chronic_conditions": user.chronic_conditions,
        "emergency_contact_name": user.emergency_contact_name,
        "emergency_contact_phone": user.emergency_contact_phone,
        "profile_picture": user.profile_picture,
        "birth_date": str(user.birth_date) if user.birth_date else None,
    }
    
    return response_data

@router.post("/request-password-change-otp")
async def request_password_change_otp(req: PasswordChangeRequest, background_tasks: BackgroundTasks, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(req.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    otp = f"{random.randint(100000, 999999)}"
    user.otp_code = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    if not send_security_otp_email(user.email, user.username, otp):
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")
    return {"message": "Verification code sent to your email"}

@router.post("/verify-password")
async def verify_password_route(payload: PasswordVerifyRequest, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Password verification failed")

    return {"message": "Password verified"}

@router.post("/change-password")
async def change_password(passwords: PasswordChange, background_tasks: BackgroundTasks, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.otp_code != passwords.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if user.otp_expiry is None or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="Code expired")
    
    hashed_password = get_password_hash(passwords.new_password)
    pushed_direct = False
    
    if cloud_engine:
        try:
            with get_cloud_db() as cloud_db:
                if cloud_db:
                    cloud_db.execute(
                        text("UPDATE users SET hashed_password = :hp, last_modified = :now, otp_code = None, otp_expiry = None WHERE id = :id"),
                        {"hp": hashed_password, "now": datetime.utcnow(), "id": user.id}
                    )
                    cloud_db.commit()
                    pushed_direct = True
                    log.info(f"Synchronously updated changed password for user id={user.id} in Supabase.")
        except Exception as e:
            log.error(f"Failed to update changed password directly in Supabase for user id={user.id}: {e}")

    user.hashed_password = hashed_password
    user.last_modified = datetime.utcnow()
    user.otp_code = None
    user.otp_expiry = None
    if pushed_direct:
        user.synced_at = datetime.utcnow()
    db.commit()

    if pushed_direct:
        # Delete from outbox to avoid redundant sync push
        db.execute(
            text("DELETE FROM local_changes_outbox WHERE table_name='users' AND row_id=:id"),
            {"id": user.id}
        )
        db.commit()
    else:
        # Fallback to push in background task
        background_tasks.add_task(push_user_to_cloud, user.id)

    return {"message": "Password updated successfully"}

@router.delete("/delete-account")
async def delete_account(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "Account deleted successfully"}
