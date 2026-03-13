# app/services/trending_service.py
from typing import Dict, List, Any, Optional, Tuple
import asyncio
import logging
import os
import re
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


CATEGORY_DISCOVERY_QUERIES = {
    "fashion": [
        "zara",
        "h&m",
        "uniqlo",
        "fashion campaign",
        "new collection",
        "fashion drop",
        "designer collaboration",
    ],
    "shoes": [
        "nike",
        "adidas",
        "puma",
        "new balance",
        "hoka",
        "asics",
        "foot locker",
        "sneaker drop",
        "running shoes",
        "sneaker launch",
    ],
    "tech": [
        "apple",
        "samsung",
        "dell",
        "lenovo",
        "tech launch",
        "new gadget",
        "ai device",
        "smartphone launch",
    ],
    "cars": [
        "tesla",
        "bmw",
        "mercedes",
        "audi",
        "toyota",
        "car launch",
        "electric vehicle",
        "new suv",
    ],
    "home_decor": [
        "ikea",
        "home decor",
        "interior design",
        "furniture collection",
        "modern home",
    ],
    "fitness": [
        "gymshark",
        "fitness gear",
        "workout brand",
        "protein supplement",
        "fitness apparel",
    ],
    "beauty": [
        "sephora",
        "loreal",
        "fenty beauty",
        "makeup launch",
        "skincare routine",
    ],
    "travel": [
        "expedia",
        "booking.com",
        "trip advisor",
        "travel deals",
        "hotel deals",
        "vacation campaign",
    ],
    "ecommerce": [
        "shopify",
        "amazon deals",
        "black friday deal",
        "limited offer",
        "online store launch",
    ],
}


