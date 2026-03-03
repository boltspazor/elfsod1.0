from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create database engine
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=5,  # Reduced from 20 for Supabase pooler
        max_overflow=10,  # Reduced from 30
        pool_pre_ping=True,
        pool_recycle=3600,  # Recycle connections every hour
        echo=False
    )
    logger.info(f"Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    """
    FastAPI dependency that provides a database session.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Test database connection
def test_connection():
    """
    Test database connectivity.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("Database connection test: SUCCESS")
            return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False

# Create tables function
def create_tables():
    """
    Create all database tables defined in models.
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise

# Database health check
def check_database_health():
    """
    Comprehensive database health check.
    """
    status = {
        "connected": False,
        "tables_exist": False,
        "error": None
    }
    
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            status["connected"] = True
            
            # Check if users table exists
            tables_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users'
                )
            """)
            result = conn.execute(tables_query)
            status["tables_exist"] = result.scalar()
                
    except Exception as e:
        status["error"] = str(e)
        logger.error(f"Database health check failed: {e}")
    
    return status