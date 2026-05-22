from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional
from datetime import datetime, date
import re

class UserSignup(BaseModel):
    username: str = Field(..., min_length=3)
    email: str
    phone: str
    password: str = Field(..., min_length=8)
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

    @validator('email')
    def validate_email(cls, v):
        if not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError('Invalid email format')
        return v

    @validator('phone')
    def validate_phone(cls, v):
        if not re.match(r"^\+?1?\d{9,15}$", v):
            raise ValueError('Invalid phone number format')
        return v

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

class PasswordVerifyRequest(BaseModel):
    password: str

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

class RecommendationRequest(BaseModel):
    name: str
    age: int
    weight: Optional[str] = None

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    appointment_date: datetime
    type: Optional[str] = "Appointment"
