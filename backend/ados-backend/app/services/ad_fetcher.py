# app/services/ad_fetcher.py
import asyncio
from typing import List, Dict, Any
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
        logger.info(f"Fetching ads for competitor: {competitor_id}")
        
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
            
            # Fetch from Google (if domain exists and Google is selected)
            if "google" in platforms and competitor.domain:
                try:
                    google_ads = await self.google_service.fetch_company_ads(competitor.domain)
                    results["google"] = google_ads
                    logger.info(f"Fetched {len(google_ads)} Google ads for {competitor.name}")
                except Exception as e:
                    logger.error(f"Google ads fetch error: {e}")
            
            # Fetch from Meta (company ads first, then keyword search fallback)
            if "meta" in platforms:
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
                    # Promote to official when advertiser/page name matches competitor (fuzzy)
                    already_official = 0
                    promoted_count = 0
                    for ad in meta_ads:
                        adv = ad.get("advertiser")
                        comp_name = competitor.name
                        logger.debug(
                            "Meta advertiser promotion check competitor=%s advertiser=%s is_official_before=%s",
                            comp_name,
                            adv,
                            ad.get("is_official"),
                            extra={
                                "competitor": comp_name,
                                "advertiser": adv,
                                "is_official_before": ad.get("is_official"),
                            },
                        )
                        score = (
                            fuzz.partial_ratio(
                                (adv or "").strip().lower(),
                                (comp_name or "").strip().lower(),
                            )
                            if adv and comp_name
                            else 0
                        )
                        promoted = False
                        if ad.get("is_official"):
                            already_official += 1
                        elif self._advertiser_matches_competitor(adv or "", comp_name or ""):
                            ad["is_official"] = True
                            promoted = True
                            promoted_count += 1
                            logger.debug(
                                "Meta ad promoted to official competitor=%s advertiser=%s ad_id=%s",
                                comp_name,
                                adv,
                                ad.get("id"),
                                extra={
                                    "competitor": comp_name,
                                    "advertiser": adv,
                                    "ad_id": ad.get("id"),
                                },
                            )
                        logger.debug(
                            "Advertiser match check competitor=%s advertiser=%s score=%s promoted=%s",
                            comp_name,
                            adv,
                            score,
                            promoted,
                            extra={
                                "competitor": comp_name,
                                "advertiser": adv,
                                "fuzzy_match_score": score,
                                "promoted_to_official": promoted,
                            },
                        )
                    logger.info(
                        "Meta promotion summary for %s: %d ads, %d already official, %d promoted to official",
                        competitor.name,
                        len(meta_ads),
                        already_official,
                        promoted_count,
                    )
                    results["meta"] = meta_ads
                    logger.info(f"Fetched {len(meta_ads)} Meta ads for {competitor.name}")
                except Exception as e:
                    logger.error(f"Meta ads fetch error: {e}")
            
            # Fetch from Reddit
            if "reddit" in platforms:
                try:
                    reddit_ads = await self.reddit_service.search_ads(competitor.name)
                    results["reddit"] = reddit_ads
                    logger.info(f"Fetched {len(reddit_ads)} Reddit ads for {competitor.name}")
                except Exception as e:
                    logger.error(f"Reddit ads fetch error: {e}")
            
            # Fetch from LinkedIn
            if "linkedin" in platforms:
                try:
                    linkedin_ads = await self.linkedin_service.search_ads(competitor.name)
                    results["linkedin"] = linkedin_ads
                    logger.info(f"Fetched {len(linkedin_ads)} LinkedIn ads for {competitor.name}")
                except Exception as e:
                    logger.error(f"LinkedIn ads fetch error: {e}")
            
            # Fetch from YouTube
            if "youtube" in platforms:
                try:
                    youtube_ads = await self.youtube_service.search_videos(
                        query=competitor.name,
                        max_results=15,
                        include_extras=True
                    )
                    # Format YouTube ads to match our schema
                    for ad in youtube_ads:
                        ad["platform"] = "youtube"
                        ad["headline"] = ad.get("title")
                        ad["description"] = ad.get("description") or ad.get("title")
                        ad["destination_url"] = ad.get("url")
                        ad["image_url"] = ad.get("thumbnail")
                        ad["views"] = ad.get("views", 0)
                        ad["impressions"] = ad.get("views", 0)  # Use views as impressions
                    
                    results["youtube"] = youtube_ads
                    logger.info(f"Fetched {len(youtube_ads)} YouTube videos for {competitor.name}")
                except Exception as e:
                    logger.error(f"YouTube ads fetch error: {e}")
            
            # Fetch from Instagram
            if "instagram" in platforms:
                try:
                    instagram_ads = await self.instagram_service.search_reels(
                        query=competitor.name,
                        max_results=15,
                        page=1
                    )
                    # Format Instagram ads to match our schema
                    for ad in instagram_ads:
                        ad["platform"] = "instagram"
                        ad["headline"] = ad.get("title")
                        ad["description"] = ad.get("description") or ad.get("title")
                        ad["destination_url"] = ad.get("url")
                        ad["image_url"] = ad.get("thumbnail")
                        ad["views"] = ad.get("views", 0)
                        ad["impressions"] = ad.get("views", 0)  # Use views as impressions
                        ad["likes"] = ad.get("likes", 0)
                    
                    results["instagram"] = instagram_ads
                    logger.info(f"Fetched {len(instagram_ads)} Instagram reels for {competitor.name}")
                except Exception as e:
                    logger.error(f"Instagram ads fetch error: {e}")
            
            # Save ads to database with deduplication
            total_ads_processed = 0
            new_ads_count = 0
            updated_ads_count = 0
            
            for platform, ads in results.items():
                if not ads:
                    continue
                    
                for ad_data in ads:
                    # Stable platform_ad_id required; normalize to string (no hash fallback)
                    raw_id = ad_data.get("id")
                    if not raw_id:
                        logger.warning(
                            "Ad missing stable ID, skipping",
                            extra={"platform": platform, "ad_data": ad_data},
                        )
                        continue
                    platform_ad_id = str(raw_id)
                    
                    # Check if ad already exists for this competitor + platform + platform_ad_id
                    existing_ad = self.db.query(Ad).filter(
                        Ad.competitor_id == competitor.id,
                        Ad.platform == platform,
                        Ad.platform_ad_id == platform_ad_id
                    ).first()
                    
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
            
            self.db.flush()  # ensure is_official and other updates are written
            self.db.commit()
            
            logger.info(f"Ads saved for {competitor.name}: {new_ads_count} new, {updated_ads_count} updated, {actual_ads_count} total active ads")
            
            # Build platform results summary
            platform_summary = {}
            for platform, ads in results.items():
                if ads:
                    platform_summary[platform] = len(ads)
            
            # Structured response: ensure results is a dict and compute total_ads for router
            results = results or {}
            total_ads = sum(len(v) for v in results.values())
            
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
        """Fetch ads for all active competitors of a user"""
        competitors = self.db.query(Competitor).filter(
            Competitor.user_id == user_id,
            Competitor.is_active == True
        ).all()
        
        results = []
        for competitor in competitors:
            try:
                result = await self.fetch_competitor_ads(str(competitor.id), user_id, platforms)
                results.append(result)
                # Small delay between competitors to avoid rate limiting
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Failed to fetch ads for competitor {competitor.name}: {e}")
                results.append({
                    "success": False,
                    "competitor_id": str(competitor.id),
                    "competitor_name": competitor.name,
                    "error": str(e)
                })
        
        return results