from sqlalchemy import Column, Integer, String, DateTime
from database import Base
from datetime import datetime

class LocalChangeOutbox(Base):
    __tablename__ = "local_changes_outbox"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String, index=True, nullable=False)
    row_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False) # INSERT, UPDATE, DELETE
    modified_fields = Column(String, nullable=True) # JSON string of changed columns
    timestamp = Column(DateTime, default=datetime.utcnow)
