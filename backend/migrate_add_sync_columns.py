"""
migrate_add_sync_columns.py
───────────────────────────
One-time migration script.
Run ONCE against your existing Supabase database to add the
sync tracking columns needed by the new local-first architecture.

Usage (from the backend directory):
    python migrate_add_sync_columns.py
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: No DATABASE_URL found in .env. Aborting.")
    exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Use Session Pooler (port 6543) for DDL operations to prevent hanging on Transaction Pooler
if ":5432/" in DATABASE_URL and "pooler.supabase.com" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace(":5432/", ":6543/")

engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 15})

MIGRATIONS = [
    # ── users ──
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP;",
    "CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);",

    # ── medications ──
    "ALTER TABLE medications ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE medications ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",

    # ── cycle_logs ──
    "ALTER TABLE cycle_logs ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE cycle_logs ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",

    # ── appointments ──
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",

    # ── symptom_logs ──
    "ALTER TABLE symptom_logs ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE symptom_logs ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",

    # ── sync_meta (new table for tracking per-user sync state) ──
    """
    CREATE TABLE IF NOT EXISTS sync_meta (
        id SERIAL PRIMARY KEY,
        username VARCHAR UNIQUE NOT NULL,
        last_push_at TIMESTAMP,
        last_pull_at TIMESTAMP,
        initial_pull_done BOOLEAN DEFAULT FALSE,
        initial_pull_progress INTEGER,
        initial_pull_status_msg VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_sync_meta_username ON sync_meta(username);",

    # ── medication_intakes (add synced_at for push tracking) ──
    "ALTER TABLE medication_intakes ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",
]

def run():
    print(f"\nConnecting to Supabase...")
    try:
        with engine.connect() as conn:
            with conn.begin():
                for i, sql in enumerate(MIGRATIONS, 1):
                    stmt = sql.strip()
                    preview = stmt.split("\n")[0][:70]
                    try:
                        conn.execute(text(stmt))
                        print(f"  [{i}/{len(MIGRATIONS)}] OK  {preview}")
                    except Exception as e:
                        print(f"  [{i}/{len(MIGRATIONS)}] SKIP  {preview}")
                        print(f"         Reason: {e}")
        print("\n✓ Migration complete. Your Supabase database is ready for sync.\n")
    except Exception as e:
        print(f"\n✗ Connection failed: {e}\n")

if __name__ == "__main__":
    run()
