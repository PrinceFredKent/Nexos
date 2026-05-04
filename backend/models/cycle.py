from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class CycleLog(Base):
    __tablename__ = "cycle_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=True)
    cycle_length = Column(Integer, default=28, nullable=True)
    notes = Column(Text, nullable=True)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    synced_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="cycle_logs")
