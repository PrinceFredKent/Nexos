from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from sqlalchemy.orm import Session

from auth_service import get_password_hash, verify_password, create_access_token, get_current_user
from database import engine, get_db, Base
from models.user import User as DBUser
from models.medication import Medication as DBMedication, MedicationIntake as DBIntake
from models.cycle import CycleLog as DBCycleLog
from models.symptom_log import SymptomLog as DBSymptomLog
from models.appointment import Appointment as DBAppointment
from datetime import datetime, date

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Health Assistant API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; refine for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Health Assistant API"}


@app.get("/status")
def get_status():
    return {"status": "online", "mode": "patient-assistant"}

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
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(DBUser).filter(DBUser.email == credentials.email).first()
            
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": "patient"
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
    meds_with_intakes = []
    
    for med in user.medications:
        taken_today = []
        for i in med.intakes:
            if i.taken_at.date() == today:
                 taken_today.append(i.slot)
        
        # Create a dictionary compatible with MedicationResponse
        med_dict = {
            "id": med.id,
            "name": med.name,
            "dosage": med.dosage,
            "frequency": med.frequency,
            "time": med.time,
            "icon": med.icon,
            "stock": med.stock,
            "total_stock": med.total_stock,
            "last_taken": med.last_taken,
            "taken_today": taken_today
        }
        meds_with_intakes.append(med_dict)
        
    return meds_with_intakes

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
