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

# If a cloud database is configured and explicitly enabled, use it as the
# primary datastore for API endpoints. Otherwise keep local SQLite as the
# default local-only database engine.
USE_CLOUD_DB = os.environ.get("USE_CLOUD_DB", "false").lower() in ("1", "true", "yes")
primary_engine = cloud_engine if cloud_engine and USE_CLOUD_DB else local_engine

if cloud_engine and USE_CLOUD_DB:
    print("INFO: Using cloud database as primary datastore for API endpoints.")
elif cloud_engine:
    print("INFO: Cloud database available for sync only. API endpoints continue using local SQLite.")

# LocalSession — used by every API endpoint via get_db()
LocalSession = sessionmaker(autocommit=False, autoflush=False, bind=primary_engine)

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


def get_cloud_db():
    """Yields a cloud (Supabase) session. Only for use in SyncService."""
    if not CloudSession:
        return None
    db = CloudSession()
    try:
        yield db
    finally:
        db.close()


# Keep a backwards-compatible alias so existing imports still work
engine = local_engine
