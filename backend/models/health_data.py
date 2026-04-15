from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True

class PatientInfo(BaseModel):
    full_name: str
    age: int
    gender: str
    blood_type: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []
    emergency_contact: Optional[str] = None

class VitalLog(BaseModel):
    timestamp: datetime = datetime.now()
    heart_rate: Optional[int] = None
    blood_pressure_sys: Optional[int] = None
    blood_pressure_dia: Optional[int] = None
    oxygen_level: Optional[int] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None

class HealthAssistantStore(BaseModel):
    """Aggregate model for local storage state"""
    patient: Optional[PatientInfo] = None
    vitals: List[VitalLog] = []
    medications: List[Medication] = []
