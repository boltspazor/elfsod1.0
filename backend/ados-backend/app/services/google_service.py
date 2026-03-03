import requests
from typing import List, Dict, Any
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import asyncio

class GoogleAdsService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.scrapecreators.com/v1/google"
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
    
    async def fetch_company_ads(self, domain: str, max_ads: int = 50) -> List[Dict[str, Any]]:
        """Fetch Google ads for a company domain"""
        loop = asyncio.get_event_loop()
        
        # Discovery - get list of ads
        headers = {"x-api-key": self.api_key, "Accept": "application/json"}
        params = {"domain": domain, "get_ad_details": "false"}
        
        def fetch_discovery():
            response = self.session.get(
                f"{self.base_url}/company/ads",
                headers=headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data.get("ads", [])
        
        ads = await loop.run_in_executor(None, fetch_discovery)
        
        # Limit and format
        limited_ads = ads[:max_ads]
        formatted_ads = []
        
        for ad in limited_ads:
            formatted_ad = {
                "id": ad.get("creativeId"),
                "headline": ad.get("headline"),
                "description": ad.get("description"),
                "destination_url": ad.get("destinationUrl"),
                "image_url": ad.get("imageUrl"),
                "format": ad.get("format"),
                "advertiser": ad.get("advertiserName"),
                "platform": "google"
            }
            formatted_ads.append(formatted_ad)
        
        return formatted_ads