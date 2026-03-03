from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import date
import traceback

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Competitor, SurvMetrics
from app.schemas import MetricsResponse, MetricsSummary, CalculateMetricsRequest
from app.services.metrics_calculator import MetricsCalculator

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.post("/calculate", response_model=List[MetricsResponse])
async def calculate_metrics(
    request: CalculateMetricsRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate metrics for competitors.
    
    If competitor_ids is None, calculates for all user's competitors.
    """
    
    # Validate competitor_ids belong to current user
    if request.competitor_ids:
        competitors = db.query(Competitor).filter(
            Competitor.id.in_(request.competitor_ids),
            Competitor.user_id == current_user.user_id,
            Competitor.is_active == True
        ).all()
        
        if len(competitors) != len(request.competitor_ids):
            raise HTTPException(
                status_code=403, 
                detail="Some competitors not found or don't belong to you"
            )
        
        competitor_ids = [c.id for c in competitors]
    else:
        # Get all user's competitors
        competitors = db.query(Competitor).filter(
            Competitor.user_id == current_user.user_id,
            Competitor.is_active == True
        ).all()
        competitor_ids = [c.id for c in competitors]
    
    if not competitor_ids:
        raise HTTPException(status_code=404, detail="No competitors found")
    
    # Calculate metrics with proper error handling
    calculator = MetricsCalculator(db)
    results = []
    failed_competitors = []
    
    for competitor_id in competitor_ids:
        try:
            metrics = calculator.calculate_for_competitor(
                competitor_id=competitor_id,
                time_period=request.time_period
            )
            results.append(metrics)
        except Exception as e:
            # Log error with more details
            error_details = traceback.format_exc()
            print(f"❌ Error calculating metrics for competitor {competitor_id}:")
            print(f"   Error: {str(e)}")
            print(f"   Traceback: {error_details[:500]}...")
            
            # Rollback the session for this competitor's transaction
            db.rollback()
            failed_competitors.append(str(competitor_id))
            
            # Create a new session for the next competitor
            # This ensures the session is clean for the next iteration
            calculator.db = db
    
    if not results and failed_competitors:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to calculate metrics for any competitors. Failed: {failed_competitors}"
        )
    
    return results

@router.get("/competitor/{competitor_id}", response_model=List[MetricsResponse])
async def get_competitor_metrics(
    competitor_id: uuid.UUID,
    time_period: Optional[str] = Query(None, description="Filter by time period"),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get metrics for a specific competitor"""
    
    # Verify competitor belongs to user
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id,
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).first()
    
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    # Build query
    query = db.query(SurvMetrics).filter(
        SurvMetrics.competitor_id == competitor_id
    ).order_by(SurvMetrics.calculated_at.desc())
    
    if time_period:
        query = query.filter(SurvMetrics.time_period == time_period)
    
    metrics = query.limit(limit).all()
    
    return metrics


@router.get("/summary", response_model=List[MetricsSummary])
async def get_metrics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get summary of latest metrics for all user's competitors"""
    
    # Get all competitors
    competitors = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).all()
    
    summaries = []
    
    for competitor in competitors:
        # Get latest metrics
        latest_metrics = db.query(SurvMetrics).filter(
            SurvMetrics.competitor_id == competitor.id
        ).order_by(SurvMetrics.calculated_at.desc()).first()
        
        if latest_metrics:
            summaries.append(MetricsSummary(
                competitor_id=competitor.id,
                competitor_name=competitor.name,
                last_calculated=latest_metrics.calculated_at,
                active_ads=latest_metrics.active_ads or 0,
                estimated_monthly_spend=latest_metrics.estimated_monthly_spend or 0,
                avg_ctr=latest_metrics.avg_ctr or 0,
                risk_score=latest_metrics.risk_score or 50,
                opportunity_score=latest_metrics.opportunity_score or 50
            ))
    
    return summaries


@router.get("/platform-stats")
async def get_platform_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get platform-wise statistics across all competitors"""
    
    competitors = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).all()
    
    if not competitors:
        return {"message": "No competitors found"}
    
    platform_stats = {
        "google": {"competitors": 0, "total_ads": 0, "active_ads": 0},
        "meta": {"competitors": 0, "total_ads": 0, "active_ads": 0},
        "linkedin": {"competitors": 0, "total_ads": 0, "active_ads": 0},
        "reddit": {"competitors": 0, "total_ads": 0, "active_ads": 0},
        "youtube": {"competitors": 0, "total_ads": 0, "active_ads": 0},
        "instagram": {"competitors": 0, "total_ads": 0, "active_ads": 0}
    }
    
    for competitor in competitors:
        # Get latest metrics
        metrics = db.query(SurvMetrics).filter(
            SurvMetrics.competitor_id == competitor.id
        ).order_by(SurvMetrics.calculated_at.desc()).first()
        
        if metrics and metrics.ads_per_platform:
            if isinstance(metrics.ads_per_platform, dict):
                for platform, count in metrics.ads_per_platform.items():
                    if platform in platform_stats:
                        platform_stats[platform]["competitors"] += 1
                        platform_stats[platform]["total_ads"] += count
                        
                        # Estimate active ads (assuming 70% are active)
                        platform_stats[platform]["active_ads"] += int(count * 0.7)
    
    return platform_stats


@router.delete("/{metrics_id}")
async def delete_metrics(
    metrics_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete specific metrics record"""
    
    metrics = db.query(SurvMetrics).filter(
        SurvMetrics.id == metrics_id
    ).first()
    
    if not metrics:
        raise HTTPException(status_code=404, detail="Metrics not found")
    
    # Verify competitor belongs to user
    competitor = db.query(Competitor).filter(
        Competitor.id == metrics.competitor_id,
        Competitor.user_id == current_user.user_id
    ).first()
    
    if not competitor:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(metrics)
    db.commit()
    
    return {"message": "Metrics deleted successfully"}


@router.get("/test", response_model=dict)
async def test_metrics_endpoint(current_user: User = Depends(get_current_user)):
    """Test endpoint to verify metrics router is working"""
    return {
        "message": "Metrics router is working!",
        "user_id": str(current_user.user_id),
        "endpoints": [
            "POST /api/metrics/calculate",
            "GET /api/metrics/summary",
            "GET /api/metrics/competitor/{id}",
            "GET /api/metrics/platform-stats"
        ]
    }