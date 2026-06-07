from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

# ─── Local SQLite Engine (Primary — used by all API endpoints) ───────────────
# All reads and writes go here. Sub-millisecond. No network latency.

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "health.db")
SQLITE_URL = f"sqlite:///{db_path}"

local_engine = create_engine(
    SQLITE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,          # Wait up to 30s for a write lock (prevents "database is locked")
    },
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

# Enable WAL mode on every new SQLite connection.
# WAL = Write-Ahead Log: allows concurrent reads during writes, dramatically
# faster than the default journal mode which serialises everything.
@event.listens_for(local_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")   # Safe + faster than FULL
    cursor.execute("PRAGMA cache_size=-32000;")    # 32 MB page cache
    cursor.execute("PRAGMA temp_store=MEMORY;")    # Temp tables in RAM
    cursor.close()

# ─── Supabase / PostgreSQL Engine (Cloud — used only by SyncService) ─────────
# Never on the hot path. Only the background SyncService talks to it.

DATABASE_URL = os.environ.get("DATABASE_URL")
cloud_engine = None

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    cloud_engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,          # Verify connection is alive before using
        pool_recycle=300,            # Recycle connections every 5 minutes
        pool_size=5,                 # Keep pool small — sync is low-frequency
        max_overflow=10,
        pool_timeout=20,             # Fail fast if no pool slot available
        connect_args={
            "connect_timeout": 10,   # Give up on a stale connection after 10s
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
        }
    )
    print("INFO:     Cloud (Supabase) engine configured for background sync.")
else:
    print("WARNING:  No DATABASE_URL found. Running in local-only mode (no cloud sync).")

# ─── Session Factories ────────────────────────────────────────────────────────

# Local SQLite remains the primary database for API endpoints.
# Cloud/Postgres is only used by the background SyncService.
LocalSession = sessionmaker(autocommit=False, autoflush=False, bind=local_engine)

# CloudSession — used only by sync_service.py
CloudSession = sessionmaker(autocommit=False, autoflush=False, bind=cloud_engine) if cloud_engine else None


# ─── Dependency: FastAPI get_db() ────────────────────────────────────────────

def get_db():
    """FastAPI dependency — yields a local SQLite session. Always fast."""
    db = LocalSession()
    try:
        yield db
    finally:
        db.close()


from contextlib import contextmanager

@contextmanager
def get_cloud_db():
    """Yields a cloud (Supabase) session. Returns None if cloud not configured."""
    if not CloudSession:
        yield None
        return
    db = CloudSession()
    try:
        yield db
    finally:
        db.close()


# Keep a backwards-compatible alias so existing imports still work
engine = local_engine


# ─── Outbox Pattern Hook ──────────────────────────────────────────────────────

import json
from sqlalchemy import text

TRACKED_TABLES = {"users", "medications", "cycle_logs", "appointments", "symptom_logs", "medication_intakes"}

@event.listens_for(LocalSession, "after_flush")
def receive_after_flush(session, flush_context):
    """
    Hook into local SQLite writes to automatically queue offline changes into the outbox.
    This only catches ORM modifications (API endpoints), not raw SQL executes (sync service).
    """
    outbox_entries = []
    
    for obj in session.new:
        if getattr(obj, '__tablename__', '') in TRACKED_TABLES:
            try:
                row_id = getattr(obj, 'id', None)
                if row_id is None:
                    continue
            except AttributeError:
                continue
            
            # Serialize fields for conflict resolution or debugging
            mod_fields = {}
            for c in obj.__table__.columns:
                val = getattr(obj, c.name)
                if isinstance(val, (str, int, float, bool, type(None))):
                    mod_fields[c.name] = val
            
            outbox_entries.append({
                "table_name": obj.__tablename__,
                "row_id": row_id,
                "action": "INSERT",
                "modified_fields": json.dumps(mod_fields)
            })
            
    for obj in session.dirty:
        if getattr(obj, '__tablename__', '') in TRACKED_TABLES and session.is_modified(obj):
            try:
                row_id = getattr(obj, 'id', None)
                if row_id is None:
                    continue
            except AttributeError:
                continue
            
            outbox_entries.append({
                "table_name": obj.__tablename__,
                "row_id": row_id,
                "action": "UPDATE",
                "modified_fields": None
            })
            
    for obj in session.deleted:
        if getattr(obj, '__tablename__', '') in TRACKED_TABLES:
            try:
                row_id = getattr(obj, 'id', None)
                if row_id is None:
                    continue
            except AttributeError:
                continue
                
            outbox_entries.append({
                "table_name": obj.__tablename__,
                "row_id": row_id,
                "action": "DELETE",
                "modified_fields": None
            })
            
    if outbox_entries:
        session.connection().execute(
            text("INSERT INTO local_changes_outbox (table_name, row_id, action, modified_fields) VALUES (:table_name, :row_id, :action, :modified_fields)"),
            outbox_entries
        )
