from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List
import json
from jose import jwt, JWTError

from database import get_db
from models.user import User as DBUser
from models.symptom_log import SymptomLog as DBSymptomLog
from schemas import SymptomAnalysisRequest
from auth_service import SECRET_KEY, ALGORITHM
from services.ai_service import get_symptom_analysis, get_suggested_symptoms

router = APIRouter(tags=["AI Symptom Analysis"])

@router.post("/analyze-symptoms")
async def analyze_symptoms(request: SymptomAnalysisRequest, req: Request, db: Session = Depends(get_db)):
    """Analyze symptoms with optional female cycle context and store result if user is known."""
    user = None
    auth_header = req.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                user = db.query(DBUser).filter(DBUser.username == username).first()
        except JWTError:
            pass

    # Extract user profile context: request body values take precedence if provided, fallback to DB
    gender = request.gender or (user.gender if user else None)
    age = request.age or (user.age if user else None)
    allergies = request.allergies or (user.allergies if user else None)
    chronic_conditions = request.chronic_conditions or (user.chronic_conditions if user else None)
    
    is_pregnant_val = request.is_pregnant
    if is_pregnant_val is None:
        is_pregnant_val = user.is_pregnant if user else False

    user_id = user.id if user else None

    result = await get_symptom_analysis(
        request.symptoms,
        cycle_context=request.cycle_context,
        is_pregnant=is_pregnant_val,
        gender=gender,
        age=age,
        allergies=allergies,
        chronic_conditions=chronic_conditions,
        user_id=user_id,
        db=db
    )
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
