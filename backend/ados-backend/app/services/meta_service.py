import requests
from typing import List, Dict, Any, Optional
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import asyncio
from datetime import datetime, timezone

class MetaAdsService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.search_url = "https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads"
        self.company_ads_url = "https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads"
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

    def _format_raw_ad(self, ad: Dict[str, Any]) -> Dict[str, Any]:
        """Format one raw Meta Ad Library item (search or company ads) to our schema."""
        snapshot = ad.get("snapshot", {})
        ad_text = None
        if "body" in snapshot and snapshot["body"]:
            if isinstance(snapshot["body"], dict):
                ad_text = snapshot["body"].get("text")
            else:
                ad_text = snapshot["body"]
        image_url = None
        images = snapshot.get("images", [])
        if images:
            image_url = images[0].get("resized_image_url") or images[0].get("original_image_url")
        published_at = None
        if ad.get("start_date"):
            try:
                dt = datetime.fromtimestamp(ad["start_date"], tz=timezone.utc)
                published_at = dt.isoformat()
            except (TypeError, ValueError, OSError):
                pass
        if not published_at and ad.get("end_date"):
            try:
                dt = datetime.fromtimestamp(ad["end_date"], tz=timezone.utc)
                published_at = dt.isoformat()
            except (TypeError, ValueError, OSError):
                pass
        formatted = {
            "id": ad.get("ad_archive_id"),
            "headline": snapshot.get("title"),
            "description": ad_text,
            "destination_url": ad.get("url") or snapshot.get("link_url"),
            "image_url": image_url,
            "impressions": ad.get("impressions_with_index", {}).get("impressions_text"),
            "spend": ad.get("spend"),
            "advertiser": snapshot.get("page_name") or ad.get("page_name"),
            "platform": "meta"
        }
        if published_at:
            formatted["published_at"] = published_at
        return formatted
    
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
                self.search_url,
                headers=headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data.get("searchResults", [])

        raw_ads = await loop.run_in_executor(None, fetch_ads)
        formatted_ads = [self._format_raw_ad(ad) for ad in raw_ads[:max_results]]
        return formatted_ads

    async def fetch_company_ads(
        self, company_name: str, max_results: int = 50, cursor: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch ads run by a specific company from Meta Ad Library (company/ads endpoint)."""
        loop = asyncio.get_event_loop()
        headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}
        all_formatted: List[Dict[str, Any]] = []
        next_cursor = cursor

        def fetch_page(c: Optional[str]):
            params = {
                "companyName": company_name,
                "country": "US",
                "status": "ALL",
            }
            if c:
                params["cursor"] = c
            response = self.session.get(
                self.company_ads_url,
                headers=headers,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

        while len(all_formatted) < max_results:
            need = max_results - len(all_formatted)
            data = await loop.run_in_executor(None, lambda c=next_cursor: fetch_page(c))
            results = data.get("results", [])
            for ad in results:
                if len(all_formatted) >= max_results:
                    break
                all_formatted.append(self._format_raw_ad(ad))
            next_cursor = data.get("cursor") or data.get("next_cursor")
            if not next_cursor or not results:
                break

        return all_formatted