def _normalize_keyword_to_category_key(keyword: str) -> Optional[str]:
    """Map frontend category keywords to existing CATEGORY_DISCOVERY_QUERIES keys."""
    if not keyword or not isinstance(keyword, str):
        return None
    k = keyword.strip().lower()
    if not k:
        return None
    if k in ("shoes", "shoes ads", "shoe ads"):
        return "shoes"
    if k in ("fashion", "fashion ads") or "fashion" in k:
        return "fashion"
    if k in ("tech", "technology") or "tech" in k:
        return "tech"
    if k in ("cars", "car ads") or "car " in k or k.startswith("car "):
        return "cars"
    if "home" in k or "decor" in k or "furniture" in k:
        return "home_decor"
    if k in ("fitness", "fitness ads") or "fitness" in k:
        return "fitness"
    if k in ("beauty", "beauty ads") or "beauty" in k:
        return "beauty"
    if k in ("travel", "travel ads") or "travel" in k:
        return "travel"
    if "ecommerce" in k or "shopify" in k or "amazon" in k:
        return "ecommerce"
    return None


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

        # PART 2 + 4: Category expansion (only existing keys) + fetch more candidates per platform
        queries: List[str] = [keyword]
        keyword_key = (keyword or "").strip().lower()
        category_key = _normalize_keyword_to_category_key(keyword_key)
        if category_key and category_key in CATEGORY_DISCOVERY_QUERIES:
            queries = CATEGORY_DISCOVERY_QUERIES[category_key]
        elif keyword_key in CATEGORY_DISCOVERY_QUERIES:
            queries = CATEGORY_DISCOVERY_QUERIES[keyword_key]
        brand_terms_for_score: Optional[List[str]] = queries if len(queries) > 1 else None

        limit_per_platform = max(limit_per_platform, 50)

        request_start = time.perf_counter()

        # PART 3: Run ALL queries concurrently (each query runs platform tasks in parallel)
        async def fetch_one_query(query: str) -> List[Tuple[str, Any]]:
            tasks: List[Any] = []
            task_platforms: List[str] = []
            if "meta" in platforms and self.meta_service:
                tasks.append(self._search_meta(query, limit_per_platform))
                task_platforms.append("meta")
            if "reddit" in platforms and self.reddit_service:
                tasks.append(self._search_reddit(query, limit_per_platform))
                task_platforms.append("reddit")
            if "linkedin" in platforms and self.linkedin_service:
                tasks.append(self._search_linkedin(query, limit_per_platform))
                task_platforms.append("linkedin")
            if "youtube" in platforms and self.youtube_service:
                tasks.append(self._search_youtube(query, limit_per_platform))
                task_platforms.append("youtube")
            if "instagram" in platforms and self.instagram_service:
                tasks.append(self._search_instagram(query, limit_per_platform))
                task_platforms.append("instagram")
            if not tasks:
                return []
            query_results = await asyncio.gather(*tasks, return_exceptions=True)
            return list(zip(task_platforms, query_results))

        platform_fetch_start = time.perf_counter()
        all_query_results = await asyncio.gather(
            *[fetch_one_query(q) for q in queries],
            return_exceptions=True,
        )
        platform_fetch_elapsed = time.perf_counter() - platform_fetch_start
        logger.info("Trending platform fetch completed in %.2fs (%d queries)", platform_fetch_elapsed, len(queries))

        merged_by_platform: Dict[str, List[Dict[str, Any]]] = {
            "meta": [],
            "reddit": [],
            "linkedin": [],
            "youtube": [],
            "instagram": [],
        }
        for i, per_query in enumerate(all_query_results):
            if isinstance(per_query, Exception):
                logger.warning("Query %s failed: %s", queries[i] if i < len(queries) else i, per_query)
                continue
            for platform_name, result in per_query:
                if isinstance(result, Exception):
                    logger.warning("Error searching %s for query %s: %s", platform_name, queries[i] if i < len(queries) else "", result)
                    continue
                if result is None:
                    continue
                if not isinstance(result, list):
                    logger.warning("%s returned non-list result: %s", platform_name, type(result))
                    continue
                for ad in result:
                    if not isinstance(ad, dict):
                        continue
                    if "platform" not in ad:
                        ad["platform"] = platform_name
                    merged_by_platform[platform_name].append(ad)

        all_results = []
        for items in merged_by_platform.values():
            all_results.extend(items)

        # PART 5: Deduplicate ads by URL across all queries/platforms
        dedupe_start = time.perf_counter()
        count_before_dedupe = len(all_results)
        unique_ads: Dict[str, Dict[str, Any]] = {}
        for ad in all_results:
            url = ad.get("url")
            if url and url not in unique_ads:
                unique_ads[url] = ad
        all_results = list(unique_ads.values())
        logger.info("Deduplication completed in %.2fs (%d -> %d ads)", time.perf_counter() - dedupe_start, count_before_dedupe, len(all_results))

        # Re-bucket by platform after global dedupe
        platform_results: Dict[str, List[Dict[str, Any]]] = {
            "meta": [],
            "reddit": [],
            "linkedin": [],
            "youtube": [],
            "instagram": [],
        }
        for ad in all_results:
            p = self._safe_str(ad.get("platform", "")).lower()
            if p in platform_results:
                platform_results[p].append(ad)

        # Apply filters + scoring per platform (keeps response structure unchanged)
        scoring_start = time.perf_counter()
        for platform_name, result in platform_results.items():
            processed_items: List[Dict[str, Any]] = []
            for item in result:
                    if not isinstance(item, dict):
                        continue

                    # 90-day filter: only keep ads we can confirm are within the last 90 days
                    created_at = item.get("created_at") or item.get("published_at") or item.get("taken_at")
                    if not created_at:
                        continue
                    try:
                        if isinstance(created_at, str):
                            if "Z" in created_at:
                                created_at = created_at.replace("Z", "+00:00")
                            dt = datetime.fromisoformat(created_at)
                        else:
                            dt = created_at
                        if getattr(dt, "tzinfo", None) is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        now = datetime.now(timezone.utc)
                        days_old = (now - dt).total_seconds() / 86400
                        if days_old > 90:
                            continue
                    except Exception:
                        continue

                    # High bar: keep only 100k+ views OR 50k+ likes (top reach / engagement)
                    likes = self._safe_int(item.get("likes") or item.get("upvotes") or item.get("like_count"))
                    if likes < 0:
                        likes = 0
                    comments = self._safe_int(item.get("comments") or item.get("comment_count"))
                    shares = self._safe_int(item.get("shares") or item.get("share_count"))
                    views = self._safe_int(item.get("views") or item.get("video_view_count"))
                    if views < 100000 and likes < 50000:
                        continue
                    engagement = likes + comments + shares

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
                    
                    # Exclude listicle / "top brands" style content (not real ads)
                    if self._is_listicle_or_top_brands(item):
                        continue
                    
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
                        item["score"] = self._calculate_item_score(item, keyword, brand_terms_for_score)

                    # Ensure platform field
                    if "platform" not in item:
                        item["platform"] = platform_name

                    # PART 5: Tag high performing ads
                    engagement_rate = 0.0
                    if views > 0:
                        engagement_rate = engagement / views
                    if engagement_rate > 0.03 and views > 100000:
                        item["high_performing"] = True

                    # Keep existing "viral" field, but base it on high score (velocity is no longer used)
                    item["viral"] = item.get("score", 0) >= 90

                    processed_items.append(item)
            platform_results[platform_name] = processed_items

        logger.info("Scoring/filtering completed in %.2fs", time.perf_counter() - scoring_start)

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

        total_elapsed = time.perf_counter() - request_start
        logger.info("Trending search completed in %.2fs (keyword=%s)", total_elapsed, keyword)

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

    def _is_listicle_or_top_brands(self, item: Dict[str, Any]) -> bool:
        """True if title/description look like listicle or 'top brands' content (not real ads)."""
        title = self._safe_str(item.get("title", "")).lower()
        desc = self._safe_str(item.get("description", "")).lower()
        text = f"{title} {desc}"
        listicle_phrases = (
            "top 10", "top 5", "top 20", "top 15", "top 50",
            "best brands", "top brands", "biggest brands", "most popular brands",
            "list of", "listicle", "brands that", "best 10", "worst 10",
            "ranking of", "brand ranking", "top companies", "best companies",
        )
        return any(phrase in text for phrase in listicle_phrases)

    def _calculate_engagement_velocity(self, item: Dict[str, Any]) -> float:
        """
        Engagement velocity = engagement per hour since post.
        Critical for detecting trending content. Returns 0 if time missing.
        """
        likes = self._safe_int(item.get("likes") or item.get("upvotes") or item.get("like_count") or 0)
        comments = self._safe_int(item.get("comments") or item.get("comment_count") or 0)
        shares = self._safe_int(item.get("shares") or item.get("share_count") or 0)
        engagement = likes + comments + shares

        created_at = item.get("created_at") or item.get("published_at") or item.get("taken_at")
        if not created_at:
            return 0.0
        try:
            if isinstance(created_at, str):
                if "Z" in created_at:
                    created_at = created_at.replace("Z", "+00:00")
                dt = datetime.fromisoformat(created_at)
            else:
                dt = created_at
            if getattr(dt, "tzinfo", None) is None:
                dt = dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            hours = (now - dt).total_seconds() / 3600
            if hours < 1:
                hours = 1
            return engagement / hours
        except (ValueError, TypeError):
            return 0.0

    def _calculate_keyword_relevance(self, item: Dict[str, Any], keyword: str) -> float:
        """Calculate keyword relevance score so ads matching the search query rank higher."""
        if not keyword:
            return 0.0
        keyword = keyword.strip().lower()
        if not keyword:
            return 0.0
        title = self._safe_str(item.get("title", "")).lower()
        description = self._safe_str(item.get("description", "")).lower()
        score = 0.0
        if keyword in title:
            score += 10
        if keyword in description:
            score += 5
        keyword_tokens = keyword.split()
        for token in keyword_tokens:
            if token in title:
                score += 3
            elif token in description:
                score += 1
        return min(score, 15.0)

    def _calculate_item_score(self, item: Dict[str, Any], keyword: str = "", brand_terms: Optional[List[str]] = None) -> float:
        """Calculate score for recent high-performing ads (past 90 days)."""
        # Extract engagement metrics (raw counts); treat negative (e.g. Instagram hidden likes) as 0
        likes = self._safe_int(item.get("likes") or item.get("upvotes") or item.get("like_count") or 0)
        if likes < 0:
            likes = 0
        comments = self._safe_int(item.get("comments") or item.get("comment_count") or 0)
        shares = self._safe_int(item.get("shares") or item.get("share_count") or 0)
        engagement = likes + comments + shares

        # No artificial floor — zero engagement => score 0
        if engagement == 0:
            return 0.0

        # Views and engagement rate
        views = self._safe_int(item.get("views") or item.get("video_view_count") or 0)
        engagement_rate = 0.0
        if views > 0:
            engagement_rate = engagement / views

        # Platform and quality bonuses
        platform = self._safe_str(item.get("platform", "")).lower()
        platform_bonus = self._get_platform_bonus(platform, item)
        quality_bonus = self._calculate_quality_bonus(item)
        keyword_bonus = self._calculate_keyword_relevance(item, keyword)

        # Brand-match bonus when we expanded from a category (top brands rank higher)
        brand_bonus = 0.0
        if brand_terms:
            title = self._safe_str(item.get("title", "")).lower()
            desc = self._safe_str(item.get("description", "")).lower()
            owner = item.get("owner") or item.get("channel") or {}
            owner_name = self._safe_str(owner.get("username") or owner.get("name") if isinstance(owner, dict) else "").lower()
            text = f"{title} {desc} {owner_name}"
            for term in brand_terms[:20]:  # cap to avoid cost
                t = self._safe_str(term).strip().lower()
                if t and t in text:
                    brand_bonus += 5
                    break  # one bonus per item for any matching brand
            brand_bonus = min(brand_bonus, 10.0)

        # PART 4: Performance score (engagement strength + engagement rate + reach)
        performance_score = 0.0
        performance_score += min(50.0, (engagement ** 0.4) * 4)

        if engagement_rate > 0.05:
            performance_score += 30
        elif engagement_rate > 0.03:
            performance_score += 20
        elif engagement_rate > 0.01:
            performance_score += 10

        if views > 1000000:
            performance_score += 15
        elif views > 500000:
            performance_score += 10
        elif views > 100000:
            performance_score += 5

        score = performance_score + platform_bonus + quality_bonus + keyword_bonus + brand_bonus
        return min(100.0, max(0.0, score))

    def _calculate_recency_decay(self, item: Dict[str, Any]) -> float:
        """Apply a decay multiplier so older posts lose ranking power."""
        created_at = item.get("created_at") or item.get("published_at") or item.get("taken_at")

        if not created_at:
            return 0.7

        try:
            if isinstance(created_at, str):
                if "Z" in created_at:
                    created_at = created_at.replace("Z", "+00:00")
                dt = datetime.fromisoformat(created_at)
            else:
                dt = created_at

            now = datetime.now(timezone.utc)
            hours = (now - dt).total_seconds() / 3600

            if hours < 24:
                return 1.0
            elif hours < 72:
                return 0.85
            elif hours < 168:
                return 0.7
            elif hours < 720:
                return 0.5
            else:
                return 0.3

        except Exception:
            return 0.7
    
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