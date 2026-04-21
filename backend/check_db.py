import sqlite3
import sys

def check_db(db_path):
    print(f"Checking database: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Integrity check
        cursor.execute("PRAGMA integrity_check;")
        integrity_result = cursor.fetchall()
        print(f"Integrity Check:")
        for row in integrity_result:
            print(f"  {row[0]}")
            
        # Foreign key check
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("PRAGMA foreign_key_check;")
        fk_result = cursor.fetchall()
        print(f"\nForeign Key Check:")
        if not fk_result:
            print("  No foreign key violations found.")
        else:
            for row in fk_result:
                print(f"  Violation: {row}")
                
        # List tables and row counts
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall() if not row[0].startswith('sqlite_')]
        print(f"\nTables and Row Counts:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} rows")
            
        conn.close()
    except Exception as e:
        print(f"Error checking database: {e}")

if __name__ == '__main__':
    check_db('health.db')
