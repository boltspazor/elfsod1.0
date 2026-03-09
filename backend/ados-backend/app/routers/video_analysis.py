# app/routers/video_analysis.py
"""Video Analysis (Reverse Engineering): add & list analyzed ads by link – user-scoped, all major platforms."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, UserAnalyzedAd
from app.utils.ad_link_parser import parse_ad_link

router = APIRouter()


class AddAdRequest(BaseModel):
    url: str


class AdListItem(BaseModel):
    id: str
    company: Optional[str]
    ad_title: Optional[str]
    ad_text: Optional[str]
    full_ad_text: Optional[str]
    call_to_action: Optional[str]
    ad_archive_id: str
    analyzed_at: Optional[str]
    created_at: str
    analysis: Optional[dict]
    platform: str
    source_url: str
    status: str

    class Config:
        from_attributes = True


@router.post("/add")
async def add_and_analyze_ad(
    request: AddAdRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit an ad/content link for analysis. Supported: Facebook Ad Library, Instagram,
    TikTok, YouTube, LinkedIn, Twitter/X. The ad is stored for the current user only.
    """
    url = (request.url or "").strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL is required")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = parse_ad_link(url)
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported link. Use a direct link from Facebook Ad Library, Instagram, TikTok, "
                "YouTube, LinkedIn, or Twitter/X."
            ),
        )
    platform, external_id = parsed

    existing = (
        db.query(UserAnalyzedAd)
        .filter(
            UserAnalyzedAd.user_id == current_user.user_id,
            UserAnalyzedAd.platform == platform,
            UserAnalyzedAd.external_id == external_id,
        )
        .first()
    )
    if existing:
        return {"message": f"This {platform} ad is already in your list.", "id": str(existing.id)}

    row = UserAnalyzedAd(
        user_id=current_user.user_id,
        platform=platform,
        source_url=url,
        external_id=external_id,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "message": f"{platform.capitalize()} ad added. Analysis can be run by your pipeline; refresh the list to see updates.",
        "id": str(row.id),
    }


@router.get("/ads", response_model=List[dict])
async def list_my_ads(
    scope: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return analyzed ads. Default: current user only.
    Use ?scope=all to return all analyzed ads in the database (shared library of past analyses).
    """
    q = db.query(UserAnalyzedAd)
    if scope != "all":
        q = q.filter(UserAnalyzedAd.user_id == current_user.user_id)
    rows = (
        q.order_by(UserAnalyzedAd.updated_at.desc().nullslast(), UserAnalyzedAd.created_at.desc())
        .limit(200)
        .all()
    )
    out = []
    for r in rows:
        out.append({
            "id": str(r.id),
            "company": r.company or "",
            "ad_title": r.ad_title or "",
            "ad_text": r.ad_text or "",
            "full_ad_text": r.full_ad_text or "",
            "call_to_action": r.call_to_action or "",
            "ad_archive_id": r.external_id,
            "analyzed_at": r.analyzed_at.isoformat() if r.analyzed_at else "",
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "analysis": r.analysis,
            "platform": r.platform,
            "source_url": r.source_url,
            "status": r.status,
        })
    return out
