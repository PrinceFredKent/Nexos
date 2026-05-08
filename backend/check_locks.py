import os
import psycopg2
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL").replace("postgres://", "postgresql://", 1)
parsed = urlparse(DATABASE_URL)

try:
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port,
        user=unquote(parsed.username),
        password=unquote(parsed.password),
        dbname=parsed.path.lstrip('/'),
        sslmode='require',
        connect_timeout=10
    )
    cur = conn.cursor()
    cur.execute("""
    SELECT pid, usename, state, query, wait_event_type, wait_event 
    FROM pg_stat_activity 
    WHERE state != 'idle' OR wait_event IS NOT NULL;
    """)
    rows = cur.fetchall()
    for r in rows:
        print(r)
    
    # Also cancel queries that might be stuck
    cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND pid <> pg_backend_pid();")
    print("Terminated idle in transaction backends")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
