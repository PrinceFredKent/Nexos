from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class SymptomLog(Base):
    __tablename__ = "symptom_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symptoms = Column(Text)  # JSON-stringified list
    top_condition = Column(String)
    risk_level = Column(String)
    explanation = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    synced_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="symptom_logs")
