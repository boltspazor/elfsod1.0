# app/services/youtube_service.py
import requests
from typing import List, Dict, Any, Optional
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import asyncio

class YouTubeService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.scrapecreators.com/v1/youtube/search"
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
    
    async def search_videos(self, query: str, max_results: int = 20, include_extras: bool = True) -> List[Dict[str, Any]]:
        """Search YouTube videos by query"""
        loop = asyncio.get_event_loop()
        
        headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}
        params = {
            "query": query,
            "includeExtras": str(include_extras).lower()
        }
        
        def fetch_videos():
            response = self.session.get(
                self.base_url,
                headers=headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            # Combine videos and shorts
            all_content = []
            if "videos" in data:
                all_content.extend(data["videos"])
            if "shorts" in data:
                all_content.extend(data["shorts"])
            
            return all_content[:max_results]
        
        raw_videos = await loop.run_in_executor(None, fetch_videos)
        
        # Format videos for trending analysis
        formatted_videos = []
        for video in raw_videos:
            # Determine if it's a short or regular video
            is_short = video.get("type") == "short"
            
            # Get engagement metrics (use available data)
            view_count = video.get("viewCountInt", 0)
            
            # Parse like and comment counts if include_extras is True
            like_count = 0
            comment_count = 0
            if include_extras and "likeCount" in video:
                like_count = video.get("likeCount", 0)
            if include_extras and "commentCount" in video:
                comment_count = video.get("commentCount", 0)
            
            # Calculate trending score (placeholder calculation)
            trending_score = self._calculate_trending_score(
                view_count, like_count, comment_count, is_short
            )
            
            formatted_video = {
                "id": video.get("id"),
                "title": video.get("title"),
                "description": video.get("description", "") if include_extras else "",
                "url": video.get("url"),
                "thumbnail": video.get("thumbnail"),
                "channel": video.get("channel", {}),
                "views": view_count,
                "likes": like_count,
                "comments": comment_count,
                "published_at": video.get("publishedTime"),
                "duration_seconds": video.get("lengthSeconds"),
                "type": "short" if is_short else "video",
                "platform": "youtube",
                "score": trending_score,  # Will be updated later with cross-platform ranking
                "rank": 0  # Will be updated later
            }
            formatted_videos.append(formatted_video)
        
        return formatted_videos
    
    def _calculate_trending_score(self, views: int, likes: int, comments: int, is_short: bool = False) -> float:
        """Calculate a trending score (0-100) based on engagement metrics"""
        if views == 0:
            return 0.0
        
        # Normalize metrics
        like_ratio = (likes / views) * 100 if views > 0 else 0
        comment_ratio = (comments / views) * 1000 if views > 0 else 0  # Multiply by 1000 since comments are rarer
        
        # Base score on view count with diminishing returns
        view_score = min(50, (views ** 0.3) / 10)  # Log scale for views
        
        # Engagement score
        engagement_score = like_ratio * 2 + comment_ratio * 5
        
        # Short bonus (shorts tend to have different engagement patterns)
        short_bonus = 10 if is_short else 0
        
        total_score = view_score + engagement_score + short_bonus
        
        return min(100.0, total_score)