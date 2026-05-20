import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "health.db")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create outbox table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS local_changes_outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name VARCHAR NOT NULL,
            row_id INTEGER NOT NULL,
            action VARCHAR NOT NULL,
            modified_fields VARCHAR,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_outbox_table ON local_changes_outbox(table_name)")

    # Create conflicts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_conflicts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name VARCHAR NOT NULL,
            row_id INTEGER NOT NULL,
            local_data VARCHAR NOT NULL,
            cloud_data VARCHAR NOT NULL,
            status VARCHAR DEFAULT 'PENDING',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("Migration complete: added outbox and conflicts tables.")

if __name__ == "__main__":
    migrate()
