from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Read the database connection string from environment variables
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # SQLAlchemy 1.4+ requires 'postgresql://' instead of 'postgres://'
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Create engine for PostgreSQL (or other cloud DBs)
    engine = create_engine(DATABASE_URL)
else:
    # Fallback to local SQLite if no cloud database is configured yet
    print("WARNING: No DATABASE_URL found in environment. Falling back to local SQLite for development.")
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "health.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
