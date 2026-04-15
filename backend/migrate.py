import sqlite3
try:
    db = sqlite3.connect('health.db', timeout=10)
    db.execute('ALTER TABLE users ADD COLUMN profile_picture TEXT')
    db.commit()
    print("Migration successful")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column already exists")
    else:
        print(f"Error: {e}")
finally:
    db.close()
