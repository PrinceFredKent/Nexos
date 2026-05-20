from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, date
from typing import List

from database import get_db
from models.user import User as DBUser
from models.medication import Medication as DBMedication, MedicationIntake as DBIntake
from schemas import (
    MedicationCreate, MedicationResponse, IntakeRecord, RecommendationRequest
)
from auth_service import get_current_user
from services.med_service import get_medication_recommendation

router = APIRouter(tags=["Medications"])

@router.get("/medications")
async def get_medications(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = date.today()

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

@router.post("/medications", response_model=MedicationResponse)
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

@router.patch("/medications/{med_id}/take")
async def take_medication(med_id: int, slot: str = "General", username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    med = db.query(DBMedication).filter(DBMedication.id == med_id, DBMedication.user_id == user.id).first()
    
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    now = datetime.now()
    today = now.date()
    
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
    
    new_intake = DBIntake(medication_id=med.id, slot=slot, taken_at=now)
    db.add(new_intake)
    
    if med.stock > 0:
        med.stock -= 1
        
    db.commit()
    db.refresh(med)
    return {"message": f"Dose for {slot} recorded", "stock": med.stock, "last_taken": med.last_taken}

@router.get("/medications/{med_id}/history", response_model=List[IntakeRecord])
async def get_medication_history(med_id: int, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    med = db.query(DBMedication).filter(DBMedication.id == med_id, DBMedication.user_id == user.id).first()
    
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return sorted(med.intakes, key=lambda x: x.taken_at, reverse=True)

@router.delete("/medications/{med_id}")
async def delete_medication(med_id: int, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    med = db.query(DBMedication).filter(DBMedication.id == med_id, DBMedication.user_id == user.id).first()
    
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
        
    db.delete(med)
    db.commit()
    return {"message": "Medication deleted"}

@router.post("/recommend-medication")
async def recommend_medication(req: RecommendationRequest):
    return await get_medication_recommendation(req.name, req.age, req.weight)
