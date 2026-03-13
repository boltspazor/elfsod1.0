# app/services/ad_fetcher.py
import asyncio
import time
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from rapidfuzz import fuzz
from app.models import Competitor, Ad, AdFetch
from app.services.google_service import GoogleAdsService
from app.services.meta_service import MetaAdsService
from app.services.reddit_service import RedditAdsService
from app.services.linkedin_service import LinkedInAdsService
from app.services.youtube_service import YouTubeService
from app.services.instagram_service import InstagramService
from app.utils.logger import get_logger
from app.config import settings
from app.database import SessionLocal
from datetime import datetime
import json

# Create logger instance
logger = get_logger(__name__)

class AdFetcher:
    def __init__(self, db: Session, api_key: str):
        self.db = db
        self.api_key = api_key
        self.google_service = GoogleAdsService(api_key)
        self.meta_service = MetaAdsService(api_key)
        self.reddit_service = RedditAdsService(api_key)
        self.linkedin_service = LinkedInAdsService(api_key)
        self.youtube_service = YouTubeService(api_key)
        self.instagram_service = InstagramService(api_key)

    @staticmethod
    def _resolve_ad_url(ad_data: Dict[str, Any]) -> str | None:
        """Return the best available ad URL, preferring ad permalink over landing page."""
        permalink_candidates = [
            ad_data.get("ad_url"),
            ad_data.get("ad_link"),
            ad_data.get("permalink"),
            ad_data.get("url"),
        ]
        for candidate in permalink_candidates:
            if candidate and str(candidate).strip():
                return str(candidate).strip()

        for fallback in [ad_data.get("destination_url"), ad_data.get("link_url")]:
            if fallback and str(fallback).strip():
                return str(fallback).strip()

        return None

    @staticmethod
    def _advertiser_matches_competitor(advertiser: str, competitor: str) -> bool:
        """True if ad's advertiser/page name matches competitor (fuzzy; e.g. Zepto vs Zepto Technologies Pvt Ltd)."""
        if not advertiser or not competitor:
            return False
        a = str(advertiser).strip().lower()
        c = str(competitor).strip().lower()
        if not a or not c:
            return False
        score = fuzz.partial_ratio(a, c)
        return score >= 70
    
    async def fetch_competitor_ads(self, competitor_id: str, user_id: str,
                                  platforms: List[str] = None) -> Dict[str, Any]:
        """Fetch ads for a specific competitor across specified platforms"""
        request_start = time.perf_counter()
        logger.info("Fetching ads for competitor: %s", competitor_id)
        
        # Create ad fetch record
        ad_fetch = AdFetch(
            user_id=user_id,
            competitor_id=competitor_id,
            status="running",
            started_at=datetime.utcnow()
        )
        self.db.add(ad_fetch)
        self.db.commit()
        self.db.refresh(ad_fetch)
        
        competitor = None
        try:
            # Get competitor
            competitor = self.db.query(Competitor).filter(
                Competitor.id == competitor_id,
                Competitor.user_id == user_id
            ).first()
            
            if not competitor:
                raise ValueError("Competitor not found")
            
            # Default platforms if none specified
            if platforms is None:
                platforms = ["google", "meta", "reddit", "linkedin", "youtube", "instagram"]
            
            results = {
                "google": [],
                "meta": [],
                "reddit": [],
                "linkedin": [],
                "youtube": [],
                "instagram": []
            }

            async def _fetch_google() -> Tuple[str, Any]:
                t0 = time.perf_counter()
                try:
                    ads = await self.google_service.fetch_company_ads(competitor.domain)
                    logger.info("Google fetch took %.2fs for %s", time.perf_counter() - t0, competitor.name)
                    return ("google", ads)
                except Exception as e:
                    logger.error("Google ads fetch error: %s", e)
                    return ("google", e)

            async def _fetch_meta() -> Tuple[str, Any]:
                t0 = time.perf_counter()
                try:
                    meta_ads = await self.meta_service.fetch_company_ads(
                        company_name=competitor.name,
                        max_results=settings.MAX_ADS_PER_COMPETITOR,
                    )
                    if not meta_ads:
                        meta_ads = await self.meta_service.search_ads(
                            keyword=competitor.name,
                            max_results=settings.MAX_ADS_PER_COMPETITOR,
                        )
                    already_official = 0
                    promoted_count = 0
                    for ad in meta_ads:
                        adv = ad.get("advertiser")
                        comp_name = competitor.name
                        if ad.get("is_official"):
                            already_official += 1
                        elif self._advertiser_matches_competitor(adv or "", comp_name or ""):
                            ad["is_official"] = True
                            promoted_count += 1
                    logger.info(
                        "Meta promotion summary for %s: %d ads, %d already official, %d promoted",
                        competitor.name, len(meta_ads), already_official, promoted_count,
                    )
                    logger.info("Meta fetch took %.2fs for %s", time.perf_counter() - t0, competitor.name)
                    return ("meta", meta_ads)
                except Exception as e:
                    logger.error("Meta ads fetch error: %s", e)
                    return ("meta", e)

            async def _fetch_reddit() -> Tuple[str, Any]:
                t0 = time.perf_counter()
                try:
                    ads = await self.reddit_service.search_ads(competitor.name)
                    logger.info("Reddit fetch took %.2fs for %s", time.perf_counter() - t0, competitor.name)
                    return ("reddit", ads)
                except Exception as e:
                    logger.error("Reddit ads fetch error: %s", e)
                    return ("reddit", e)

            async def _fetch_linkedin() -> Tuple[str, Any]:
                t0 = time.perf_counter()
                try:
                    ads = await self.linkedin_service.search_ads(competitor.name)
                    logger.info("LinkedIn fetch took %.2fs for %s", time.perf_counter() - t0, competitor.name)
                    return ("linkedin", ads)
                except Exception as e:
                    logger.error("LinkedIn ads fetch error: %s", e)
                    return ("linkedin", e)

            async def _fetch_youtube() -> Tuple[str, Any]:
                t0 = time.perf_counter()
                try:
                    ads = await self.youtube_service.search_videos(
                        query=competitor.name, max_results=15, include_extras=True
                    )
                    for ad in ads:
                        ad["platform"] = "youtube"
                        ad["headline"] = ad.get("title")
                        ad["description"] = ad.get("description") or ad.get("title")
                        ad["destination_url"] = ad.get("url")
                        ad["image_url"] = ad.get("thumbnail")
                        ad["views"] = ad.get("views", 0)
                        ad["impressions"] = ad.get("views", 0)
                    logger.info("YouTube fetch took %.2fs for %s", time.perf_counter() - t0, competitor.name)
                    return ("youtube", ads)
                except Exception as e:
                    logger.error("YouTube ads fetch error: %s", e)
                    return ("youtube", e)

            async def _fetch_instagram() -> Tuple[str, Any]:
                t0 = time.perf_counter()
                try:
                    ads = await self.instagram_service.search_reels(
                        query=competitor.name, max_results=15, page=1
                    )
                    for ad in ads:
                        ad["platform"] = "instagram"
                        ad["headline"] = ad.get("title")
                        ad["description"] = ad.get("description") or ad.get("title")
                        ad["destination_url"] = ad.get("url")
                        ad["image_url"] = ad.get("thumbnail")
                        ad["views"] = ad.get("views", 0)
                        ad["impressions"] = ad.get("views", 0)
                        ad["likes"] = ad.get("likes", 0)
                    logger.info("Instagram fetch took %.2fs for %s", time.perf_counter() - t0, competitor.name)
                    return ("instagram", ads)
                except Exception as e:
                    logger.error("Instagram ads fetch error: %s", e)
                    return ("instagram", e)

            platform_fetch_start = time.perf_counter()
            tasks: List[Any] = []
            if "google" in platforms and competitor.domain:
                tasks.append(_fetch_google())
            if "meta" in platforms:
                tasks.append(_fetch_meta())
            if "reddit" in platforms:
                tasks.append(_fetch_reddit())
            if "linkedin" in platforms:
                tasks.append(_fetch_linkedin())
            if "youtube" in platforms:
                tasks.append(_fetch_youtube())
            if "instagram" in platforms:
                tasks.append(_fetch_instagram())

            gathered = await asyncio.gather(*tasks, return_exceptions=True)
            for out in gathered:
                if isinstance(out, Exception):
                    continue
                platform_key, value = out
                if isinstance(value, Exception):
                    logger.error("%s fetch failed: %s", platform_key, value)
                else:
                    results[platform_key] = value
            logger.info(
                "Platform fetch total %.2fs for %s",
                time.perf_counter() - platform_fetch_start,
                competitor.name,
            )

            # Load existing ads once for this competitor to avoid per-ad DB round-trips
            db_start = time.perf_counter()
            existing_ads = self.db.query(Ad).filter(
                Ad.competitor_id == competitor.id
            ).all()
            existing_map = {(ad.platform, ad.platform_ad_id): ad for ad in existing_ads}

            total_ads_processed = 0
            new_ads_count = 0
            updated_ads_count = 0

            for platform, ads in results.items():
                if not ads:
                    continue

                for ad_data in ads:
                    raw_id = ad_data.get("id")
                    if not raw_id:
                        logger.warning(
                            "Ad missing stable ID, skipping",
                            extra={"platform": platform, "ad_data": ad_data},
                        )
                        continue
                    platform_ad_id = str(raw_id)
                    existing_ad = existing_map.get((platform, platform_ad_id))
                    
                    if existing_ad:
                        # UPDATE existing ad
                        existing_ad.last_seen = datetime.utcnow()
                        existing_ad.is_active = True
                        
                        # Update fields that might have changed
                        if ad_data.get("impressions") or ad_data.get("views"):
                            existing_ad.impressions = ad_data.get("impressions") or ad_data.get("views")
                        
                        if ad_data.get("spend") is not None:
                            existing_ad.spend = ad_data.get("spend")
                        
                        # Optional: Update other mutable fields
                        headline = ad_data.get("headline") or ad_data.get("title")
                        if headline and headline != existing_ad.headline:
                            existing_ad.headline = headline
                        
                        description = ad_data.get("description")
                        if description and description != existing_ad.description:
                            existing_ad.description = description
                        
                        destination_url = self._resolve_ad_url(ad_data)
                        if destination_url and destination_url != existing_ad.destination_url:
                            existing_ad.destination_url = destination_url
                        
                        # Always apply is_official from payload: allow False→True upgrade, never downgrade
                        incoming_official = ad_data.get("is_official")
                        if incoming_official is not None:
                            existing_ad.is_official = (
                                existing_ad.is_official or bool(incoming_official)
                            )
                        
                        updated_ads_count += 1
                        
                    else:
                        # INSERT new ad
                        ad = Ad(
                            competitor_id=competitor.id,
                            platform=platform,
                            platform_ad_id=platform_ad_id,
                            headline=ad_data.get("headline") or ad_data.get("title"),
                            description=ad_data.get("description"),
                            full_text=ad_data.get("full_text") or ad_data.get("description"),
                            destination_url=self._resolve_ad_url(ad_data),
                            image_url=ad_data.get("image_url") or ad_data.get("thumbnail"),
                            video_url=ad_data.get("video_url"),
                            format=ad_data.get("format") or ad_data.get("type"),
                            impressions=ad_data.get("impressions") or ad_data.get("views"),
                            spend=ad_data.get("spend"),
                            raw_data=json.dumps(ad_data, default=str),
                            is_active=True,
                            is_official=bool(ad_data.get("is_official", False)),
                            first_seen=datetime.utcnow(),
                            last_seen=datetime.utcnow()
                        )
                        self.db.add(ad)
                        new_ads_count += 1
                        existing_map[(platform, platform_ad_id)] = ad  # avoid duplicate in same batch
                    total_ads_processed += 1
            
            # Calculate actual ads count for competitor
            actual_ads_count = self.db.query(Ad).filter(
                Ad.competitor_id == competitor.id,
                Ad.is_active == True
            ).count()
            
            # Update competitor
            competitor.last_fetched_at = datetime.utcnow()
            competitor.ads_count = actual_ads_count
            competitor.last_fetch_status = "completed"
            
            # Update ad fetch record
            ad_fetch.status = "completed"
            ad_fetch.completed_at = datetime.utcnow()
            ad_fetch.total_ads_fetched = total_ads_processed
            ad_fetch.platforms_queried = json.dumps([p for p in platforms if results.get(p)])
            
            self.db.flush()
            self.db.commit()
            logger.info(
                "DB processing took %.2fs for %s",
                time.perf_counter() - db_start,
                competitor.name,
            )
            logger.info(
                "Ads saved for %s: %d new, %d updated, %d total active ads",
                competitor.name,
                new_ads_count,
                updated_ads_count,
                actual_ads_count,
            )
            
            # Build platform results summary
            platform_summary = {}
            for platform, ads in results.items():
                if ads:
                    platform_summary[platform] = len(ads)
            
            # Structured response: ensure results is a dict and compute total_ads for router
            results = results or {}
            total_ads = sum(len(v) for v in results.values())
            logger.info(
                "Competitor refresh completed in %.2fs for %s",
                time.perf_counter() - request_start,
                competitor.name,
            )
            return {
                "success": True,
                "competitor_id": competitor_id,
                "competitor_name": competitor.name,
                "total_ads_fetched": total_ads_processed,
                "total_ads": total_ads,
                "new_ads": new_ads_count,
                "updated_ads": updated_ads_count,
                "total_active_ads": actual_ads_count,
                "platforms": platform_summary,
                "results": results,
                "fetch_id": str(ad_fetch.id)
            }
            
        except Exception as e:
            logger.error(f"Error fetching ads: {e}", exc_info=True)
            
            # Rollback to avoid inconsistent state
            try:
                self.db.rollback()
            except:
                pass
            
            # Update ad fetch record with error
            ad_fetch.status = "failed"
            ad_fetch.completed_at = datetime.utcnow()
            ad_fetch.error_message = str(e)
            
            # Update competitor if exists
            if competitor:
                competitor.last_fetch_status = "failed"
            
            try:
                # Use a new session for error logging to avoid transaction issues
                self.db.add(ad_fetch)
                if competitor:
                    self.db.add(competitor)
                self.db.commit()
            except Exception as commit_error:
                logger.error(f"Failed to save error state: {commit_error}")
                try:
                    self.db.rollback()
                except:
                    pass
            
            return {
                "success": False,
                "error": str(e),
                "fetch_id": str(ad_fetch.id)
            }
    
    async def fetch_all_user_competitors(self, user_id: str, platforms: List[str] = None) -> List[Dict[str, Any]]:
        """Fetch ads for all active competitors of a user (concurrency-limited, no fixed delay)."""
        competitors = self.db.query(Competitor).filter(
            Competitor.user_id == user_id,
            Competitor.is_active == True
        ).all()
        if not competitors:
            return []

        semaphore = asyncio.Semaphore(3)

        async def process_one(comp: Competitor) -> Dict[str, Any]:
            async with semaphore:
                db = SessionLocal()
                try:
                    fetcher = AdFetcher(db, self.api_key)
                    return await fetcher.fetch_competitor_ads(str(comp.id), user_id, platforms)
                except Exception as e:
                    logger.error("Failed to fetch ads for competitor %s: %s", comp.name, e)
                    return {
                        "success": False,
                        "competitor_id": str(comp.id),
                        "competitor_name": comp.name,
                        "error": str(e),
                    }
                finally:
                    db.close()

        total_start = time.perf_counter()
        results = await asyncio.gather(*[process_one(c) for c in competitors])
        logger.info(
            "Refresh-all completed in %.2fs for %d competitors",
            time.perf_counter() - total_start,
            len(competitors),
        )
        return list(results)