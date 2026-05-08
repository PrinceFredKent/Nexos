import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

from urllib.parse import urlparse, unquote

parsed = urlparse(DATABASE_URL)
user = unquote(parsed.username)
password = unquote(parsed.password)
host = parsed.hostname
port = parsed.port
dbname = parsed.path.lstrip('/')

MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP;",
    "CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);",
    "ALTER TABLE medications ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE medications ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",
    "ALTER TABLE cycle_logs ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE cycle_logs ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",
    "ALTER TABLE symptom_logs ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();",
    "ALTER TABLE symptom_logs ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;",
    "CREATE TABLE IF NOT EXISTS sync_meta (id SERIAL PRIMARY KEY, username VARCHAR UNIQUE NOT NULL, last_push_at TIMESTAMP, last_pull_at TIMESTAMP, initial_pull_done BOOLEAN DEFAULT FALSE, initial_pull_progress INTEGER, initial_pull_status_msg VARCHAR, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());",
    "CREATE INDEX IF NOT EXISTS ix_sync_meta_username ON sync_meta(username);",
    "ALTER TABLE medication_intakes ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;"
]

print(f"Connecting to {host}:{port} as {user}...")
try:
    conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname=dbname,
        sslmode='require',
        connect_timeout=10
    )
    conn.autocommit = True
    cur = conn.cursor()
    for i, sql in enumerate(MIGRATIONS, 1):
        print(f"Executing: {sql[:70]}...")
        cur.execute(sql)
        print("OK")
    cur.close()
    conn.close()
    print("All done.")
except Exception as e:
    print(f"Error: {e}")
