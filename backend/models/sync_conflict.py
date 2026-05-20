from sqlalchemy import Column, Integer, String, DateTime
from database import Base
from datetime import datetime

class SyncConflict(Base):
    __tablename__ = "sync_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String, nullable=False)
    row_id = Column(Integer, nullable=False)
    local_data = Column(String, nullable=False) # JSON
    cloud_data = Column(String, nullable=False) # JSON
    status = Column(String, default="PENDING") # PENDING, RESOLVED
    created_at = Column(DateTime, default=datetime.utcnow)
