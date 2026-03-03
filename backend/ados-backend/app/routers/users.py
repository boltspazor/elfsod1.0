from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import UserResponse, UserProfileUpdate, UserPasswordChange
from app.dependencies import get_current_user
from app.utils.security import verify_password, get_password_hash
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile information.
    """
    logger.info(f"User profile requested: {current_user.email}")
    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile information.
    """
    logger.info(f"Updating profile for user: {current_user.email}")
    
    # Update user fields if provided
    update_data = profile_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if value is not None:
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Profile updated for user: {current_user.email}")
    return current_user

@router.post("/change-password")
def change_password(
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user's password.
    """
    logger.info(f"Password change requested for user: {current_user.email}")
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        logger.warning(f"Invalid current password for user: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_password_hash = get_password_hash(password_data.new_password)
    current_user.password_hash = new_password_hash
    
    db.commit()
    
    logger.info(f"Password changed successfully for user: {current_user.email}")
    return {"message": "Password changed successfully"}

@router.get("/stats")
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user statistics (competitors count, ads count, etc.).
    """
    from app.models import Competitor, Ad
    
    # Count competitors
    competitors_count = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).count()
    
    # Count ads (through competitors)
    ads_count = db.query(Ad).join(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).count()
    
    # Get last fetch time
    last_fetch = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id
    ).order_by(Competitor.last_fetched_at.desc()).first()
    
    last_fetch_time = last_fetch.last_fetched_at if last_fetch else None
    
    logger.debug(f"Stats retrieved for user: {current_user.email}")
    
    return {
        "user_id": str(current_user.user_id),
        "email": current_user.email,
        "competitors_count": competitors_count,
        "ads_count": ads_count,
        "last_fetch_time": last_fetch_time,
        "onboarding_completed": current_user.onboarding_completed
    }

@router.delete("/account")
def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user account (soft delete).
    """
    logger.warning(f"Account deletion requested for user: {current_user.email}")
    
    # Soft delete: mark as inactive
    current_user.is_active = False
    db.commit()
    
    logger.info(f"Account deactivated for user: {current_user.email}")
    return {"message": "Account deleted successfully"}