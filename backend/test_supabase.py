"""
Diagnostic script: test Supabase connection and inspect users table.
Run with: python test_supabase.py
"""
import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
print("DATABASE_URL set:", bool(DATABASE_URL))
if DATABASE_URL:
    print("URL preview:", DATABASE_URL[:70])
else:
    print("CRITICAL: DATABASE_URL is MISSING from environment!")
    sys.exit(1)

try:
    from sqlalchemy import create_engine, text
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    engine = create_engine(
        DATABASE_URL,
        connect_args={"connect_timeout": 10},
        pool_pre_ping=True,
    )
    with engine.connect() as conn:
        # 1. Count users
        count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        print(f"\nSUCCESS: Connected to Supabase. users table has {count} rows.")

        # 2. Show columns
        cols = conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position"
        )).fetchall()
        print("\nSupabase users columns:")
        for col in cols:
            print(f"  {col[0]:35s} {col[1]}")

        # 3. Show last 5 users
        rows = conn.execute(text(
            "SELECT id, username, email, synced_at, last_modified FROM users ORDER BY id DESC LIMIT 5"
        )).fetchall()
        print(f"\nLast {len(rows)} users in Supabase:")
        for r in rows:
            print(f"  id={r[0]}  username={r[1]}  email={r[2]}  synced_at={r[3]}  last_modified={r[4]}")

        # 4. Check local SQLite users
        from sqlalchemy import create_engine as ce2
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "health.db")
        local_engine = ce2(f"sqlite:///{db_path}")
        with local_engine.connect() as lconn:
            local_users = lconn.execute(text(
                "SELECT id, username, email, synced_at, last_modified FROM users ORDER BY id DESC LIMIT 10"
            )).fetchall()
            print(f"\nLocal SQLite users ({len(local_users)} shown):")
            for r in local_users:
                print(f"  id={r[0]}  username={r[1]}  email={r[2]}  synced_at={r[3]}  last_modified={r[4]}")

        # 5. Check outbox
        with local_engine.connect() as lconn:
            outbox = lconn.execute(text(
                "SELECT id, table_name, row_id, action, timestamp FROM local_changes_outbox ORDER BY id DESC LIMIT 20"
            )).fetchall()
            print(f"\nLocal outbox ({len(outbox)} pending entries):")
            for o in outbox:
                print(f"  outbox_id={o[0]}  table={o[1]}  row_id={o[2]}  action={o[3]}  ts={o[4]}")

except Exception as e:
    import traceback
    print(f"\nERROR: {e}")
    traceback.print_exc()
