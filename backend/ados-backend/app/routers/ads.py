# app/routers/ads.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any, Optional
from uuid import UUID
from app.database import get_db, SessionLocal
from app.models import User, Competitor, Ad, AdFetch
from app.schemas import AdResponse, AdFetchResponse
from app.dependencies import get_current_user
from app.services.ad_fetcher import AdFetcher
from app.config import settings
import asyncio
import logging
import threading

router = APIRouter()

# Track active refresh jobs per user to avoid duplicate long-running work
active_refresh_jobs: Dict[str, bool] = {}
active_refresh_lock = threading.Lock()


def _refresh_competitor_task(competitor_id: str, user_id: str, platforms: List[str]) -> None:
    """Background task to refresh a single competitor using its own DB session."""
    db = SessionLocal()
    loop: asyncio.AbstractEventLoop | None = None
    try:
        fetcher = AdFetcher(db, settings.SCRAPECREATORS_API_KEY)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(
            fetcher.fetch_competitor_ads(competitor_id, user_id, platforms)
        )
    except Exception as e:
        logging.getLogger(__name__).error(
            "Background refresh failed for competitor %s (user %s): %s",
            competitor_id,
            user_id,
            e,
        )
    finally:
        with active_refresh_lock:
            active_refresh_jobs[user_id] = False
        if loop is not None:
            try:
                loop.close()
            except Exception:
                pass
        db.close()


def _refresh_all_task(user_id: str, platforms: List[str]) -> None:
    """Background task to refresh all competitors for a user using its own DB session."""
    db = SessionLocal()
    loop: asyncio.AbstractEventLoop | None = None
    try:
        fetcher = AdFetcher(db, settings.SCRAPECREATORS_API_KEY)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(fetcher.fetch_all_user_competitors(user_id, platforms))
    except Exception as e:
        logging.getLogger(__name__).error(
            "Background refresh-all failed for user %s: %s",
            user_id,
            e,
        )
    finally:
        with active_refresh_lock:
            active_refresh_jobs[user_id] = False
        if loop is not None:
            try:
                loop.close()
            except Exception:
                pass
        db.close()


@router.post("/refresh/{competitor_id}")
async def refresh_competitor_ads(
    competitor_id: UUID,
    platforms: List[str] = Query(["google", "meta", "reddit", "linkedin", "youtube", "instagram"]),
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start refresh for one competitor. If BackgroundTasks is available, run in background and return 202."""
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id,
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True,
    ).first()

    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found",
        )

    valid_platforms = ["google", "meta", "reddit", "linkedin", "youtube", "instagram"]
    for platform in platforms:
        if platform not in valid_platforms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid platform: {platform}. Valid platforms: {valid_platforms}",
            )

    user_id_str = str(current_user.user_id)

    # If a refresh is already running for this user, short‑circuit with 202
    with active_refresh_lock:
        if active_refresh_jobs.get(user_id_str):
            return JSONResponse(
                status_code=status.HTTP_202_ACCEPTED,
                content={
                    "message": "Refresh already in progress",
                    "status": "running",
                    "competitor_id": str(competitor_id),
                    "competitor_name": competitor.name,
                },
            )

        # Background mode: schedule refresh and return immediately
        if background_tasks is not None:
            active_refresh_jobs[user_id_str] = True
            background_tasks.add_task(
                _refresh_competitor_task,
                str(competitor_id),
                user_id_str,
                list(platforms),
            )
            return JSONResponse(
                status_code=status.HTTP_202_ACCEPTED,
                content={
                    "message": "Refresh started",
                    "status": "running",
                    "competitor_id": str(competitor_id),
                    "competitor_name": competitor.name,
                },
            )

    # Fallback synchronous behavior
    fetcher = AdFetcher(db, settings.SCRAPECREATORS_API_KEY)
    result = await fetcher.fetch_competitor_ads(
        str(competitor_id),
        str(current_user.user_id),
        platforms,
    )

    if result["success"]:
        return {
            "message": f"Ads refreshed successfully for {competitor.name}",
            "competitor_id": str(competitor_id),
            "competitor_name": competitor.name,
            "total_ads_fetched": result["total_ads"],
            "platforms": list(result.get("platforms", {}).keys()),
            "fetch_id": result["fetch_id"],
        }
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Failed to refresh ads: {result.get('error', 'Unknown error')}",
    )


@router.post("/refresh-all")
async def refresh_all_competitors_ads(
    platforms: List[str] = Query(["google", "meta", "reddit", "linkedin", "youtube", "instagram"]),
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start refresh for all competitors. If BackgroundTasks is available, run in background and return 202."""
    valid_platforms = ["google", "meta", "reddit", "linkedin", "youtube", "instagram"]
    for platform in platforms:
        if platform not in valid_platforms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid platform: {platform}. Valid platforms: {valid_platforms}",
            )

    user_id_str = str(current_user.user_id)

    with active_refresh_lock:
        if active_refresh_jobs.get(user_id_str):
            return JSONResponse(
                status_code=status.HTTP_202_ACCEPTED,
                content={
                    "message": "Refresh already in progress",
                    "status": "running",
                },
            )

        if background_tasks is not None:
            active_refresh_jobs[user_id_str] = True
            background_tasks.add_task(
                _refresh_all_task,
                user_id_str,
                list(platforms),
            )
            return JSONResponse(
                status_code=status.HTTP_202_ACCEPTED,
                content={
                    "message": "Refresh started for all competitors",
                    "status": "running",
                },
            )

    # Fallback synchronous behavior
    fetcher = AdFetcher(db, settings.SCRAPECREATORS_API_KEY)
    results = await fetcher.fetch_all_user_competitors(str(current_user.user_id), platforms)

    successful = sum(1 for r in results if r.get("success", False))
    total_ads = sum(r.get("total_ads", 0) for r in results if r.get("success", False))

    return {
        "message": f"Refreshed ads for {successful} competitors",
        "user_id": str(current_user.user_id),
        "total_competitors_processed": len(results),
        "successful": successful,
        "total_ads_fetched": total_ads,
        "platforms": platforms,
    }

