import requests
import json
from typing import List, Dict, Any
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import asyncio

class LinkedInAdsService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.scrapecreators.com/v1/linkedin/ads/search"
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
    
    async def search_ads(self, company: str, max_ads: int = 20) -> List[Dict[str, Any]]:
        """Search LinkedIn ads by company"""
        loop = asyncio.get_event_loop()
        
        headers = {"x-api-key": self.api_key, "Accept": "application/json"}
        params = {"company": company}
        
        def fetch_ads():
            response = self.session.get(
                self.base_url,
                headers=headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data.get("ads", [])
        
        raw_ads = await loop.run_in_executor(None, fetch_ads)
        
        # Format ads
        formatted_ads = []
        for ad in raw_ads[:max_ads]:
            formatted_ad = {
                "id": ad.get("id"),
                "headline": ad.get("headline"),
                "description": ad.get("description"),
                "destination_url": ad.get("destinationUrl"),
                "image_url": ad.get("imageUrl"),
                "format": ad.get("format"),
                "platform": "linkedin"
            }
            formatted_ads.append(formatted_ad)
        
        return formatted_ads