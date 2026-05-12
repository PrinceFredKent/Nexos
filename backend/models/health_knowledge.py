from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from database import Base

class HealthCondition(Base):
    __tablename__ = "health_conditions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    symptoms = Column(Text)  # JSON string of symptom names
    explanation = Column(Text)
    action_steps = Column(Text)  # JSON string of steps
    is_emergency = Column(Boolean, default=False)
    female_only = Column(Boolean, default=False)
    required_any = Column(Text, nullable=True)  # JSON string of core indicators
    icon = Column(String, default="medical_services")
    tags = Column(String, nullable=True)  # Comma-separated tags

class HealthInsight(Base):
    __tablename__ = "health_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    category = Column(String, default="Insight")  # Insight or Tip
    icon = Column(String, default="lightbulb")
    tags = Column(String, nullable=True)  # Comma-separated tags
