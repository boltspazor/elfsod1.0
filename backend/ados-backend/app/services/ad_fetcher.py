# app/services/ad_fetcher.py
import asyncio
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Competitor, Ad, AdFetch
from app.services.google_service import GoogleAdsService
from app.services.meta_service import MetaAdsService
from app.services.reddit_service import RedditAdsService
from app.services.linkedin_service import LinkedInAdsService
from app.services.youtube_service import YouTubeService
from app.services.instagram_service import InstagramService
from app.utils.logger import get_logger
from datetime import datetime
import json
import hashlib

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
            
            # Fetch from Meta
            if "meta" in platforms:
                try:
                    meta_ads = await self.meta_service.search_ads(
                        keyword=competitor.name,
                        max_results=20
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
                    # Generate stable platform_ad_id
                    platform_ad_id = ad_data.get("id")
                    if not platform_ad_id:
                        # Create a stable hash for the ad data
                        ad_str = json.dumps(ad_data, sort_keys=True, default=str)
                        platform_ad_id = hashlib.md5(ad_str.encode()).hexdigest()
                    
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
                        
                        destination_url = ad_data.get("destination_url") or ad_data.get("url")
                        if destination_url and destination_url != existing_ad.destination_url:
                            existing_ad.destination_url = destination_url
                        
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
                            destination_url=ad_data.get("destination_url") or ad_data.get("url"),
                            image_url=ad_data.get("image_url") or ad_data.get("thumbnail"),
                            video_url=ad_data.get("video_url"),
                            format=ad_data.get("format") or ad_data.get("type"),
                            impressions=ad_data.get("impressions") or ad_data.get("views"),
                            spend=ad_data.get("spend"),
                            raw_data=json.dumps(ad_data, default=str),
                            is_active=True,
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
            
            self.db.commit()
            
            logger.info(f"Ads saved for {competitor.name}: {new_ads_count} new, {updated_ads_count} updated, {actual_ads_count} total active ads")
            
            # Build platform results summary
            platform_summary = {}
            for platform, ads in results.items():
                if ads:
                    platform_summary[platform] = len(ads)
            
            return {
                "success": True,
                "competitor_id": competitor_id,
                "competitor_name": competitor.name,
                "total_ads_fetched": total_ads_processed,
                "new_ads": new_ads_count,
                "updated_ads": updated_ads_count,
                "total_active_ads": actual_ads_count,
                "platforms": platform_summary,
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