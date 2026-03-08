# app/routers/campaign_ads.py
"""Ads per campaign (AutoCreate). Fetched dynamically when opening a campaign; stored in DB."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, CampaignAd
from app.services.trending_service import TrendingSearchService

router = APIRouter()


@router.get("/{campaign_id}")
async def get_campaign_ads(
    campaign_id: int,
    goal: str = Query(None, description="Campaign goal/keyword for first-time fetch (e.g. awareness, conversions)."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return ads for this campaign. If none stored, fetch from trending using `goal` as keyword,
    store in DB, then return. Show a loader on the client while this runs.
    """
    # Already stored?
    existing = (
        db.query(CampaignAd)
        .filter(
            CampaignAd.campaign_id == campaign_id,
            CampaignAd.user_id == current_user.user_id,
        )
        .order_by(CampaignAd.created_at.asc())
        .all()
    )
    if existing:
        return {"ads": [r.ad_data for r in existing], "source": "database"}

    # First time: fetch from trending if goal provided
    if not goal or not goal.strip():
        return {"ads": [], "source": "none"}

    keyword = goal.strip()
    if len(keyword) < 2:
        return {"ads": [], "source": "none"}

    service = TrendingSearchService()
    result = await service.search_trending(
        keyword=keyword,
        platforms=["meta", "instagram", "youtube"],
        limit_per_platform=5,
    )
    top = result.get("top_trending") or []
    if not top:
        return {"ads": [], "source": "fetched"}

    for item in top:
        row = CampaignAd(
            campaign_id=campaign_id,
            user_id=current_user.user_id,
            ad_data=item,
        )
        db.add(row)
    db.commit()

    return {"ads": top, "source": "fetched"}
