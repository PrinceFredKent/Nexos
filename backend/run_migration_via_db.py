import os
from sqlalchemy import text
from database import cloud_engine
from migrate_add_sync_columns import MIGRATIONS

def run():
    print("Using cloud_engine from database.py...")
    try:
        with cloud_engine.connect() as conn:
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
        print("\n✓ Migration complete.\n")
    except Exception as e:
        print(f"\n✗ Error: {e}\n")

if __name__ == "__main__":
    run()
