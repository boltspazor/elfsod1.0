# app/services/instagram_service.py
import requests
from typing import List, Dict, Any, Optional
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import asyncio

class InstagramService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.scrapecreators.com/v2/instagram/reels/search"
        self.session = self._create_session()
    
    def _create_session(self):
        session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"],
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount("https://", adapter)
        return session
    
    async def search_reels(self, query: str, max_results: int = 20, page: int = 1) -> List[Dict[str, Any]]:
        """Search Instagram reels by query"""
        loop = asyncio.get_event_loop()
        
        headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}
        params = {
            "query": query,
            "page": page
        }
        
        def fetch_reels():
            response = self.session.get(
                self.base_url,
                headers=headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data.get("reels", [])
        
        raw_reels = await loop.run_in_executor(None, fetch_reels)
        
        # Format reels for trending analysis
        formatted_reels = []
        for reel in raw_reels[:max_results]:
            # Get engagement metrics
            view_count = reel.get("video_view_count", reel.get("video_play_count", 0))
            like_count = reel.get("like_count", 0)
            comment_count = reel.get("comment_count", 0)
            
            # Calculate trending score
            trending_score = self._calculate_trending_score(
                view_count, like_count, comment_count
            )
            
            # Extract caption (first 200 chars)
            caption = reel.get("caption", "")
            if caption and len(caption) > 200:
                caption = caption[:200] + "..."
            
            formatted_reel = {
                "id": reel.get("id"),
                "title": caption or "Instagram Reel",  # Use caption as title
                "description": caption,
                "url": reel.get("url"),
                "thumbnail": reel.get("thumbnail_src"),
                "video_url": reel.get("video_url"),
                "views": view_count,
                "likes": like_count,
                "comments": comment_count,
                "published_at": reel.get("taken_at"),
                "owner": reel.get("owner", {}),
                "duration_seconds": reel.get("video_duration"),
                "type": "reel",
                "platform": "instagram",
                "score": trending_score,  # Will be updated later with cross-platform ranking
                "rank": 0  # Will be updated later
            }
            formatted_reels.append(formatted_reel)
        
        return formatted_reels
    
    def _calculate_trending_score(self, views: int, likes: int, comments: int) -> float:
        """Calculate a trending score (0-100) based on engagement metrics"""
        if views == 0:
            return 0.0
        
        # Normalize metrics (Instagram typically has higher like ratios)
        like_ratio = (likes / views) * 100 if views > 0 else 0
        comment_ratio = (comments / views) * 1000 if views > 0 else 0
        
        # Base score on view count
        view_score = min(40, (views ** 0.3) / 8)  # Instagram reels often have high views
        
        # Engagement score (Instagram typically has high engagement)
        engagement_score = like_ratio * 3 + comment_ratio * 8
        
        total_score = view_score + engagement_score
        
        return min(100.0, total_score)