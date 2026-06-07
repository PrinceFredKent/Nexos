import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

# 1. Check SQLite
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "health.db")
local_engine = create_engine(f"sqlite:///{db_path}")

print("=== CHECKING LOCAL SQLITE ===")
try:
    with local_engine.connect() as conn:
        res = conn.execute(text("SELECT id, username, email, synced_at, last_modified FROM users WHERE email = :e"), {"e": "princefattahkent@gmail.com"}).fetchall()
        if res:
            print("Found in local SQLite:")
            for r in res:
                print(f"  id={r[0]} username={r[1]} email={r[2]} synced_at={r[3]} last_modified={r[4]}")
        else:
            print("Not found in local SQLite.")
            
        # Let's also print last 3 users created locally
        print("\nLast 3 users created locally:")
        res_last = conn.execute(text("SELECT id, username, email, synced_at, last_modified FROM users ORDER BY id DESC LIMIT 3")).fetchall()
        for r in res_last:
             print(f"  id={r[0]} username={r[1]} email={r[2]} synced_at={r[3]} last_modified={r[4]}")
except Exception as e:
    print(f"Error checking SQLite: {e}")

# 2. Check Supabase
print("\n=== CHECKING SUPABASE ===")
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL set in env.")
else:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            res = conn.execute(text("SELECT id, username, email, synced_at, last_modified FROM users WHERE email = :e"), {"e": "princefattahkent@gmail.com"}).fetchall()
            if res:
                print("Found in Supabase:")
                for r in res:
                    print(f"  id={r[0]} username={r[1]} email={r[2]} synced_at={r[3]} last_modified={r[4]}")
            else:
                print("Not found in Supabase.")
    except Exception as e:
         print(f"Error checking Supabase: {e}")
