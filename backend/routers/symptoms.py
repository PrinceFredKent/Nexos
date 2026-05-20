from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import json

from database import get_db
from models.user import User as DBUser
from models.symptom_log import SymptomLog as DBSymptomLog
from schemas import SymptomAnalysisRequest
from auth_service import get_current_user
from services.ai_service import get_symptom_analysis, get_suggested_symptoms

router = APIRouter(tags=["AI Symptom Analysis"])

@router.post("/analyze-symptoms")
async def analyze_symptoms(request: SymptomAnalysisRequest, db: Session = Depends(get_db)):
    """Analyze symptoms with optional female cycle context and store result if user is known."""
    result = await get_symptom_analysis(request.symptoms, cycle_context=request.cycle_context, db=db)
    if result["status"] == "Error":
        raise HTTPException(status_code=500, detail=result.get("analysis", "Unknown error"))
    return result

@router.post("/save-analysis")
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

@router.get("/analysis-history")
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

@router.post("/suggest-symptoms")
async def suggest_symptoms(symptoms: List[str]):
    """Suggest related symptoms based on user selection."""
    return await get_suggested_symptoms(symptoms)
