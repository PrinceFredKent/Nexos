import sqlite3
import os

db_path = 'backend/health.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    print("Tables:", tables)
    for table in tables:
        table_name = table[0]
        cur.execute(f"SELECT * FROM {table_name} LIMIT 1;")
        print(f"Data from {table_name}:", cur.fetchone())
    
    if ('users',) in tables:
        cur.execute("SELECT email, hashed_password FROM users;")
        print("Users:", cur.fetchall())
    else:
        print("Users table NOT FOUND in tables list.")
    conn.close()
