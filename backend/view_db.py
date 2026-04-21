import sqlite3

def view_data(db_path):
    print(f"Viewing data for: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        tables = ['users', 'cycle_logs', 'appointments']
        for table in tables:
            print(f"\n--- Table: {table} ---")
            cursor.execute(f"PRAGMA table_info({table});")
            columns = [col[1] for col in cursor.fetchall()]
            print(" | ".join(columns))
            
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            for row in rows:
                print(" | ".join(map(str, row)))
        conn.close()
    except Exception as e:
        print(f"Error checking database: {e}")

if __name__ == '__main__':
    view_data('health.db')
