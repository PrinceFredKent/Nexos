from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json
import sys
import os
import webbrowser
import threading
import logging
from sqlalchemy.orm import Session, joinedload
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from auth_service import get_password_hash, verify_password, create_access_token, get_current_user
from database import engine, get_db, Base, cloud_engine
from models.user import User as DBUser
from models.medication import Medication as DBMedication, MedicationIntake as DBIntake
from models.cycle import CycleLog as DBCycleLog
from models.symptom_log import SymptomLog as DBSymptomLog
from models.appointment import Appointment as DBAppointment
from models.sync_meta import SyncMeta  # noqa: F401 — registers table with Base
from sync_service import (
    get_sync_status, estimate_pending_push,
    initial_pull_credentials, initial_pull_all, run_sync
)
from datetime import datetime, date

log = logging.getLogger("nexos")

# Create all local SQLite tables (instant — no network)
Base.metadata.create_all(bind=engine)

# Background sync scheduler
_scheduler = AsyncIOScheduler()

app = FastAPI(title="AI Health Assistant API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Start periodic cloud sync on app launch."""
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
    email: Optional[str] = None
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

class UserLogin(BaseModel):
    email: str
    password: str

class PasswordChange(BaseModel):
    current_password: str
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
def get_status():
    return {"status": "online", "mode": "patient-assistant"}


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
async def signup(user: UserSignup, db: Session = Depends(get_db)):
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
        hashed_password=hashed_password,
        phone=user.phone,
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
        birth_date=user.birth_date
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token for immediate login
    access_token = create_access_token(data={"sub": new_user.username})
    
    return {
        "message": "User created successfully", 
        "username": new_user.username,
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/login")
async def login(credentials: UserLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Step 1: Check local SQLite first — instant, no network latency
    user = db.query(DBUser).filter(DBUser.email == credentials.email).first()
    is_new_device = False

    # Step 2: Not found locally? Try pulling credentials from Supabase only
    if not user and cloud_engine:
        cloud_data = await initial_pull_credentials(credentials.email)
        if cloud_data:
            # Upsert the user row into local SQLite so future logins are instant
            valid_cols = {c.key for c in DBUser.__table__.columns}
            filtered = {k: v for k, v in cloud_data.items() if k in valid_cols}
            user = db.merge(DBUser(**filtered))
            db.commit()
            db.refresh(user)
            is_new_device = True

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user.username})

    # Step 3: New device — stream remaining data in background while user enters app
    if is_new_device:
        background_tasks.add_task(initial_pull_all, user.username)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": "patient",
        "is_new_device": is_new_device,
    }

@app.post("/analyze-symptoms")
async def analyze_symptoms(request: SymptomAnalysisRequest, username: Optional[str] = None, db: Session = Depends(get_db)):
    """Analyze symptoms with optional female cycle context and store result if user is known."""
    result = await get_symptom_analysis(request.symptoms, cycle_context=request.cycle_context)
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

@app.post("/change-password")
async def change_password(passwords: PasswordChange, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(passwords.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    user.hashed_password = get_password_hash(passwords.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.patch("/update-profile")
async def update_profile(update: UserUpdate, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update only provided fields
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    return user

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
            "taken_today": [i.slot for i in med.intakes if i.taken_at.date() == today],
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
         if intake.slot == slot and intake.taken_at.date() == today:
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

def open_browser():
    webbrowser.open_new('http://127.0.0.1:8000')

if __name__ == "__main__":
    if getattr(sys, 'frozen', False):
        # Open browser shortly after server starts when running as exe
        threading.Timer(1.5, open_browser).start()
    uvicorn.run(app, host="0.0.0.0", port=8000)
