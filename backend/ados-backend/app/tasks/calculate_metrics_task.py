import logging
from celery import Celery
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional

from app.database import SessionLocal
from app.services.metrics_calculator import MetricsCalculator

# Configure Celery (adjust broker URL as needed)
celery_app = Celery(
    'ados_tasks',
    broker='redis://localhost:6379/0',  # Or your Redis URL
    backend='redis://localhost:6379/0'
)

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="calculate_metrics")
def calculate_metrics_background(
    self, 
    user_id: str,
    competitor_ids: Optional[List[str]] = None,
    time_period: str = "weekly",
    force_recalculate: bool = False
):
    """Background task to calculate metrics"""
    
    db = SessionLocal()
    try:
        user_uuid = uuid.UUID(user_id)
        
        calculator = MetricsCalculator(db)
        
        if competitor_ids:
            competitor_uuids = [uuid.UUID(cid) for cid in competitor_ids]
            
            # Verify all competitors belong to user
            for competitor_id in competitor_uuids:
                # This verification would need to be implemented
                pass
            
            # Calculate for specified competitors
            for competitor_id in competitor_uuids:
                try:
                    calculator.calculate_for_competitor(
                        competitor_id=competitor_id,
                        time_period=time_period
                    )
                    logger.info(f"Calculated metrics for competitor {competitor_id}")
                except Exception as e:
                    logger.error(f"Error calculating metrics for {competitor_id}: {str(e)}")
        else:
            # Calculate for all user's competitors
            calculator.calculate_for_user(
                user_id=user_uuid,
                time_period=time_period
            )
        
        return {
            "status": "completed",
            "message": f"Metrics calculated for {len(competitor_uuids) if competitor_ids else 'all'} competitors"
        }
        
    except Exception as e:
        logger.error(f"Error in background metrics calculation: {str(e)}")
        return {
            "status": "failed",
            "error": str(e)
        }
    finally:
        db.close()


@celery_app.task(name="calculate_daily_metrics")
def calculate_daily_metrics():
    """Scheduled task to calculate daily metrics for all users"""
    
    db = SessionLocal()
    try:
        from app.models import User
        
        # Get all active users
        users = db.query(User).filter(User.is_active == True).all()
        
        logger.info(f"Starting daily metrics calculation for {len(users)} users")
        
        calculator = MetricsCalculator(db)
        
        for user in users:
            try:
                calculator.calculate_for_user(
                    user_id=user.id,
                    time_period="daily"
                )
                logger.info(f"Calculated daily metrics for user {user.email}")
            except Exception as e:
                logger.error(f"Error calculating daily metrics for {user.email}: {str(e)}")
        
        return {"status": "completed", "users_processed": len(users)}
        
    except Exception as e:
        logger.error(f"Error in daily metrics calculation: {str(e)}")
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()