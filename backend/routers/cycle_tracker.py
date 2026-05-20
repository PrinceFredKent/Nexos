from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User as DBUser
from models.cycle import CycleLog as DBCycleLog
from schemas import CycleLogCreate, CycleLogUpdate, CycleLogResponse
from auth_service import get_current_user

router = APIRouter(tags=["Menstrual Cycle Tracker"])

@router.get("/cycle-logs", response_model=List[CycleLogResponse])
async def get_cycle_logs(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all cycle logs for the authenticated female user."""
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.cycle_logs

@router.post("/cycle-logs", response_model=CycleLogResponse)
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

@router.patch("/cycle-logs/{log_id}", response_model=CycleLogResponse)
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

@router.delete("/cycle-logs/{log_id}")
async def delete_cycle_log(log_id: int, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a cycle log entry."""
    user = db.query(DBUser).filter(DBUser.username == username).first()
    log = db.query(DBCycleLog).filter(DBCycleLog.id == log_id, DBCycleLog.user_id == user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Cycle log not found")
    db.delete(log)
    db.commit()
    return {"message": "Cycle log deleted"}
