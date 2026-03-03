from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

from app.dependencies import get_current_user
from app.models import User
from app.schemas import TrendingSearchRequest, TrendingSearchResponse, PlatformResult
from app.services.trending_service import TrendingSearchService  # Updated import

router = APIRouter()

@router.post("/search", response_model=TrendingSearchResponse)
async def search_trending_ads(
    request: TrendingSearchRequest,
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user)
):
    """
    Search for trending ads/content across multiple platforms
    
    - **keyword**: Search term
    - **platforms**: Platforms to search (meta, reddit, linkedin, instagram, youtube)
    - **limit_per_platform**: Max results per platform
    - **async_mode**: If True, runs in background and returns task ID
    """
    
    if not request.keyword or len(request.keyword.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Keyword must be at least 2 characters long"
        )
    
    # Validate platforms
    valid_platforms = ["meta", "reddit", "linkedin", "instagram", "youtube"]
    invalid_platforms = [p for p in request.platforms if p not in valid_platforms]
    
    if invalid_platforms:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platforms: {invalid_platforms}. Valid platforms: {valid_platforms}"
        )
    
    # Initialize trending service
    trending_service = TrendingSearchService()
    
    # If async mode requested, run in background
    if request.async_mode and background_tasks:
        task_id = str(uuid.uuid4())
        
        # Store task info (in production, use Redis/Celery)
        task_info = {
            "task_id": task_id,
            "keyword": request.keyword,
            "user_id": str(current_user.user_id),
            "status": "processing",
            "started_at": datetime.utcnow().isoformat(),
            "platforms": request.platforms
        }
        
        # Run in background
        async def background_search():
            try:
                results = await trending_service.search_trending(
                    keyword=request.keyword,
                    platforms=request.platforms,
                    limit_per_platform=request.limit_per_platform
                )
                # Store results in database or cache (implement this)
                print(f"Background search completed for task {task_id}")
            except Exception as e:
                print(f"Background search failed: {e}")
        
        background_tasks.add_task(background_search)
        
        return TrendingSearchResponse(
            task_id=task_id,
            status="processing",
            keyword=request.keyword,
            results={},
            summary={
                "total_results": 0,
                "platforms_searched": request.platforms,
                "top_score": 0,
                "average_score": 0
            },
            top_trending=[],
            platform_performance={}
        )
    
    # Run synchronously (but await the async method)
    results = await trending_service.search_trending(
        keyword=request.keyword,
        platforms=request.platforms,
        limit_per_platform=request.limit_per_platform
    )
    
    return TrendingSearchResponse(
        task_id=None,
        status="completed",
        keyword=request.keyword,
        results=results["results"],
        summary=results["summary"],
        top_trending=results.get("top_trending", []),
        platform_performance=results.get("platform_performance", {})
    )


@router.get("/platforms")
async def get_available_platforms():
    """Get list of available platforms for trending search"""
    return {
        "platforms": [
            {
                "id": "meta",
                "name": "Meta/Facebook Ads",
                "description": "Search Facebook/Instagram ads",
                "requires_auth": True
            },
            {
                "id": "reddit",
                "name": "Reddit",
                "description": "Search Reddit ads and posts",
                "requires_auth": False
            },
            {
                "id": "linkedin",
                "name": "LinkedIn",
                "description": "Search LinkedIn ads and posts",
                "requires_auth": True
            },
            {
                "id": "instagram",
                "name": "Instagram",
                "description": "Search Instagram posts and reels",
                "requires_auth": True,
                "note": "Limited to post URL lookup"
            },
            {
                "id": "youtube",
                "name": "YouTube",
                "description": "Search YouTube videos and shorts",
                "requires_auth": True,
                "note": "Limited to video URL lookup"
            }
        ]
    }


@router.get("/stats")
async def get_trending_stats(current_user: User = Depends(get_current_user)):
    """Get trending search statistics"""
    # In production, you'd fetch from database
    return {
        "user_id": str(current_user.user_id),
        "total_searches": 0,
        "most_searched_keywords": [],
        "top_platforms": [],
        "recent_searches": []
    }