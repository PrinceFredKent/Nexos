from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    dosage = Column(String)
    frequency = Column(String)
    time = Column(String)  # 'Morning', 'Noon', 'Evening', 'Bedtime'
    icon = Column(String, default="pill")
    stock = Column(Integer, default=30)
    total_stock = Column(Integer, default=30)
    last_taken = Column(DateTime, nullable=True) # To track daily intake
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    synced_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="medications")
    intakes = relationship("MedicationIntake", back_populates="medication", cascade="all, delete-orphan")

class MedicationIntake(Base):
    __tablename__ = "medication_intakes"

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id"))
    slot = Column(String) # 'Morning', 'Noon', 'Evening', 'Bedtime'
    taken_at = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    synced_at = Column(DateTime, nullable=True)

    medication = relationship("Medication", back_populates="intakes")
