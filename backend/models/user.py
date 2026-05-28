from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)  # index ensures fast login lookups
    hashed_password = Column(String)
    phone = Column(String)
    birth_date = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    is_pregnant = Column(Boolean, default=False, nullable=False)
    pregnancy_conception_date = Column(Date, nullable=True)
    pregnancy_due_date = Column(Date, nullable=True)
    blood_type = Column(String, nullable=True)
    weight = Column(String, nullable=True)
    height = Column(String, nullable=True)
    allergies = Column(Text, nullable=True)
    chronic_conditions = Column(Text, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    profile_picture = Column(Text, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    is_verified = Column(Integer, default=0) # 0 = False, 1 = True (SQLite/Postgres compatibility)
    otp_code = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    synced_at = Column(DateTime, nullable=True)

    medications = relationship("Medication", back_populates="user", cascade="all, delete-orphan")
    cycle_logs = relationship("CycleLog", back_populates="user", cascade="all, delete-orphan", order_by="CycleLog.period_start")
