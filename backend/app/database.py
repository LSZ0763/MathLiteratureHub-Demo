from sqlalchemy import create_engine, inspect, Column, Integer, String, Text, DateTime, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from app.config import get_settings

settings = get_settings()

# Ensure data directory exists
os.makedirs(os.path.join(os.path.dirname(__file__), "..", "data"), exist_ok=True)

SQLALCHEMY_DATABASE_URL = settings.database_url

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate():
    """Add missing columns to existing tables."""
    from sqlalchemy import text
    
    inspector = inspect(engine)
    
    # Papers table migrations
    if "papers" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("papers")]
        
        with engine.connect() as conn:
            if "journal" not in columns:
                conn.execute(text("ALTER TABLE papers ADD COLUMN journal VARCHAR"))
            if "keywords" not in columns:
                conn.execute(text("ALTER TABLE papers ADD COLUMN keywords TEXT"))
            if "citation_count" not in columns:
                conn.execute(text("ALTER TABLE papers ADD COLUMN citation_count INTEGER DEFAULT 0"))
            if "reference_count" not in columns:
                conn.execute(text("ALTER TABLE papers ADD COLUMN reference_count INTEGER DEFAULT 0"))
            if "refs" not in columns:
                conn.execute(text('ALTER TABLE papers ADD COLUMN "refs" TEXT'))
            conn.commit()
