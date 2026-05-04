import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "health.db")
    print(f"Connecting to {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Tables and columns to add
    migrations = [
        # users
        ("users", "last_modified", "DATETIME"),
        ("users", "synced_at", "DATETIME"),
        
        # medications
        ("medications", "last_modified", "DATETIME"),
        ("medications", "synced_at", "DATETIME"),
        
        # cycle_logs
        ("cycle_logs", "last_modified", "DATETIME"),
        ("cycle_logs", "synced_at", "DATETIME"),
        
        # appointments
        ("appointments", "last_modified", "DATETIME"),
        ("appointments", "synced_at", "DATETIME"),
        
        # symptom_logs
        ("symptom_logs", "last_modified", "DATETIME"),
        ("symptom_logs", "synced_at", "DATETIME"),
        
        # medication_intakes
        ("medication_intakes", "synced_at", "DATETIME"),
    ]
    
    for table, column, col_type in migrations:
        try:
            print(f"Adding {column} to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            print(f"  Successfully added {column} to {table}")
            
            # If we added last_modified, populate it
            if column == "last_modified":
                cursor.execute(f"UPDATE {table} SET last_modified = CURRENT_TIMESTAMP WHERE last_modified IS NULL")
                print(f"  Populated last_modified for {table}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"  Column {column} already exists in {table}, skipping.")
                if column == "last_modified":
                    cursor.execute(f"UPDATE {table} SET last_modified = CURRENT_TIMESTAMP WHERE last_modified IS NULL")
            else:
                print(f"  Error adding {column} to {table}: {e}")
                
    # Create sync_meta table if it doesn't exist
    print("Checking sync_meta table...")
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_meta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                last_push_at DATETIME,
                last_pull_at DATETIME,
                initial_pull_done BOOLEAN DEFAULT 0,
                initial_pull_progress INTEGER,
                initial_pull_status_msg TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  sync_meta table ready.")
    except Exception as e:
        print(f"  Error creating sync_meta table: {e}")

    conn.commit()
    conn.close()
    print("Local migration complete.")

if __name__ == "__main__":
    migrate()
