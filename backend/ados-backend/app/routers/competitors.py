from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Competitor, User
from app.schemas import CompetitorCreate, CompetitorResponse, CompetitorUpdate
from app.dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=List[CompetitorResponse])
def get_competitors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all competitors for current user"""
    competitors = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).order_by(Competitor.created_at.desc()).all()
    return competitors

@router.post("/", response_model=CompetitorResponse)
def create_competitor(
    competitor_data: CompetitorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new competitor"""
    # Check if competitor already exists for this user
    existing = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.domain == competitor_data.domain
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competitor with this domain already exists"
        )
    
    competitor = Competitor(
        name=competitor_data.name,
        domain=competitor_data.domain,
        industry=competitor_data.industry,
        estimated_monthly_spend=competitor_data.estimated_monthly_spend,
        user_id=current_user.user_id
    )
    
    db.add(competitor)
    db.commit()
    db.refresh(competitor)
    
    return competitor

@router.delete("/{competitor_id}")
def delete_competitor(
    competitor_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a competitor (soft delete)"""
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id,
        Competitor.user_id == current_user.user_id
    ).first()
    
    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found"
        )
    
    competitor.is_active = False
    db.commit()
    
    return {"message": "Competitor deleted successfully"}