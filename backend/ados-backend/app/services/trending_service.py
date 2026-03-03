# app/services/trending_service.py
from typing import Dict, List, Any, Optional
import asyncio
import os
import re
from datetime import datetime, timezone


class TrendingSearchService:
    def __init__(self):
        # Try to get API key from config or environment
        try:
            self.api_key = "fmwCF2KKhHcgGyyKUJd9U6W1TTw2"
        except ImportError:
            self.api_key = os.getenv("SCRAPECREATORS_API_KEY")
        
        if not self.api_key:
            print("⚠️  WARNING: SCRAPECREATORS_API_KEY not found. Trending search may not work.")
        
        # Initialize services only if API key exists
        if self.api_key:
            try:
                from .meta_service import MetaAdsService
                from .reddit_service import RedditAdsService
                from .linkedin_service import LinkedInAdsService
                from .youtube_service import YouTubeService
                from .instagram_service import InstagramService
                
                self.meta_service = MetaAdsService(self.api_key)
                self.reddit_service = RedditAdsService(self.api_key)
                self.linkedin_service = LinkedInAdsService(self.api_key)
                self.youtube_service = YouTubeService(self.api_key)
                self.instagram_service = InstagramService(self.api_key)
            except ImportError as e:
                print(f"⚠️  WARNING: Failed to import some services: {e}")
                # Set services to None
                self.meta_service = None
                self.reddit_service = None
                self.linkedin_service = None
                self.youtube_service = None
                self.instagram_service = None
        else:
            # Set services to None if no API key
            self.meta_service = None
            self.reddit_service = None
            self.linkedin_service = None
            self.youtube_service = None
            self.instagram_service = None
    
    async def search_trending(self, keyword: str, platforms: List[str], 
                            limit_per_platform: int = 5) -> Dict[str, Any]:
        """Search trending content across multiple platforms"""
        # Check if API key is available
        if not self.api_key:
            return {
                "task_id": None,
                "status": "failed",
                "keyword": keyword,
                "results": {},
                "summary": {
                    "total_results": 0,
                    "platforms_searched": platforms,
                    "top_score": 0,
                    "average_score": 0
                },
                "top_trending": [],
                "platform_performance": {},
                "error": "API key not configured."
            }
        
        tasks = []
        
        if "meta" in platforms and self.meta_service:
            tasks.append(self._search_meta(keyword, limit_per_platform))
        else:
            tasks.append(self._return_empty_list())
        
        if "reddit" in platforms and self.reddit_service:
            tasks.append(self._search_reddit(keyword, limit_per_platform))
        else:
            tasks.append(self._return_empty_list())
        
        if "linkedin" in platforms and self.linkedin_service:
            tasks.append(self._search_linkedin(keyword, limit_per_platform))
        else:
            tasks.append(self._return_empty_list())
        
        if "youtube" in platforms and self.youtube_service:
            tasks.append(self._search_youtube(keyword, limit_per_platform))
        else:
            tasks.append(self._return_empty_list())
        
        if "instagram" in platforms and self.instagram_service:
            tasks.append(self._search_instagram(keyword, limit_per_platform))
        else:
            tasks.append(self._return_empty_list())
        
        # Execute all searches concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        platform_results = {}
        result_list = [
            ("meta", results[0]),
            ("reddit", results[1]),
            ("linkedin", results[2]),
            ("youtube", results[3]),
            ("instagram", results[4])
        ]
        
        for platform_name, result in result_list:
            if isinstance(result, Exception):
                print(f"Error searching {platform_name}: {result}")
                platform_results[platform_name] = []
            elif result is None:
                # Handle None result
                print(f"Warning: {platform_name} returned None")
                platform_results[platform_name] = []
            else:
                # Ensure result is a list
                if not isinstance(result, list):
                    print(f"Warning: {platform_name} returned non-list result: {type(result)}")
                    platform_results[platform_name] = []
                    continue
                
                # Ensure all items have required fields
                processed_items = []
                for item in result:
                    if not isinstance(item, dict):
                        continue
                    
                    # Ensure item has title field (required by schema)
                    if "title" not in item:
                        # Try to get title from other fields - SAFELY handle None
                        headline = item.get("headline")
                        description = item.get("description")
                        
                        if headline:
                            item["title"] = str(headline)[:100]
                        elif description:
                            item["title"] = str(description)[:100]
                        else:
                            item["title"] = f"{platform_name} content"
                    
                    # Clean up impressions field - handle string values like "<100"
                    if "impressions" in item and isinstance(item["impressions"], str):
                        item["impressions"] = self._parse_impressions_string(item["impressions"])
                    
                    # Clean up views field if it's a string
                    if "views" in item and isinstance(item["views"], str):
                        item["views"] = self._safe_int(item["views"])
                    
                    # Clean up spend field if it's a string
                    if "spend" in item and isinstance(item["spend"], str):
                        item["spend"] = self._parse_float(item["spend"])
                    
                    # Ensure item has score field
                    if "score" not in item:
                        item["score"] = self._calculate_item_score(item)
                    
                    # Ensure platform field
                    if "platform" not in item:
                        item["platform"] = platform_name
                    
                    processed_items.append(item)
                
                platform_results[platform_name] = processed_items
        
        # Calculate cross-platform rankings
        all_items = []
        for platform, items in platform_results.items():
            for item in items:
                all_items.append(item)
        
        # Sort by score and add ranks
        all_items.sort(key=lambda x: x.get("score", 0), reverse=True)
        for i, item in enumerate(all_items):
            item["rank"] = i + 1
        
        # Calculate platform performance
        platform_performance = {}
        for platform, items in platform_results.items():
            if items:
                avg_score = sum(item.get("score", 0) for item in items) / len(items)
                platform_performance[platform] = round(avg_score, 2)
            else:
                platform_performance[platform] = 0.0
        
        # Get top trending items
        top_trending = all_items[:10] if all_items else []
        
        return {
            "task_id": None,
            "status": "completed",
            "keyword": keyword,
            "results": platform_results,
            "summary": {
                "total_results": sum(len(items) for items in platform_results.values()),
                "platforms_searched": platforms,
                "top_score": all_items[0]["score"] if all_items else 0,
                "average_score": sum(item.get("score", 0) for item in all_items) / len(all_items) if all_items else 0
            },
            "top_trending": top_trending,
            "platform_performance": platform_performance
        }
    
    async def _return_empty_list(self) -> List[Dict[str, Any]]:
        """Return empty list for disabled platforms"""
        return []
    
    async def _search_meta(self, keyword: str, limit: int) -> List[Dict[str, Any]]:
        """Search Meta/Facebook ads"""
        try:
            ads = await self.meta_service.search_ads(keyword=keyword, max_results=limit)
            return ads if ads is not None else []
        except Exception as e:
            print(f"Meta search error: {e}")
            return []
    
    async def _search_reddit(self, keyword: str, limit: int) -> List[Dict[str, Any]]:
        """Search Reddit ads"""
        try:
            ads = await self.reddit_service.search_ads(query=keyword)
            return ads[:limit] if ads is not None else []
        except Exception as e:
            print(f"Reddit search error: {e}")
            return []
    
    async def _search_linkedin(self, keyword: str, limit: int) -> List[Dict[str, Any]]:
        """Search LinkedIn ads"""
        try:
            ads = await self.linkedin_service.search_ads(company=keyword, max_ads=limit)
            return ads if ads is not None else []
        except Exception as e:
            print(f"LinkedIn search error: {e}")
            return []
    
    async def _search_youtube(self, keyword: str, limit: int) -> List[Dict[str, Any]]:
        """Search YouTube for trending videos"""
        try:
            videos = await self.youtube_service.search_videos(
                query=keyword, 
                max_results=limit,
                include_extras=True
            )
            return videos if videos is not None else []
        except Exception as e:
            print(f"YouTube search error: {e}")
            return []
    
    async def _search_instagram(self, keyword: str, limit: int) -> List[Dict[str, Any]]:
        """Search Instagram for trending reels"""
        try:
            reels = await self.instagram_service.search_reels(
                query=keyword,
                max_results=limit,
                page=1
            )
            return reels if reels is not None else []
        except Exception as e:
            print(f"Instagram search error: {e}")
            return []
    
    def _parse_impressions_string(self, value: str) -> int:
        """Parse impressions string like '<100' or '1,000-5,000' to integer"""
        if not value or not isinstance(value, str):
            return 0
        
        value = value.strip().lower()
        
        # Handle "<100" format
        if value.startswith('<'):
            # Extract the number after '<'
            num_str = re.sub(r'[^\d]', '', value[1:])
            if num_str:
                num = int(num_str)
                # For "<100", return a reasonable estimate like 50
                return num // 2
        
        # Handle ">1M" format
        if value.startswith('>'):
            value = value[1:].strip()
        
        # Handle "1,000-5,000" format
        if '-' in value:
            parts = value.split('-')
            if len(parts) == 2:
                # Take the average of the range
                try:
                    start = self._safe_int(parts[0])
                    end = self._safe_int(parts[1])
                    return (start + end) // 2
                except:
                    pass
        
        # Handle normal numbers with commas
        return self._safe_int(value)
    
    def _parse_float(self, value) -> Optional[float]:
        """Safely parse float values"""
        if value is None:
            return None
        
        try:
            if isinstance(value, str):
                # Remove currency symbols and commas
                value = re.sub(r'[^\d.]', '', value)
                if value:
                    return float(value)
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_int(self, value) -> int:
        """Safely convert value to integer"""
        if value is None:
            return 0
        
        try:
            # Handle strings
            if isinstance(value, str):
                value = value.strip()
                
                # Handle special cases first
                if value.startswith('<') or value.startswith('>'):
                    return self._parse_impressions_string(value)
                
                # Remove commas and non-numeric characters (keep decimal points)
                value_clean = re.sub(r'[^\d.]', '', value)
                if value_clean:
                    return int(float(value_clean))
                else:
                    # Check for K, M, B suffixes
                    value_lower = value.lower()
                    if 'k' in value_lower:
                        num_str = re.sub(r'[^\d.]', '', value_lower.replace('k', ''))
                        if num_str:
                            return int(float(num_str) * 1000)
                    elif 'm' in value_lower:
                        num_str = re.sub(r'[^\d.]', '', value_lower.replace('m', ''))
                        if num_str:
                            return int(float(num_str) * 1000000)
                    elif 'b' in value_lower:
                        num_str = re.sub(r'[^\d.]', '', value_lower.replace('b', ''))
                        if num_str:
                            return int(float(num_str) * 1000000000)
                    return 0
            
            # Handle other types
            return int(float(value))
        except (ValueError, TypeError):
            return 0
    
    def _safe_str(self, value, default: str = "") -> str:
        """Safely convert value to string"""
        if value is None:
            return default
        try:
            return str(value)
        except:
            return default
    
    def _safe_slice(self, value, length: int) -> str:
        """Safely slice a string"""
        if value is None:
            return ""
        try:
            return str(value)[:length]
        except:
            return ""
    
    def _calculate_item_score(self, item: Dict[str, Any]) -> float:
        """Calculate trending score based on available metrics (ignoring unreliable impressions)"""
        # Extract all possible engagement metrics
        likes = self._safe_int(item.get("likes") or item.get("upvotes") or item.get("like_count") or 0)
        comments = self._safe_int(item.get("comments") or item.get("comment_count") or 0)
        shares = self._safe_int(item.get("shares") or item.get("share_count") or 0)
        
        # Get views but don't rely heavily on them (they might be unreliable)
        views = self._safe_int(item.get("views") or item.get("video_view_count") or 0)
        
        # Calculate engagement score (primary metric)
        # Comments are worth 5x likes, shares are worth 3x likes
        total_engagement = likes + (comments * 5) + (shares * 3)
        
        # Base score from engagement (logarithmic scale)
        if total_engagement > 0:
            engagement_score = min(70, (total_engagement ** 0.4) * 3)
        else:
            engagement_score = 10  # Minimum base score
        
        # Add view bonus if views seem reasonable (not < 100)
        if views > 100:
            view_bonus = min(15, (views ** 0.3))
            engagement_score += view_bonus
        
        # Add recency bonus
        recency_bonus = self._calculate_recency_bonus(item)
        engagement_score += recency_bonus
        
        # Add platform-specific bonus
        platform = self._safe_str(item.get("platform", "")).lower()
        platform_bonus = self._get_platform_bonus(platform, item)
        engagement_score += platform_bonus
        
        # Add content quality bonus
        quality_bonus = self._calculate_quality_bonus(item)
        engagement_score += quality_bonus
        
        # Ensure score is between 0-100
        return min(100.0, max(0, engagement_score))
    
    def _calculate_recency_bonus(self, item: Dict[str, Any]) -> float:
        """Calculate bonus based on content recency"""
        created_at = item.get("created_at") or item.get("published_at") or item.get("taken_at")
        if not created_at:
            return 0
        
        try:
            if isinstance(created_at, str):
                # Parse ISO format string
                if 'Z' in created_at:
                    created_at = created_at.replace('Z', '+00:00')
                dt = datetime.fromisoformat(created_at)
            else:
                dt = created_at
            
            now = datetime.now(timezone.utc)
            hours_ago = (now - dt).total_seconds() / 3600
            
            # Recency bonus decays over time
            if hours_ago < 1:    # < 1 hour
                return 15
            elif hours_ago < 24:  # < 1 day
                return 10
            elif hours_ago < 168: # < 1 week
                return 5
            elif hours_ago < 720: # < 1 month
                return 2
            else:
                return 0
        except:
            return 0
    
    def _get_platform_bonus(self, platform: str, item: Dict[str, Any]) -> float:
        """Calculate platform-specific bonus"""
        platform_bonuses = {
            "youtube": 5,
            "instagram": 8,
            "tiktok": 10,
            "meta": 3,
            "facebook": 3,
            "reddit": 6,
            "linkedin": 2,
        }
        
        bonus = platform_bonuses.get(platform, 0)
        
        # Additional bonus for video content
        if item.get("type") in ["video", "reel", "short"]:
            bonus += 3
        
        return bonus
    
    def _calculate_quality_bonus(self, item: Dict[str, Any]) -> float:
        """Calculate bonus based on content quality indicators"""
        bonus = 0
        
        # Title/description quality
        title = self._safe_str(item.get("title", ""))
        description = self._safe_str(item.get("description", ""))
        
        if title and len(title) > 10:
            bonus += 2
        if description and len(description) > 50:
            bonus += 3
        
        # Media presence
        if item.get("image_url") or item.get("thumbnail"):
            bonus += 2
        if item.get("video_url"):
            bonus += 3
        
        # URL presence
        if item.get("url"):
            bonus += 1
        
        # Channel/owner info
        if item.get("channel") or item.get("owner"):
            bonus += 2
        
        return bonus