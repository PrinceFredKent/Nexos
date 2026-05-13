from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json
import sys
import os
import logging
from sqlalchemy.orm import Session, joinedload

# Configure logging
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nexos.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger("nexos")
log.setLevel(logging.INFO)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from auth_service import get_password_hash, verify_password, create_access_token, get_current_user
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from database import engine, get_db, Base, cloud_engine
from models.user import User as DBUser
from models.medication import Medication as DBMedication, MedicationIntake as DBIntake
from models.cycle import CycleLog as DBCycleLog
from models.symptom_log import SymptomLog as DBSymptomLog
from models.appointment import Appointment as DBAppointment
from models.health_knowledge import HealthCondition, HealthInsight
from models.sync_meta import SyncMeta  # noqa: F401 — registers table with Base
from sync_service import (
    get_sync_status, estimate_pending_push,
    initial_pull_credentials, initial_pull_all, run_sync
)
from services.email_service import (
    send_otp_email, send_welcome_email, 
    send_password_reset_email, send_security_otp_email
)
import random
from datetime import datetime, date, timedelta


# Create all local SQLite tables (instant — no network)
Base.metadata.create_all(bind=engine)

# Background sync scheduler
_scheduler = AsyncIOScheduler()

app = FastAPI(title="AI Health Assistant API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Start periodic cloud sync on app launch and migrate data."""
    # Data migration from static to dynamic
    db = next(get_db())
    try:
        from services.ai_service import LOCAL_CONDITION_REGISTRY
        if db.query(HealthCondition).count() == 0:
            log.info("Migrating static medical data to database...")
            for name, data in LOCAL_CONDITION_REGISTRY.items():
                db.add(HealthCondition(
                    name=name,
                    symptoms=json.dumps(data["symptoms"]),
                    explanation=data["explanation"],
                    action_steps=json.dumps(data["action_steps"]),
                    is_emergency=data.get("is_emergency", False),
                    female_only=data.get("female_only", False),
                    required_any=json.dumps(data.get("required_any", [])),
                    icon=data.get("icon", "medical_services")
                ))
            db.commit()
            log.info("Migration complete.")
    except Exception as e:
        log.error(f"Migration error: {e}")
    finally:
        db.close()

    interval = int(os.environ.get("SYNC_INTERVAL_MINUTES", "5"))
    if interval > 0 and cloud_engine:
        _scheduler.add_job(run_sync, "interval", minutes=interval, id="periodic_sync")
        _scheduler.start()
        log.info(f"Sync scheduler started — interval: {interval} min")
    else:
        log.info("Sync scheduler disabled (no cloud engine or interval=0).")

@app.on_event("shutdown")
async def shutdown_event():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)

# PyInstaller creates a temporary folder and stores path in _MEIPASS
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    FRONTEND_DIR = os.path.join(BASE_DIR, "dist")
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

class UserSignup(BaseModel):
    username: str
    email: str
    phone: str
    password: str
    age: Optional[int] = None
    gender: str
    blood_type: str
    weight: Optional[str] = None
    height: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    profile_picture: Optional[str] = None
    birth_date: Optional[date] = None
    google_id: Optional[str] = None