@router.get("/competitor/{competitor_id}", response_model=List[AdResponse])
def get_competitor_ads(
    competitor_id: UUID,
    platform: Optional[str] = None,
    is_official: Optional[bool] = Query(None, description="Filter by official (company) ads: true=official only, false=unofficial only"),
    limit: int = Query(500, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ads for a specific competitor. Use is_official=true/false to fetch only official or unofficial ads so they are not pushed out by the limit."""
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
    
    query = db.query(Ad).filter(Ad.competitor_id == competitor_id)
    
    if platform:
        query = query.filter(Ad.platform == platform)
    if is_official is True:
        query = query.filter(Ad.is_official == True)
    elif is_official is False:
        query = query.filter(or_(Ad.is_official == False, Ad.is_official.is_(None)))
    
    ads = query.order_by(Ad.last_seen.desc()).limit(limit).all()
    
    # Add competitor_name to each ad
    result = []
    for ad in ads:
        ad_dict = {
            "id": ad.id,
            "competitor_id": ad.competitor_id,
            "platform": ad.platform,
            "headline": ad.headline,
            "description": ad.description,
            "full_text": ad.full_text,
            "destination_url": ad.destination_url,
            "image_url": ad.image_url,
            "video_url": ad.video_url,
            "format": ad.format,
            "impressions": ad.impressions,
            "spend": ad.spend,
            "is_active": ad.is_active,
            "is_official": getattr(ad, "is_official", None),
            "first_seen": ad.first_seen,
            "last_seen": ad.last_seen,
            "created_at": getattr(ad, 'created_at', None),
            "platform_ad_id": ad.platform_ad_id,
            "competitor_name": competitor.name,
        }
        result.append(ad_dict)
    
    return result

@router.get("/fetches", response_model=List[AdFetchResponse])
def get_ad_fetches(
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ad fetch history for current user"""
    query = db.query(AdFetch).filter(AdFetch.user_id == current_user.user_id)
    
    if status_filter:
        query = query.filter(AdFetch.status == status_filter)
    
    fetches = query.order_by(AdFetch.started_at.desc()).limit(limit).all()
    return fetches


# Add these imports at the top if needed
from typing import List, Dict, Any, Optional
from uuid import UUID

# Add these endpoints to your existing router

@router.get("/all", response_model=List[AdResponse])
def get_all_ads(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all ads for all competitors of current user"""
    # Get all competitors for the user
    competitors = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).all()
    
    if not competitors:
        return []
    
    # Build competitor name lookup
    competitor_names = {comp.id: comp.name for comp in competitors}
    
    # Get competitor IDs
    competitor_ids = [comp.id for comp in competitors]
    
    # Query ads for all these competitors
    ads = db.query(Ad)\
        .filter(Ad.competitor_id.in_(competitor_ids))\
        .order_by(Ad.last_seen.desc())\
        .limit(limit)\
        .all()
    
    # Add competitor_name to each ad
    result = []
    for ad in ads:
        ad_dict = {
            "id": ad.id,
            "competitor_id": ad.competitor_id,
            "platform": ad.platform,
            "headline": ad.headline,
            "description": ad.description,
            "full_text": ad.full_text,
            "destination_url": ad.destination_url,
            "image_url": ad.image_url,
            "video_url": ad.video_url,
            "format": ad.format,
            "impressions": ad.impressions,
            "spend": ad.spend,
            "is_active": ad.is_active,
            "is_official": getattr(ad, "is_official", None),
            "first_seen": ad.first_seen,
            "last_seen": ad.last_seen,
            "created_at": getattr(ad, 'created_at', None),
            "platform_ad_id": ad.platform_ad_id,
            "competitor_name": competitor_names.get(ad.competitor_id, "Unknown"),
        }
        result.append(ad_dict)
    
    return result

# app/routers/ads.py
# Add these imports at the top if needed
from datetime import datetime, timedelta
import math

# Update the get_dashboard_metrics function
@router.get("/dashboard-metrics")
def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard metrics from ads table with intelligent calculation"""
    # Get all competitors for the user
    competitors = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).all()
    
    # Get all ads for these competitors
    competitor_ids = [comp.id for comp in competitors]
    all_ads = db.query(Ad).filter(Ad.competitor_id.in_(competitor_ids)).all()
    
    # Calculate metrics
    metrics = calculate_ads_metrics(all_ads)
    
    return {
        "total_competitor_spend": metrics["total_spend"],
        "active_campaigns": metrics["active_campaigns"],
        "total_impressions": metrics["total_impressions"],
        "avg_ctr": metrics["avg_ctr"],
        "total_competitors": len(competitors),
        "platform_distribution": metrics["platform_distribution"],
        "ad_lifespan_days": metrics.get("avg_lifespan_days", 0),
        "freshness_score": metrics.get("freshness_score", 0)
    }

# Update the get_platform_stats function
@router.get("/platform-stats")
def get_platform_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get platform statistics from ads table with intelligent calculation"""
    # Get all competitors for the user
    competitors = db.query(Competitor).filter(
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).all()
    
    if not competitors:
        return []
    
    competitor_ids = [comp.id for comp in competitors]
    all_ads = db.query(Ad).filter(Ad.competitor_id.in_(competitor_ids)).all()
    
    # Group by platform
    platform_data = {}
    for ad in all_ads:
        if ad.platform:
            platform = ad.platform.lower()
            if platform not in platform_data:
                platform_data[platform] = {
                    "ad_count": 0,
                    "total_spend": 0,
                    "total_impressions": 0,
                    "active_campaigns": 0,
                    "ads": []
                }
            
            platform_data[platform]["ad_count"] += 1
            platform_data[platform]["ads"].append(ad)
            
            # Calculate spend and impressions for this ad
            ad_metrics = calculate_ad_metrics(ad)
            platform_data[platform]["total_spend"] += ad_metrics["estimated_spend"]
            platform_data[platform]["total_impressions"] += ad_metrics["estimated_impressions"]
            
            if ad.is_active:
                platform_data[platform]["active_campaigns"] += 1
    
    # Calculate totals
    total_ads = len(all_ads)
    
    # Prepare response - COMPATIBLE VERSION
    platform_stats = []
    colors = ["#00C2B3", "#4A90E2", "#FF6B6B", "#FFD166", "#9B59B6", "#2ECC71"]
    
    for i, (platform_name, data) in enumerate(platform_data.items()):
        percentage = (data["ad_count"] / total_ads * 100) if total_ads > 0 else 0
        
        # Calculate CTR based on estimated values
        avg_ctr = 0.02  # Default
        if data["total_impressions"] > 0 and len(data["ads"]) > 0:
            # Estimate CTR based on platform and activity
            platform_ctr_map = {
                "meta": 0.018,
                "facebook": 0.018,
                "instagram": 0.015,
                "youtube": 0.012,
                "linkedin": 0.025,
                "reddit": 0.008,
                "google": 0.035,
                "tiktok": 0.010
            }
            avg_ctr = platform_ctr_map.get(platform_name, 0.02)
            
            # Adjust based on ad recency
            recent_ads = [ad for ad in data["ads"] if is_recent_ad(ad)]
            if recent_ads:
                avg_ctr *= 1.2  # Boost for recent ads
        
        # COMPATIBLE response - only includes fields in PlatformStats interface
        platform_stats.append({
            "platform": platform_name,
            "ad_count": data["ad_count"],
            "total_spend": data["total_spend"],
            "avg_ctr": round(avg_ctr, 4),
            "percentage": round(percentage, 2),
            "color": colors[i % len(colors)]
            # Removed: "total_impressions", "active_campaigns", "ad_freshness"
        })
    
    # Sort by total spend (highest first)
    platform_stats.sort(key=lambda x: x["total_spend"], reverse=True)
    
    return platform_stats

# Add these helper functions to the same file
def calculate_ad_metrics(ad):
    """Calculate intelligent metrics for a single ad"""
    estimated_spend = 0
    estimated_impressions = 0
    
    # Try to parse actual spend/impressions first
    if ad.spend:
        try:
            spend_str = str(ad.spend).replace('$', '').replace(',', '')
            if 'K' in spend_str.upper():
                estimated_spend = float(spend_str.upper().replace('K', '')) * 1000
            elif 'M' in spend_str.upper():
                estimated_spend = float(spend_str.upper().replace('M', '')) * 1000000
            else:
                estimated_spend = float(spend_str)
        except:
            pass
    
    if ad.impressions:
        try:
            imp_str = str(ad.impressions).replace(',', '')
            if 'K' in imp_str.upper():
                estimated_impressions = float(imp_str.upper().replace('K', '')) * 1000
            elif 'M' in imp_str.upper():
                estimated_impressions = float(imp_str.upper().replace('M', '')) * 1000000
            else:
                estimated_impressions = float(imp_str)
        except:
            pass
    
    # If no actual data, estimate based on ad lifespan and platform
    if estimated_spend == 0 and ad.first_seen and ad.last_seen:
        estimated_spend = estimate_spend_from_lifespan(ad)
    
    if estimated_impressions == 0 and estimated_spend > 0:
        # Estimate impressions based on spend and platform
        estimated_impressions = estimate_impressions_from_spend(estimated_spend, ad.platform)
    elif estimated_impressions == 0 and ad.first_seen and ad.last_seen:
        estimated_impressions = estimate_impressions_from_lifespan(ad)
    
    return {
        "estimated_spend": estimated_spend,
        "estimated_impressions": estimated_impressions,
        "is_active": ad.is_active
    }

def estimate_spend_from_lifespan(ad):
    """Estimate spend based on ad lifespan and platform"""
    if not ad.first_seen or not ad.last_seen:
        return 0
    
    # Calculate ad lifespan in days
    if isinstance(ad.first_seen, str):
        first_seen = datetime.fromisoformat(ad.first_seen.replace('Z', '+00:00'))
        last_seen = datetime.fromisoformat(ad.last_seen.replace('Z', '+00:00'))
    else:
        first_seen = ad.first_seen
        last_seen = ad.last_seen
    
    lifespan_days = (last_seen - first_seen).days
    lifespan_days = max(lifespan_days, 1)  # Minimum 1 day
    
    # Platform-specific daily spend estimates
    platform_daily_spend = {
        "meta": 150,
        "facebook": 150,
        "instagram": 100,
        "youtube": 300,
        "linkedin": 200,
        "reddit": 50,
        "google": 250,
        "tiktok": 120
    }
    
    base_daily = platform_daily_spend.get(ad.platform.lower() if ad.platform else "meta", 100)
    
    # Adjust based on ad status
    if ad.is_active:
        multiplier = 1.5  # Active ads likely have higher spend
    else:
        multiplier = 0.7
    
    # Adjust for ad format
    format_multiplier = 1.0
    if ad.format:
        if "video" in ad.format.lower():
            format_multiplier = 1.8
        elif "carousel" in ad.format.lower():
            format_multiplier = 1.3
        elif "story" in ad.format.lower():
            format_multiplier = 1.2
    
    estimated_total = base_daily * lifespan_days * multiplier * format_multiplier
    
    # Cap at reasonable values
    return min(estimated_total, 1000000)  # Cap at $1M

def estimate_impressions_from_spend(spend, platform):
    """Estimate impressions based on spend and platform"""
    # Average CPM (Cost Per 1000 Impressions) by platform
    platform_cpm = {
        "meta": 10.0,
        "facebook": 10.0,
        "instagram": 8.0,
        "youtube": 12.0,
        "linkedin": 15.0,
        "reddit": 6.0,
        "google": 5.0,
        "tiktok": 7.0
    }
    
    cpm = platform_cpm.get(platform.lower() if platform else "meta", 10.0)
    
    # Impressions = (Spend / CPM) * 1000
    return (spend / cpm) * 1000 if cpm > 0 else 0

def estimate_impressions_from_lifespan(ad):
    """Estimate impressions based on ad lifespan"""
    if not ad.first_seen or not ad.last_seen:
        return 0
    
    # Base daily impressions by platform
    platform_daily_impressions = {
        "meta": 5000,
        "facebook": 5000,
        "instagram": 8000,
        "youtube": 15000,
        "linkedin": 3000,
        "reddit": 2000,
        "google": 10000,
        "tiktok": 12000
    }
    
    if isinstance(ad.first_seen, str):
        first_seen = datetime.fromisoformat(ad.first_seen.replace('Z', '+00:00'))
        last_seen = datetime.fromisoformat(ad.last_seen.replace('Z', '+00:00'))
    else:
        first_seen = ad.first_seen
        last_seen = ad.last_seen
    
    lifespan_days = (last_seen - first_seen).days
    lifespan_days = max(lifespan_days, 1)
    
    base_daily = platform_daily_impressions.get(ad.platform.lower() if ad.platform else "meta", 5000)
    
    # Adjust based on ad status and format
    multiplier = 1.0
    if ad.is_active:
        multiplier = 1.3
    
    if ad.format:
        if "video" in ad.format.lower():
            multiplier *= 1.5
        elif "story" in ad.format.lower():
            multiplier *= 1.8
    
    estimated_total = base_daily * lifespan_days * multiplier
    
    return min(estimated_total, 10000000)  # Cap at 10M impressions

def calculate_ads_metrics(ads):
    """Calculate aggregate metrics for a list of ads"""
    total_spend = 0
    total_impressions = 0
    active_campaigns = 0
    platform_distribution = {}
    total_lifespan = 0
    recent_ads = 0
    
    for ad in ads:
        # Calculate individual ad metrics
        ad_metrics = calculate_ad_metrics(ad)
        
        total_spend += ad_metrics["estimated_spend"]
        total_impressions += ad_metrics["estimated_impressions"]
        
        if ad.is_active:
            active_campaigns += 1
        
        # Platform distribution
        if ad.platform:
            platform = ad.platform.lower()
            platform_distribution[platform] = platform_distribution.get(platform, 0) + 1
        
        # Calculate ad lifespan
        if ad.first_seen and ad.last_seen:
            try:
                if isinstance(ad.first_seen, str):
                    first = datetime.fromisoformat(ad.first_seen.replace('Z', '+00:00'))
                    last = datetime.fromisoformat(ad.last_seen.replace('Z', '+00:00'))
                else:
                    first = ad.first_seen
                    last = ad.last_seen
                
                lifespan_days = (last - first).days
                total_lifespan += max(lifespan_days, 1)
                
                # Check if ad is recent (within last 30 days)
                thirty_days_ago = datetime.now() - timedelta(days=30)
                if last > thirty_days_ago:
                    recent_ads += 1
            except:
                pass
    
    # Calculate average CTR
    avg_ctr = 0.02  # Default
    if total_impressions > 0:
        # Base CTR with adjustments
        base_ctr = 0.02
        
        # Adjust based on ad freshness
        freshness_ratio = recent_ads / len(ads) if ads else 0
        freshness_bonus = freshness_ratio * 0.01  # Up to 1% bonus for fresh ads
        
        avg_ctr = round(base_ctr + freshness_bonus, 4)
    
    # Calculate average lifespan
    avg_lifespan_days = total_lifespan / len(ads) if ads else 0
    
    # Calculate freshness score (0-100)
    freshness_score = round((recent_ads / len(ads) * 100) if ads else 0, 1)
    
    return {
        "total_spend": round(total_spend, 2),
        "total_impressions": int(total_impressions),
        "active_campaigns": active_campaigns,
        "avg_ctr": avg_ctr,
        "platform_distribution": platform_distribution,
        "avg_lifespan_days": round(avg_lifespan_days, 1),
        "freshness_score": freshness_score,
        "total_ads": len(ads),
        "recent_ads": recent_ads
    }

def is_recent_ad(ad, days=30):
    """Check if ad was last seen within given days"""
    if not ad.last_seen:
        return False
    
    try:
        if isinstance(ad.last_seen, str):
            last_seen = datetime.fromisoformat(ad.last_seen.replace('Z', '+00:00'))
        else:
            last_seen = ad.last_seen
        
        cutoff_date = datetime.now() - timedelta(days=days)
        return last_seen > cutoff_date
    except:
        return False

def calculate_platform_freshness(ads):
    """Calculate freshness percentage for a platform's ads"""
    if not ads:
        return 0
    
    recent_count = sum(1 for ad in ads if is_recent_ad(ad, days=30))
    return round((recent_count / len(ads)) * 100, 1)