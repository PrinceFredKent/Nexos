import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "health.db")
    print(f"Connecting to {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    migrations = [
        ("health_conditions", "tags", "TEXT"),
        ("health_insights", "tags", "TEXT")
    ]
    
    for table, column, col_type in migrations:
        try:
            print(f"Adding {column} to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            print(f"  Successfully added {column} to {table}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"  Column {column} already exists in {table}, skipping.")
            else:
                print(f"  Error adding {column} to {table}: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
