from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import json

from database import get_db
from models.user import User as DBUser
from models.health_knowledge import HealthCondition, HealthInsight
from auth_service import get_current_user

router = APIRouter(tags=["Admin Intelligence curation"])

ADMIN_EMAIL = "princefredkent@gmail.com"

def verify_admin(user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.username == user).first()
    if not db_user or db_user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    return db_user

@router.get("/intelligence/conditions")
async def get_conditions(db: Session = Depends(get_db)):
    return db.query(HealthCondition).all()

@router.post("/intelligence/conditions")
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

@router.put("/intelligence/conditions/{cond_id}")
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

@router.delete("/intelligence/conditions/{cond_id}")
async def delete_condition(cond_id: int, admin: DBUser = Depends(verify_admin), db: Session = Depends(get_db)):
    cond = db.query(HealthCondition).filter(HealthCondition.id == cond_id).first()
    if not cond: raise HTTPException(status_code=404)
    db.delete(cond)
    db.commit()
    return {"status": "deleted"}

@router.get("/intelligence/insights")
async def get_insights(db: Session = Depends(get_db)):
    return db.query(HealthInsight).all()

@router.post("/intelligence/insights")
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

@router.put("/intelligence/insights/{insight_id}")
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

@router.delete("/intelligence/insights/{insight_id}")
async def delete_insight(insight_id: int, admin: DBUser = Depends(verify_admin), db: Session = Depends(get_db)):
    insight = db.query(HealthInsight).filter(HealthInsight.id == insight_id).first()
    if not insight: raise HTTPException(status_code=404)
    db.delete(insight)
    db.commit()
    return {"status": "deleted"}
