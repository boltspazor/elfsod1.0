# app/services/trending_cache_service.py
"""Service to cache trending ads per category (24h TTL) with image validation."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import TrendingAdCache
from app.services.trending_service import TrendingSearchService
from app.utils.image_check import is_image_url_displayable

logger = logging.getLogger(__name__)

# Category -> search keyword for trending API
CATEGORY_KEYWORDS: Dict[str, str] = {
    "recommended": "trending ads",
    "sports": "Sports ads",
    "food": "Food ads",
    "fashion": "Fashion ads",
    "trending": "trending ads",
}

CACHE_TTL_HOURS = 24
PLATFORMS = ["meta", "instagram", "youtube"]
LIMIT_PER_PLATFORM = 5


def _get_image_url(item: Dict[str, Any]) -> Optional[str]:
    url = item.get("image_url") or item.get("thumbnail")
    if url and isinstance(url, str) and url.strip():
        return url.strip()
    return None


def _filter_ads_with_displayable_images(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keep only ads whose image_url/thumbnail is displayable."""
    out: List[Dict[str, Any]] = []
    for item in items:
        img_url = _get_image_url(item)
        if not img_url:
            continue
        if is_image_url_displayable(img_url):
            out.append(item)
        else:
            logger.debug("Skipping ad (image not displayable): %s", (item.get("title") or item.get("id") or "")[:60])
    return out


def _is_cache_stale(record: Optional[TrendingAdCache]) -> bool:
    if not record or not record.last_fetched_at:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
    last = record.last_fetched_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    return last < cutoff


def get_cached_ads(db: Session, category: str) -> List[Dict[str, Any]]:
    """Return list of cached ad dicts for category. Empty if missing."""
    record = db.query(TrendingAdCache).filter(TrendingAdCache.category == category).first()
    if not record:
        return []
    return list(record.ads_json or [])


async def get_or_refresh_cache(db: Session, category: str) -> List[Dict[str, Any]]:
    """
    Return cached ads for category. If cache is missing or older than 24h,
    refresh from trending API (with image validation) and return new list.
    """
    record = db.query(TrendingAdCache).filter(TrendingAdCache.category == category).first()
    if not _is_cache_stale(record):
        return list((record.ads_json or [])[:20])

    keyword = CATEGORY_KEYWORDS.get(category) or "trending ads"
    try:
        service = TrendingSearchService()
        result = await service.search_trending(
            keyword=keyword,
            platforms=PLATFORMS,
            limit_per_platform=LIMIT_PER_PLATFORM,
        )
    except Exception as e:
        logger.warning("Trending refresh failed for category=%s: %s", category, e)
        if record:
            return list((record.ads_json or [])[:20])
        return []

    raw_list = result.get("top_trending") or []
    if not isinstance(raw_list, list):
        raw_list = []
    filtered = _filter_ads_with_displayable_images(raw_list)[:20]

    now = datetime.now(timezone.utc)
    if record:
        record.ads_json = filtered
        record.last_fetched_at = now
        record.updated_at = now
    else:
        record = TrendingAdCache(
            category=category,
            ads_json=filtered,
            last_fetched_at=now,
        )
        db.add(record)
    db.commit()
    db.refresh(record)
    return list(record.ads_json or [])


async def get_all_categories_cached(db: Session) -> Dict[str, List[Dict[str, Any]]]:
    """Return cached ads for all known categories (recommended, sports, food, fashion, trending)."""
    out: Dict[str, List[Dict[str, Any]]] = {}
    for cat in CATEGORY_KEYWORDS:
        out[cat] = await get_or_refresh_cache(db, cat)
    return out
