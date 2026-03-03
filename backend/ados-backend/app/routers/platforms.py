# app/routers/platforms.py - FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.database import get_db
from app.models import User, Competitor
from app.schemas import PlatformAdFetchRequest, PlatformAdFetchResponse, PlatformAd
from app.dependencies import get_current_user, verify_user_owns_competitor
from app.services.google_service import GoogleAdsService
from app.services.meta_service import MetaAdsService
from app.services.reddit_service import RedditAdsService
from app.services.linkedin_service import LinkedInAdsService
from app.services.youtube_service import YouTubeService
from app.services.instagram_service import InstagramService
from app.utils.logger import get_logger, audit_logger
from app.config import settings
import asyncio
import time

logger = get_logger(__name__)
router = APIRouter()

@router.post("/fetch", response_model=Dict[str, Any])
async def fetch_platform_ads(
    fetch_request: PlatformAdFetchRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch ads from specific platforms for a competitor.
    Runs in background.
    """
    logger.info(f"Platform ad fetch requested for competitor: {fetch_request.competitor_id}")
    
    # Verify competitor belongs to user
    competitor = db.query(Competitor).filter(
        Competitor.id == fetch_request.competitor_id,
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).first()
    
    if not competitor:
        logger.warning(f"Competitor not found: {fetch_request.competitor_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found"
        )
    
    # Initialize services
    api_key = settings.SCRAPECREATORS_API_KEY
    
    # Create background task
    async def fetch_ads_task():
        results = {}
        start_time = time.time()
        
        try:
            # Google
            if "google" in fetch_request.platforms and competitor.domain:
                logger.info(f"Fetching Google ads for {competitor.name} (domain: {competitor.domain})")
                google_service = GoogleAdsService(api_key)
                google_ads = await google_service.fetch_company_ads(competitor.domain)
                results["google"] = {
                    "success": True,
                    "ads_count": len(google_ads),
                    "ads": google_ads[:10]
                }
                
                audit_logger.log_ad_fetch(
                    user_id=str(current_user.user_id),
                    competitor_id=str(competitor.id),
                    platform="google",
                    success=True,
                    ads_count=len(google_ads)
                )
            
            # Meta
            if "meta" in fetch_request.platforms:
                logger.info(f"Fetching Meta ads for {competitor.name}")
                meta_service = MetaAdsService(api_key)
                meta_ads = await meta_service.search_ads(competitor.name)
                results["meta"] = {
                    "success": True,
                    "ads_count": len(meta_ads),
                    "ads": meta_ads[:10]
                }
                
                audit_logger.log_ad_fetch(
                    user_id=str(current_user.user_id),
                    competitor_id=str(competitor.id),
                    platform="meta",
                    success=True,
                    ads_count=len(meta_ads)
                )
            
            # Reddit
            if "reddit" in fetch_request.platforms:
                logger.info(f"Fetching Reddit ads for {competitor.name}")
                reddit_service = RedditAdsService(api_key)
                reddit_ads = await reddit_service.search_ads(competitor.name)
                results["reddit"] = {
                    "success": True,
                    "ads_count": len(reddit_ads),
                    "ads": reddit_ads[:10]
                }
                
                audit_logger.log_ad_fetch(
                    user_id=str(current_user.user_id),
                    competitor_id=str(competitor.id),
                    platform="reddit",
                    success=True,
                    ads_count=len(reddit_ads)
                )
            
            # LinkedIn
            if "linkedin" in fetch_request.platforms:
                logger.info(f"Fetching LinkedIn ads for {competitor.name}")
                linkedin_service = LinkedInAdsService(api_key)
                linkedin_ads = await linkedin_service.search_ads(competitor.name)
                results["linkedin"] = {
                    "success": True,
                    "ads_count": len(linkedin_ads),
                    "ads": linkedin_ads[:10]
                }
                
                audit_logger.log_ad_fetch(
                    user_id=str(current_user.user_id),
                    competitor_id=str(competitor.id),
                    platform="linkedin",
                    success=True,
                    ads_count=len(linkedin_ads)
                )
            
            # YouTube
            if "youtube" in fetch_request.platforms:
                logger.info(f"Fetching YouTube videos for {competitor.name}")
                youtube_service = YouTubeService(api_key)
                youtube_videos = await youtube_service.search_videos(
                    query=competitor.name,
                    max_results=10,
                    include_extras=True
                )
                results["youtube"] = {
                    "success": True,
                    "ads_count": len(youtube_videos),
                    "ads": youtube_videos[:10]
                }
                
                audit_logger.log_ad_fetch(
                    user_id=str(current_user.user_id),
                    competitor_id=str(competitor.id),
                    platform="youtube",
                    success=True,
                    ads_count=len(youtube_videos)
                )
            
            # Instagram
            if "instagram" in fetch_request.platforms:
                logger.info(f"Fetching Instagram reels for {competitor.name}")
                instagram_service = InstagramService(api_key)
                instagram_reels = await instagram_service.search_reels(
                    query=competitor.name,
                    max_results=10,
                    page=1
                )
                results["instagram"] = {
                    "success": True,
                    "ads_count": len(instagram_reels),
                    "ads": instagram_reels[:10]
                }
                
                audit_logger.log_ad_fetch(
                    user_id=str(current_user.user_id),
                    competitor_id=str(competitor.id),
                    platform="instagram",
                    success=True,
                    ads_count=len(instagram_reels)
                )
            
            # Update competitor last fetched time
            competitor.last_fetched_at = time.time()
            db.commit()
            
            duration = time.time() - start_time
            
            logger.info(f"Platform ads fetched successfully for {competitor.name} in {duration:.2f}s")
            
        except Exception as e:
            logger.error(f"Error fetching platform ads: {e}", exc_info=True)
            results["error"] = str(e)
            
            audit_logger.log_ad_fetch(
                user_id=str(current_user.user_id),
                competitor_id=str(competitor.id),
                platform="multiple",
                success=False,
                error=str(e)
            )
    
    # Add task to background
    background_tasks.add_task(fetch_ads_task)
    
    return {
        "message": "Ad fetch started in background",
        "competitor_id": str(competitor.id),
        "competitor_name": competitor.name,
        "platforms": fetch_request.platforms,
        "task_id": f"fetch_{competitor.id}_{int(time.time())}"
    }

@router.post("/fetch-sync", response_model=Dict[str, Any])
async def fetch_platform_ads_sync(
    fetch_request: PlatformAdFetchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch ads from specific platforms synchronously (for testing/demo).
    Returns results immediately.
    """
    logger.info(f"Sync platform ad fetch requested for competitor: {fetch_request.competitor_id}")
    
    # Verify competitor belongs to user
    competitor = db.query(Competitor).filter(
        Competitor.id == fetch_request.competitor_id,
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).first()
    
    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found"
        )
    
    # Initialize services
    api_key = settings.SCRAPECREATORS_API_KEY
    results = {}
    total_ads = 0
    
    try:
        # Google
        if "google" in fetch_request.platforms:
            if not competitor.domain:
                results["google"] = {
                    "success": False,
                    "error": "Domain required for Google ads",
                    "ads_count": 0
                }
            else:
                logger.info(f"Fetching Google ads for {competitor.name}")
                google_service = GoogleAdsService(api_key)
                google_ads = await google_service.fetch_company_ads(competitor.domain)
                results["google"] = {
                    "success": True,
                    "ads_count": len(google_ads),
                    "sample_ads": google_ads[:5]
                }
                total_ads += len(google_ads)
        
        # Meta
        if "meta" in fetch_request.platforms:
            logger.info(f"Fetching Meta ads for {competitor.name}")
            meta_service = MetaAdsService(api_key)
            meta_ads = await meta_service.search_ads(competitor.name)
            results["meta"] = {
                "success": True,
                "ads_count": len(meta_ads),
                "sample_ads": meta_ads[:5]
            }
            total_ads += len(meta_ads)
        
        # Reddit
        if "reddit" in fetch_request.platforms:
            logger.info(f"Fetching Reddit ads for {competitor.name}")
            reddit_service = RedditAdsService(api_key)
            reddit_ads = await reddit_service.search_ads(competitor.name)
            results["reddit"] = {
                "success": True,
                "ads_count": len(reddit_ads),
                "sample_ads": reddit_ads[:5]
            }
            total_ads += len(reddit_ads)
        
        # LinkedIn
        if "linkedin" in fetch_request.platforms:
            logger.info(f"Fetching LinkedIn ads for {competitor.name}")
            linkedin_service = LinkedInAdsService(api_key)
            linkedin_ads = await linkedin_service.search_ads(competitor.name)
            results["linkedin"] = {
                "success": True,
                "ads_count": len(linkedin_ads),
                "sample_ads": linkedin_ads[:5]
            }
            total_ads += len(linkedin_ads)
        
        # YouTube
        if "youtube" in fetch_request.platforms:
            logger.info(f"Fetching YouTube videos for {competitor.name}")
            youtube_service = YouTubeService(api_key)
            youtube_videos = await youtube_service.search_videos(
                query=competitor.name,
                max_results=5,
                include_extras=True
            )
            results["youtube"] = {
                "success": True,
                "ads_count": len(youtube_videos),
                "sample_ads": youtube_videos[:5]
            }
            total_ads += len(youtube_videos)
        
        # Instagram
        if "instagram" in fetch_request.platforms:
            logger.info(f"Fetching Instagram reels for {competitor.name}")
            instagram_service = InstagramService(api_key)
            instagram_reels = await instagram_service.search_reels(
                query=competitor.name,
                max_results=5,
                page=1
            )
            results["instagram"] = {
                "success": True,
                "ads_count": len(instagram_reels),
                "sample_ads": instagram_reels[:5]
            }
            total_ads += len(instagram_reels)
        
        # Update competitor last fetched time
        competitor.last_fetched_at = time.time()
        db.commit()
        
        logger.info(f"Sync ad fetch completed for {competitor.name}: {total_ads} ads total")
        
        return {
            "success": True,
            "competitor_id": str(competitor.id),
            "competitor_name": competitor.name,
            "total_ads_fetched": total_ads,
            "platform_results": results
        }
        
    except Exception as e:
        logger.error(f"Error in sync ad fetch: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching ads: {str(e)}"
        )

