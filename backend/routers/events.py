from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User as DBUser
from models.appointment import Appointment as DBAppointment
from schemas import EventCreate
from auth_service import get_current_user

router = APIRouter(tags=["Appointments / Planner"])

@router.get("/events")
async def get_events(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    if not user: raise HTTPException(status_code=404)
    return user.appointments

@router.post("/events")
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

@router.put("/events/{event_id}")
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
    db_event = db.query(DBAppointment).filter(DBAppointment.id == event_id).first()
    return db_event

@router.delete("/events/{event_id}")
async def delete_event(event_id: int, username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == username).first()
    event = db.query(DBAppointment).filter(DBAppointment.id == event_id, DBAppointment.user_id == user.id).first()
    if not event: raise HTTPException(status_code=404)
    db.delete(event)
    db.commit()
    return {"status": "deleted"}
