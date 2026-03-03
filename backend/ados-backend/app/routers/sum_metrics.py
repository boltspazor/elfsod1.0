from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, SumMetrics
from app.schemas import (
    SumMetricsResponse, SumMetricsDashboard, 
    SumMetricsCalculationRequest
)
from app.services.sum_metrics_calculator import SumMetricsCalculator
from app.dependencies import get_current_user
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/calculate", response_model=SumMetricsResponse)
async def calculate_summary_metrics(
    request: SumMetricsCalculationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate simple summary metrics:
    1. Total competitor spend (monthly)
    2. Active campaigns (sum of active ads)
    3. Total impressions (estimated from spend and CPM)
    4. Average CTR (weighted by spend)
    """
    try:
        calculator = SumMetricsCalculator(db)
        
        sum_metrics = calculator.calculate_for_user(
            user_id=current_user.user_id,
            time_period=request.time_period,
            competitor_ids=request.competitor_ids,
            force_recalculate=request.force_recalculate
        )
        
        if not sum_metrics:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to calculate summary metrics"
            )
        
        return sum_metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating summary metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calculation failed: {str(e)}"
        )

@router.get("/dashboard", response_model=SumMetricsDashboard)
async def get_summary_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get simple dashboard with the 4 key metrics
    """
    try:
        calculator = SumMetricsCalculator(db)
        
        result = calculator.get_summary_dashboard(current_user.user_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("message", "Dashboard data not available")
            )
        
        return result["dashboard"]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting summary dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard: {str(e)}"
        )

@router.get("/history", response_model=List[SumMetricsResponse])
async def get_summary_history(
    limit: int = Query(10, ge=1, le=100),
    time_period: Optional[str] = Query(None, description="Filter by time period"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get history of summary metrics
    """
    try:
        query = db.query(SumMetrics).filter(
            SumMetrics.user_id == current_user.user_id,
            SumMetrics.is_active == True
        )
        
        if time_period:
            query = query.filter(SumMetrics.time_period == time_period)
        
        summaries = query.order_by(SumMetrics.calculated_at.desc()).limit(limit).all()
        
        return summaries
        
    except Exception as e:
        logger.error(f"Error getting summary history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get history: {str(e)}"
        )

@router.get("/current", response_model=SumMetricsResponse)
async def get_current_summary(
    time_period: str = Query("monthly", description="Time period: daily, weekly, monthly, all_time"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current summary metrics for the specified time period
    """
    try:
        calculator = SumMetricsCalculator(db)
        
        sum_metrics = calculator.calculate_for_user(
            user_id=current_user.user_id,
            time_period=time_period
        )
        
        if not sum_metrics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Summary metrics not found"
            )
        
        return sum_metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get summary: {str(e)}"
        )

@router.post("/refresh")
async def refresh_summary_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh all summary metrics
    """
    try:
        calculator = SumMetricsCalculator(db)
        
        periods = ["daily", "weekly", "monthly", "all_time"]
        results = []
        
        for period in periods:
            try:
                sum_metrics = calculator.calculate_for_user(
                    user_id=current_user.user_id,
                    time_period=period,
                    force_recalculate=True
                )
                
                if sum_metrics:
                    results.append({
                        "period": period,
                        "success": True,
                        "total_spend": sum_metrics.total_competitor_spend
                    })
                else:
                    results.append({
                        "period": period,
                        "success": False,
                        "error": "Calculation failed"
                    })
                    
            except Exception as e:
                logger.error(f"Failed to calculate {period} summary: {e}")
                results.append({
                    "period": period,
                    "success": False,
                    "error": str(e)
                })
        
        success_count = sum(1 for r in results if r["success"])
        
        return {
            "success": True,
            "message": f"Refreshed {success_count}/{len(periods)} periods",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error refreshing summary metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refresh failed: {str(e)}"
        )