@router.get("/platforms")
def get_available_platforms():
    """
    Get list of available advertising platforms.
    """
    platforms = [
        {
            "id": "google",
            "name": "Google Ads",
            "description": "Search and display ads from Google",
            "requires_domain": True,
            "cost_credits": 1
        },
        {
            "id": "meta",
            "name": "Meta (Facebook/Instagram)",
            "description": "Ads from Facebook and Instagram",
            "requires_domain": False,
            "cost_credits": 1
        },
        {
            "id": "reddit",
            "name": "Reddit Ads",
            "description": "Promoted posts and ads on Reddit",
            "requires_domain": False,
            "cost_credits": 1
        },
        {
            "id": "linkedin",
            "name": "LinkedIn Ads",
            "description": "Sponsored content and ads on LinkedIn",
            "requires_domain": False,
            "cost_credits": 1
        },
        {
            "id": "youtube",
            "name": "YouTube Videos",
            "description": "Search YouTube videos and shorts",
            "requires_domain": False,
            "cost_credits": 1,
            "note": "Public videos and shorts (not ads)"
        },
        {
            "id": "instagram",
            "name": "Instagram Reels",
            "description": "Search Instagram reels and content",
            "requires_domain": False,
            "cost_credits": 1,
            "note": "Public reels and content (not ads)"
        }
    ]
    
    return {
        "platforms": platforms,
        "total": len(platforms)
    }

