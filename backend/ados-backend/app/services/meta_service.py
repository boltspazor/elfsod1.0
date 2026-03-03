import requests
from typing import List, Dict, Any
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import asyncio

class MetaAdsService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads"
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
    
    async def search_ads(self, keyword: str, max_results: int = 20) -> List[Dict[str, Any]]:
        """Search Meta ads by keyword"""
        loop = asyncio.get_event_loop()
        
        headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}
        params = {
            "query": keyword,
            "search_type": "keyword_unordered",
            "ad_type": "all",
            "country": "US",
            "status": "ALL",
            "media_type": "ALL",
            "trim": "false"
        }
        
        def fetch_ads():
            response = self.session.get(
                self.base_url,
                headers=headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data.get("searchResults", [])
        
        raw_ads = await loop.run_in_executor(None, fetch_ads)
        
        # Format ads
        formatted_ads = []
        for ad in raw_ads[:max_results]:
            snapshot = ad.get("snapshot", {})
            
            # Extract text
            ad_text = None
            if "body" in snapshot and snapshot["body"]:
                if isinstance(snapshot["body"], dict):
                    ad_text = snapshot["body"].get("text")
                else:
                    ad_text = snapshot["body"]
            
            # Extract images
            image_url = None
            images = snapshot.get("images", [])
            if images:
                image_url = images[0].get("resized_image_url") or images[0].get("original_image_url")
            
            formatted_ad = {
                "id": ad.get("ad_archive_id"),
                "headline": snapshot.get("title"),
                "description": ad_text,
                "destination_url": snapshot.get("link_url"),
                "image_url": image_url,
                "impressions": ad.get("impressions_with_index", {}).get("impressions_text"),
                "spend": ad.get("spend"),
                "advertiser": snapshot.get("page_name"),
                "platform": "meta"
            }
            formatted_ads.append(formatted_ad)
        
        return formatted_ads