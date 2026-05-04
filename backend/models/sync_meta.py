from sqlalchemy import Column, Integer, String, DateTime, Boolean
from database import Base
from datetime import datetime


class SyncMeta(Base):
    """Tracks sync state for each user — when they last pushed and pulled from Supabase."""
    __tablename__ = "sync_meta"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)

    # Last time local → cloud push completed successfully
    last_push_at = Column(DateTime, nullable=True)

    # Last time cloud → local pull completed successfully
    last_pull_at = Column(DateTime, nullable=True)

    # Whether this device has ever completed an initial pull from cloud
    initial_pull_done = Column(Boolean, default=False)

    # Running progress (0–100) for the frontend toast on first launch
    # Reset to None when not syncing, set to 0–100 during initial pull
    initial_pull_progress = Column(Integer, nullable=True)

    # Human-readable status message for the toast ("Syncing medications...")
    initial_pull_status_msg = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