@router.get("/platform/{platform_id}/test")
async def test_platform_connection(
    platform_id: str,
    query: str = "nike",
    current_user: User = Depends(get_current_user)
):
    """
    Test connection to a specific platform API.
    """
    logger.info(f"Testing platform connection: {platform_id} with query: {query}")
    
    api_key = settings.SCRAPECREATORS_API_KEY
    start_time = time.time()
    
    try:
        if platform_id == "google":
            service = GoogleAdsService(api_key)
            result = await service.fetch_company_ads("example.com")
            ads_count = len(result)
            
        elif platform_id == "meta":
            service = MetaAdsService(api_key)
            result = await service.search_ads(query, max_results=5)
            ads_count = len(result)
            
        elif platform_id == "reddit":
            service = RedditAdsService(api_key)
            result = await service.search_ads(query)
            ads_count = len(result)
            
        elif platform_id == "linkedin":
            service = LinkedInAdsService(api_key)
            result = await service.search_ads(query, max_ads=5)
            ads_count = len(result)
            
        elif platform_id == "youtube":
            service = YouTubeService(api_key)
            result = await service.search_videos(query, max_results=5, include_extras=True)
            ads_count = len(result)
            
        elif platform_id == "instagram":
            service = InstagramService(api_key)
            result = await service.search_reels(query, max_results=5, page=1)
            ads_count = len(result)
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown platform: {platform_id}"
            )
        
        duration = time.time() - start_time
        
        return {
            "platform": platform_id,
            "status": "connected",
            "response_time_ms": round(duration * 1000, 2),
            "ads_found": ads_count,
            "api_key_valid": True,
            "message": f"Successfully connected to {platform_id} API"
        }
        
    except Exception as e:
        logger.error(f"Platform test failed for {platform_id}: {e}", exc_info=True)
        
        return {
            "platform": platform_id,
            "status": "error",
            "error": str(e),
            "api_key_valid": False if "401" in str(e) or "403" in str(e) else None,
            "message": f"Failed to connect to {platform_id} API"
        }

@router.get("/status")
def get_platform_status():
    """
    Get overall platform API status and credits information.
    """
    return {
        "status": "operational",
        "api_key_configured": bool(settings.SCRAPECREATORS_API_KEY),
        "platforms_available": 6,
        "message": "All platforms are available for use",
        "rate_limits": {
            "google": "1 credit per request + 25 per ad detail",
            "meta": "1 credit per search",
            "reddit": "1 credit per search",
            "linkedin": "1 credit per search",
            "youtube": "1 credit per search",
            "instagram": "1 credit per search"
        }
    }

@router.get("/credits")
def get_api_credits_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get information about API credits usage (placeholder).
    """
    return {
        "user_id": str(current_user.user_id),
        "total_credits_used": 0,
        "credits_remaining": "unlimited",
        "last_updated": time.time(),
        "note": "Credit tracking to be implemented based on API provider"
    }