class UserUpdate(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    weight: Optional[str] = None
    height: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    profile_picture: Optional[str] = None
    birth_date: Optional[date] = None
    username: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class GoogleLogin(BaseModel):
    credential: str

class VerifyOTP(BaseModel):
    email: str
    otp_code: str

class PasswordChangeRequest(BaseModel):
    current_password: str

class PasswordChange(BaseModel):
    new_password: str
    otp_code: str

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyPasswordOTPRequest(BaseModel):
    email: str
    otp_code: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str

class Symptom(BaseModel):
    name: str

class SymptomAnalysisRequest(BaseModel):
    symptoms: List[str]
    cycle_context: Optional[str] = None

class CycleLogCreate(BaseModel):
    period_start: date
    period_end: Optional[date] = None
    cycle_length: Optional[int] = 28
    notes: Optional[str] = None

class CycleLogUpdate(BaseModel):
    period_end: Optional[date] = None
    cycle_length: Optional[int] = None
    notes: Optional[str] = None

class CycleLogResponse(BaseModel):
    id: int
    period_start: date
    period_end: Optional[date] = None
    cycle_length: Optional[int] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class HealthVitals(BaseModel):
    heart_rate: Optional[int] = None
    blood_pressure_sys: Optional[int] = None
    blood_pressure_dia: Optional[int] = None
    oxygen_level: Optional[int] = None

class MedicationCreate(BaseModel):
    name: str
    dosage: str
    frequency: str
    time: str
    icon: Optional[str] = "pill"
    stock: int = 30
    total_stock: int = 30

class MedicationResponse(MedicationCreate):
    id: int
    last_taken: Optional[datetime] = None
    taken_today: List[str] = []

    class Config:
        from_attributes = True

class IntakeRecord(BaseModel):
    slot: str
    taken_at: datetime

    class Config:
        from_attributes = True

# Root route is handled at the bottom now


@app.get("/status")
def get_status(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    return {
        "status": "online", 
        "mode": "patient-assistant",
        "email": user.email if user else None
    }


# ─── Sync Status & Control ─────────────────────────────────────────────

@app.get("/sync-status")
async def sync_status_endpoint():
    """Full sync state: last sync time, pending rows, cloud reachability."""
    data = get_sync_status()
    if not data["is_syncing"]:
        data["pending_push"] = estimate_pending_push()
    data["sync_interval_minutes"] = int(os.environ.get("SYNC_INTERVAL_MINUTES", "5"))
    data["cloud_configured"] = cloud_engine is not None
    return data


@app.get("/sync-progress")
async def sync_progress_endpoint():
    """Lightweight poll for the frontend toast progress bar on new-device first launch."""
    s = get_sync_status()
    return {
        "progress": s["initial_pull_progress"],
        "status_msg": s["initial_pull_status"],
        "done": s["initial_pull_done"],
    }


@app.post("/sync-now")
async def sync_now(username: str = Depends(get_current_user)):
    """Manually trigger an immediate bidirectional sync."""
    if not cloud_engine:
        return {"status": "no_cloud", "message": "Cloud database not configured"}
    result = await run_sync()
    return result or {"pushed": 0, "pulled": 0}

class RecommendationRequest(BaseModel):
    name: str
    age: int
    weight: Optional[str] = None

from services.med_service import get_medication_recommendation

@app.post("/recommend-medication")
async def recommend_medication(req: RecommendationRequest):
    return await get_medication_recommendation(req.name, req.age, req.weight)

from services.ai_service import get_symptom_analysis, get_suggested_symptoms

@app.post("/signup")
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
        background_tasks.add_task(run_sync)
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


@app.post("/login")
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

# @app.post("/google-login")
# async def google_login(data: GoogleLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
#     try:
#         # Verify the Google ID token
#         id_info = id_token.verify_oauth2_token(
#             data.credential, 
#             google_requests.Request(), 
#             os.environ.get("GOOGLE_CLIENT_ID")
#         )
# 
#         email = id_info.get('email')
#         google_id = id_info.get('sub')
#         name = id_info.get('name', email.split('@')[0])
#         picture = id_info.get('picture')
# 
#         if not email:
#             raise HTTPException(status_code=400, detail="Email not provided by Google")
# 
#         # Step 1: Check if user exists by google_id
#         user = db.query(DBUser).filter(DBUser.google_id == google_id).first()
# 
#         # Step 2: If not, check by email
#         if not user:
#             user = db.query(DBUser).filter(DBUser.email == email).first()
#             if user:
#                 # Link existing email account to Google
#                 user.google_id = google_id
#                 user.is_verified = 1
#                 if not user.profile_picture:
#                     user.profile_picture = picture
#                 db.commit()
#                 db.refresh(user)
# 
#         # Step 3: Handle new vs existing user
#         if not user:
#             # First time Google user - don't create account yet, return info for registration flow
#             return {
#                 "is_new_user": True,
#                 "email": email,
#                 "full_name": name,
#                 "profile_picture": picture,
#                 "google_id": google_id
#             }
# 
#         # Existing user - return token
#         access_token = create_access_token(data={"sub": user.username})
#         return {
#             "access_token": access_token,
#             "token_type": "bearer",
#             "username": user.username,
#             "role": "patient",
#             "is_new_device": True, # Ensure sync
#             "email": user.email
#         }
# 
#     except ValueError:
#         # Invalid token
#         raise HTTPException(status_code=401, detail="Invalid Google token")
#     except Exception as e:
#         log.error(f"Google login error: {str(e)}")
#         raise HTTPException(status_code=500, detail="Internal server error during Google login")

@app.post("/verify-otp")
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
    background_tasks.add_task(run_sync)
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": "patient",
        "is_new_device": True, # Trigger sync for new verified users
        "message": "Verification successful. Welcome to Nexos!"
    }

@app.post("/resend-otp")
async def resend_otp(email_data: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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

@app.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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

@app.post("/verify-password-otp")
async def verify_password_otp(req: VerifyPasswordOTPRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.otp_code != req.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if user.otp_expiry is None or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="Code expired")
        
    return {"message": "Code verified"}

@app.post("/reset-password")
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

@app.post("/analyze-symptoms")
async def analyze_symptoms(request: SymptomAnalysisRequest, db: Session = Depends(get_db)):
    """Analyze symptoms with optional female cycle context and store result if user is known."""
    result = await get_symptom_analysis(request.symptoms, cycle_context=request.cycle_context, db=db)
    if result["status"] == "Error":
        raise HTTPException(status_code=500, detail=result.get("analysis", "Unknown error"))
    
    # Optional: Persist to SymptomLog if we can identify the user
    # We might need a separate endpoint or pass token. 
    # For now, let's just return result and handle persistence in a 'save-analysis' endpoint if needed, 
    # OR try to get user from dependency if provided.
    
    return result

@app.post("/save-analysis")
async def save_analysis(data: dict, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user: raise HTTPException(status_code=404)
    
    new_log = DBSymptomLog(
        user_id=user.id,
        symptoms=json.dumps(data.get("symptoms", [])),
        top_condition=data.get("top_condition"),
        risk_level=data.get("risk_level"),
        explanation=data.get("explanation")
    )
    db.add(new_log)
    db.commit()
    return {"status": "saved"}

@app.get("/analysis-history")
async def get_analysis_history(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user: raise HTTPException(status_code=404)
    
    history = []
    for log in sorted(user.symptom_logs, key=lambda x: x.timestamp, reverse=True):
        try:
            symp_list = json.loads(log.symptoms) if log.symptoms else []
        except:
            symp_list = []
        history.append({
            "id": log.id,
            "symptoms": symp_list,
            "top_condition": log.top_condition,
            "risk_level": log.risk_level,
            "explanation": log.explanation,
            "timestamp": log.timestamp
        })
    return history

@app.post("/suggest-symptoms")
async def suggest_symptoms(symptoms: List[str]):
    """Suggest related symptoms based on user selection."""
    return await get_suggested_symptoms(symptoms)

# ─── Cycle Log Endpoints ────────────────────────────────────────────────────

@app.get("/cycle-logs", response_model=List[CycleLogResponse])
async def get_cycle_logs(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all cycle logs for the authenticated female user."""
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.cycle_logs

@app.post("/cycle-logs", response_model=CycleLogResponse)
async def create_cycle_log(log: CycleLogCreate, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Log a new period start date."""
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_log = DBCycleLog(
        user_id=user.id,
        period_start=log.period_start,
        period_end=log.period_end,
        cycle_length=log.cycle_length,
        notes=log.notes
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

@app.patch("/cycle-logs/{log_id}", response_model=CycleLogResponse)
async def update_cycle_log(log_id: int, update: CycleLogUpdate, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update period end date or cycle length for a log."""
    user = db.query(DBUser).filter(DBUser.username == username).first()
    log = db.query(DBCycleLog).filter(DBCycleLog.id == log_id, DBCycleLog.user_id == user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Cycle log not found")
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(log, key, value)
    db.commit()
    db.refresh(log)
    return log

@app.delete("/cycle-logs/{log_id}")
async def delete_cycle_log(log_id: int, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a cycle log entry."""
    user = db.query(DBUser).filter(DBUser.username == username).first()
    log = db.query(DBCycleLog).filter(DBCycleLog.id == log_id, DBCycleLog.user_id == user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Cycle log not found")
    db.delete(log)
    db.commit()
    return {"message": "Cycle log deleted"}

@app.get("/patient-info")
async def get_patient_info(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Convert DB model to dict for response
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
        "birth_date": user.birth_date
    }
    return user_data

@app.post("/request-password-change-otp")
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

@app.post("/change-password")
async def change_password(passwords: PasswordChange, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.otp_code != passwords.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if user.otp_expiry is None or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(status_code=400, detail="Code expired")
    
    user.hashed_password = get_password_hash(passwords.new_password)
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    return {"message": "Password updated successfully"}

@app.delete("/delete-account")
async def delete_account(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # In a real app, you might want to cascade delete or soft delete
    # For this implementation, we'll perform a full delete of the user
    # SQLAlchemy relationship cascade should handle related data if configured
    db.delete(user)
    db.commit()
    return {"message": "Account deleted successfully"}

@app.patch("/update-profile")
async def update_profile(update: UserUpdate, background_tasks: BackgroundTasks, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update only provided fields
    update_data = update.dict(exclude_unset=True)
    new_username = update_data.get("username")
    
    # Check if new username is already taken
    if new_username and new_username != user.username:
        existing = db.query(DBUser).filter(DBUser.username == new_username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    
    # Run sync to push updated profile
    background_tasks.add_task(run_sync)
    
    # Return full updated profile so frontend can immediately hydrate state
    response_data = {
        "message": "Profile updated",
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
        "birth_date": str(user.birth_date) if user.birth_date else None,
    }
    
    # If username changed, issue a new token
    if new_username:
        response_data["access_token"] = create_access_token(data={"sub": user.username})
        
    return response_data

@app.get("/medications")
async def get_medications(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = date.today()

    # Single JOIN query — eliminates N+1 (one query instead of one per medication)
    meds = (
        db.query(DBMedication)
        .options(joinedload(DBMedication.intakes))
        .filter(DBMedication.user_id == user.id)
        .all()
    )

    def get_date(dt):
        if dt is None: return None
        if hasattr(dt, 'date'): return dt.date()
        if isinstance(dt, str):
            try:
                # Common SQLite/ISO formats
                return datetime.fromisoformat(dt.replace('Z', '+00:00')).date()
            except:
                return None
        return None

    return [
        {
            "id": med.id,
            "name": med.name,
            "dosage": med.dosage,
            "frequency": med.frequency,
            "time": med.time,
            "icon": med.icon,
            "stock": med.stock,
            "total_stock": med.total_stock,
            "last_taken": med.last_taken,
            "taken_today": [i.slot for i in med.intakes if get_date(i.taken_at) == today],
        }
        for med in meds
    ]

@app.post("/medications", response_model=MedicationResponse)
async def create_medication(med: MedicationCreate, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_med = DBMedication(
        user_id=user.id,
        name=med.name,
        dosage=med.dosage,
        frequency=med.frequency,
        time=med.time,
        icon=med.icon,
        stock=med.stock,
        total_stock=med.total_stock
    )
    db.add(new_med)
    db.commit()
    db.refresh(new_med)
    return new_med

@app.patch("/medications/{med_id}/take")
async def take_medication(med_id: int, slot: str = "General", username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    med = db.query(DBMedication).filter(DBMedication.id == med_id, DBMedication.user_id == user.id).first()
    
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    now = datetime.now()
    today = now.date()
    
    # Verify the user hasn't already taken this slot today
    for intake in med.intakes:
        intake_date = intake.taken_at.date() if hasattr(intake.taken_at, 'date') else None
        if not intake_date and isinstance(intake.taken_at, str):
            try:
                intake_date = datetime.fromisoformat(intake.taken_at.replace('Z', '+00:00')).date()
            except:
                pass
        
        if intake.slot == slot and intake_date == today:
            return {"message": f"Dose for {slot} already recorded today", "stock": med.stock, "last_taken": med.last_taken}
             
    med.last_taken = now
    
    # Add intake record
    new_intake = DBIntake(medication_id=med.id, slot=slot, taken_at=now)
    db.add(new_intake)
    
    if med.stock > 0:
        med.stock -= 1
        
    db.commit()
    db.refresh(med)
    return {"message": f"Dose for {slot} recorded", "stock": med.stock, "last_taken": med.last_taken}

@app.get("/medications/{med_id}/history", response_model=List[IntakeRecord])
async def get_medication_history(med_id: int, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    med = db.query(DBMedication).filter(DBMedication.id == med_id, DBMedication.user_id == user.id).first()
    
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return sorted(med.intakes, key=lambda x: x.taken_at, reverse=True)

@app.delete("/medications/{med_id}")
async def delete_medication(med_id: int, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    med = db.query(DBMedication).filter(DBMedication.id == med_id, DBMedication.user_id == user.id).first()
    
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
        
    db.delete(med)
    db.commit()
    return {"message": "Medication deleted"}

# ─── User Event / Planner Endpoints ──────────────────────────────────────────

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    appointment_date: datetime
    type: Optional[str] = "Appointment"

@app.get("/events")
async def get_events(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user: raise HTTPException(status_code=404)
    return user.appointments

@app.post("/events")
async def create_event(event: EventCreate, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user: raise HTTPException(status_code=404)
    
    new_event = DBAppointment(
        user_id=user.id,
        title=event.title,
        description=event.description,
        location=event.location,
        appointment_date=event.appointment_date,
        type=event.type
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

@app.put("/events/{event_id}")
async def update_event(event_id: int, event: EventCreate, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    db_event = db.query(DBAppointment).filter(DBAppointment.id == event_id, DBAppointment.user_id == user.id).first()
    if not db_event: raise HTTPException(status_code=404)
    
    db_event.title = event.title
    db_event.description = event.description
    db_event.location = event.location
    db_event.appointment_date = event.appointment_date
    db_event.type = event.type
    
    db.commit()
    db_event = db.query(DBAppointment).filter(DBAppointment.id == event_id).first() # Ensure fresh data
    return db_event

@app.delete("/events/{event_id}")
async def delete_event(event_id: int, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    event = db.query(DBAppointment).filter(DBAppointment.id == event_id, DBAppointment.user_id == user.id).first()
    if not event: raise HTTPException(status_code=404)
    db.delete(event)
    db.commit()
    return {"status": "deleted"}

# ─── Intelligence Manager Endpoints (Admin Only) ──────────────────────────────

ADMIN_EMAIL = "princefredkent@gmail.com"

def verify_admin(user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.username == user).first()
    if not db_user or db_user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    return db_user

@app.get("/intelligence/conditions")
async def get_conditions(db: Session = Depends(get_db)):
    return db.query(HealthCondition).all()

@app.post("/intelligence/conditions")
async def create_condition(data: dict, admin: DBUser = Depends(verify_admin), db: Session = Depends(get_db)):
    new_cond = HealthCondition(
        name=data["name"],
        symptoms=json.dumps(data["symptoms"]),
        explanation=data["explanation"],
        action_steps=json.dumps(data["action_steps"]),
        is_emergency=data.get("is_emergency", False),
        female_only=data.get("female_only", False),
        required_any=json.dumps(data.get("required_any", [])),
        icon=data.get("icon", "medical_services"),
        tags=data.get("tags", "")
    )
    db.add(new_cond)
    db.commit()
    db.refresh(new_cond)
    return new_cond

@app.put("/intelligence/conditions/{cond_id}")
async def update_condition(cond_id: int, data: dict, admin: DBUser = Depends(verify_admin), db: Session = Depends(get_db)):
    cond = db.query(HealthCondition).filter(HealthCondition.id == cond_id).first()
    if not cond: raise HTTPException(status_code=404)
    
    cond.name = data["name"]
    cond.symptoms = json.dumps(data["symptoms"])
    cond.explanation = data["explanation"]
    cond.action_steps = json.dumps(data["action_steps"])
    cond.is_emergency = data.get("is_emergency", False)
    cond.female_only = data.get("female_only", False)
    cond.required_any = json.dumps(data.get("required_any", []))
    cond.icon = data.get("icon", "medical_services")
    cond.tags = data.get("tags", "")
    
    db.commit()
    return cond

@app.delete("/intelligence/conditions/{cond_id}")
async def delete_condition(cond_id: int, admin: DBUser = Depends(verify_admin), db: Session = Depends(get_db)):
    cond = db.query(HealthCondition).filter(HealthCondition.id == cond_id).first()
    if not cond: raise HTTPException(status_code=404)
    db.delete(cond)
    db.commit()
    return {"status": "deleted"}

@app.get("/intelligence/insights")
async def get_insights(db: Session = Depends(get_db)):
    return db.query(HealthInsight).all()

@app.post("/intelligence/insights")
async def create_insight(data: dict, admin: DBUser = Depends(verify_admin), db: Session = Depends(get_db)):
    new_insight = HealthInsight(
        title=data["title"],
        content=data["content"],
        category=data.get("category", "Insight"),
        icon=data.get("icon", "lightbulb"),
        tags=data.get("tags", "")
    )
    db.add(new_insight)
    db.commit()
    db.refresh(new_insight)
    return new_insight

@app.put("/intelligence/insights/{insight_id}")
async def update_insight(insight_id: int, data: dict, admin: DBUser = Depends(verify_admin), db: Session = Depends(get_db)):
    insight = db.query(HealthInsight).filter(HealthInsight.id == insight_id).first()
    if not insight: raise HTTPException(status_code=404)
    
    insight.title = data["title"]
    insight.content = data["content"]
    insight.category = data.get("category", "Insight")
    insight.icon = data.get("icon", "lightbulb")
    insight.tags = data.get("tags", "")
    
    db.commit()
    return insight

@app.delete("/intelligence/insights/{insight_id}")
async def delete_insight(insight_id: int, admin: DBUser = Depends(verify_admin), db: Session = Depends(get_db)):
    insight = db.query(HealthInsight).filter(HealthInsight.id == insight_id).first()
    if not insight: raise HTTPException(status_code=404)
    db.delete(insight)
    db.commit()
    return {"status": "deleted"}

# --- Frontend Serving & Catch-All Route ---

if os.path.exists(FRONTEND_DIR) and os.path.isdir(FRONTEND_DIR):
    log.info(f"Serving frontend from: {FRONTEND_DIR}")
    
    # Mount assets folder for standard static serving
    assets_dir = os.path.join(FRONTEND_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        log.info("Mounted /assets directory")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # 1. Handle root or empty path
        if not full_path or full_path == "/":
            return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
            
        # 2. Check if the file exists in the frontend dist directory
        # (Remove leading slash if present for os.path.join)
        clean_path = full_path.lstrip("/")
        file_path = os.path.join(FRONTEND_DIR, clean_path)
        
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # 3. SPA Routing: fallback to index.html for unknown paths
        # This allows React Router to handle the URL
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
            
        return {"error": "Frontend not found"}
else:
    log.warning(f"Frontend directory NOT found at: {FRONTEND_DIR}")
    @app.get("/")
    def read_root():
        return {"message": "Welcome to the AI Health Assistant API (Frontend not built)"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Render injects $PORT
    uvicorn.run(app, host="0.0.0.0", port=port)

