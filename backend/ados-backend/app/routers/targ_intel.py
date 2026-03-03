from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, Competitor, TargIntel
from app.schemas import (
    TargIntelInDB, TargIntelSummary, TargIntelCalculationRequest,
    BulkTargIntelResponse
)
from app.services.targ_intel_calculator import TargIntelCalculator
from app.dependencies import get_current_user
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/calculate", response_model=BulkTargIntelResponse)
async def calculate_targeting_intel(
    request: TargIntelCalculationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    Calculate targeting intelligence for competitors
    
    - If competitor_ids is None, calculates for all user's active competitors
    - Returns summary of calculation results
    - Can be run in background if needed
    """
    try:
        calculator = TargIntelCalculator(db)
        
        result = calculator.calculate_for_user(
            user_id=current_user.user_id,
            competitor_ids=request.competitor_ids,
            force_recalculate=request.force_recalculate
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in targeting intel calculation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calculation failed: {str(e)}"
        )

@router.post("/calculate/{competitor_id}", response_model=TargIntelInDB)
async def calculate_competitor_targeting_intel(
    competitor_id: UUID,
    force_recalculate: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate targeting intelligence for a specific competitor
    """
    try:
        # Verify competitor belongs to user
        competitor = db.query(Competitor).filter(
            Competitor.id == competitor_id,
            Competitor.user_id == current_user.user_id
        ).first()
        
        if not competitor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competitor not found"
            )
        
        calculator = TargIntelCalculator(db)
        
        targ_intel = calculator.calculate_for_competitor(
            competitor_id=competitor_id,
            user_id=current_user.user_id,
            force_recalculate=force_recalculate
        )
        
        if not targ_intel:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to calculate targeting intelligence"
            )
        
        return targ_intel
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating targeting intel for competitor {competitor_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calculation failed: {str(e)}"
        )

@router.get("/competitor/{competitor_id}", response_model=TargIntelInDB)
async def get_competitor_targeting_intel(
    competitor_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get targeting intelligence for a specific competitor
    """
    try:
        # Verify competitor belongs to user
        competitor = db.query(Competitor).filter(
            Competitor.id == competitor_id,
            Competitor.user_id == current_user.user_id
        ).first()
        
        if not competitor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competitor not found"
            )
        
        # Get targeting intel
        targ_intel = db.query(TargIntel).filter(
            TargIntel.competitor_id == competitor_id,
            TargIntel.user_id == current_user.user_id,
            TargIntel.is_active == True
        ).first()
        
        if not targ_intel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Targeting intelligence not found. Calculate it first."
            )
        
        return targ_intel
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting targeting intel for competitor {competitor_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve targeting intelligence: {str(e)}"
        )

@router.get("/all", response_model=List[TargIntelSummary])
async def get_all_targeting_intel(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    include_inactive: bool = False
):
    """
    Get targeting intelligence for all user's competitors
    """
    try:
        # Build query
        query = db.query(TargIntel, Competitor).join(
            Competitor,
            Competitor.id == TargIntel.competitor_id
        ).filter(
            Competitor.user_id == current_user.user_id,
            Competitor.is_active == True
        )
        
        if not include_inactive:
            query = query.filter(TargIntel.is_active == True)
        
        results = query.all()
        
        summaries = []
        for targ_intel, competitor in results:
            summaries.append(TargIntelSummary(
                competitor_id=competitor.id,
                competitor_name=competitor.name,
                age_range=targ_intel.age_range,
                primary_gender=targ_intel.primary_gender,
                primary_location=targ_intel.primary_location,
                income_level=targ_intel.income_level,
                funnel_stage=targ_intel.funnel_stage,
                audience_type=targ_intel.audience_type,
                bidding_strategy=targ_intel.bidding_strategy,
                overall_confidence=targ_intel.overall_confidence,
                last_calculated_at=targ_intel.last_calculated_at
            ))
        
        return summaries
        
    except Exception as e:
        logger.error(f"Error getting all targeting intel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve targeting intelligence: {str(e)}"
        )

@router.get("/dashboard")
async def get_targeting_intel_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard view of targeting intelligence with aggregated insights
    """
    try:
        # Get all active targeting intel for user
        targ_intels = db.query(TargIntel).join(
            Competitor,
            Competitor.id == TargIntel.competitor_id
        ).filter(
            Competitor.user_id == current_user.user_id,
            Competitor.is_active == True,
            TargIntel.is_active == True
        ).all()
        
        if not targ_intels:
            return {
                "total_competitors": 0,
                "average_confidence": 0,
                "insights": [],
                "recommendations": []
            }
        
        # Calculate aggregates
        total_competitors = len(targ_intels)
        avg_confidence = sum(ti.overall_confidence for ti in targ_intels) / total_competitors
        
        # Most common targeting patterns
        age_ranges = {}
        genders = {}
        income_levels = {}
        funnel_stages = {}
        bidding_strategies = {}
        
        for ti in targ_intels:
            age_ranges[ti.age_range] = age_ranges.get(ti.age_range, 0) + 1
            genders[ti.primary_gender] = genders.get(ti.primary_gender, 0) + 1
            income_levels[ti.income_level] = income_levels.get(ti.income_level, 0) + 1
            funnel_stages[ti.funnel_stage] = funnel_stages.get(ti.funnel_stage, 0) + 1
            bidding_strategies[ti.bidding_strategy] = bidding_strategies.get(ti.bidding_strategy, 0) + 1
        
        # Generate insights
        insights = []
        
        # Top age range
        if age_ranges:
            top_age = max(age_ranges, key=age_ranges.get)
            insights.append(f"Most competitors target age range: {top_age}")
        
        # Top gender
        if genders:
            top_gender = max(genders, key=genders.get)
            insights.append(f"Primary gender focus: {top_gender}")
        
        # Top income level
        if income_levels:
            top_income = max(income_levels, key=income_levels.get)
            insights.append(f"Most target {top_income} income audience")
        
        # Top funnel stage
        if funnel_stages:
            top_funnel = max(funnel_stages, key=funnel_stages.get)
            insights.append(f"Common marketing stage: {top_funnel}")
        
        # Generate recommendations
        recommendations = []
        
        if avg_confidence < 0.5:
            recommendations.append("Consider running more ads to improve targeting insights accuracy")
        
        if "middle" in income_levels and income_levels["middle"] > total_competitors * 0.7:
            recommendations.append("Most competitors target middle-income. Consider exploring luxury or budget segments")
        
        if "awareness" in funnel_stages and funnel_stages["awareness"] > total_competitors * 0.6:
            recommendations.append("Many competitors focus on awareness. Consider testing conversion-focused strategies")
        
        return {
            "total_competitors": total_competitors,
            "average_confidence": round(avg_confidence, 2),
            "aggregates": {
                "age_ranges": age_ranges,
                "genders": genders,
                "income_levels": income_levels,
                "funnel_stages": funnel_stages,
                "bidding_strategies": bidding_strategies
            },
            "insights": insights,
            "recommendations": recommendations
        }
        
    except Exception as e:
        logger.error(f"Error getting targeting intel dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate dashboard: {str(e)}"
        )

@router.delete("/{competitor_id}")
async def delete_targeting_intel(
    competitor_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete targeting intelligence for a competitor
    """
    try:
        # Verify competitor belongs to user
        competitor = db.query(Competitor).filter(
            Competitor.id == competitor_id,
            Competitor.user_id == current_user.user_id
        ).first()
        
        if not competitor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competitor not found"
            )
        
        # Delete targeting intel
        result = db.query(TargIntel).filter(
            TargIntel.competitor_id == competitor_id,
            TargIntel.user_id == current_user.user_id
        ).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Deleted targeting intelligence for {competitor.name}",
            "deleted_count": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting targeting intel for competitor {competitor_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete targeting intelligence: {str(e)}"
        )

@router.post("/refresh-all")
async def refresh_all_targeting_intel(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh targeting intelligence for all user's competitors
    """
    try:
        calculator = TargIntelCalculator(db)
        
        result = calculator.calculate_for_user(
            user_id=current_user.user_id,
            competitor_ids=None,
            force_recalculate=True
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error refreshing all targeting intel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refresh failed: {str(e)}"
        )