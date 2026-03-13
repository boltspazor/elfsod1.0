# app/utils/redis_client.py
"""Reusable Redis client for caching. Safe when REDIS_URL is unset or Redis is unavailable."""
import os
import logging

logger = logging.getLogger(__name__)

_redis_client = None


def get_redis_client():
    """Return a Redis client or None if REDIS_URL is not set or connection fails."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    url = os.getenv("REDIS_URL")
    if not url:
        logger.debug("REDIS_URL not set; trending cache disabled")
        return None
    try:
        import redis
        _redis_client = redis.Redis.from_url(url, decode_responses=True)
        _redis_client.ping()
        logger.info("Redis connected for trending cache")
        return _redis_client
    except Exception as e:
        logger.warning("Redis unavailable for trending cache: %s", e)
        return None


def trending_cache_key(keyword: str, platforms: list) -> str:
    """Normalized cache key for a single trending search. Platforms are sorted for consistency."""
    k = (keyword or "").strip().lower()
    platforms_str = ",".join(sorted(p.strip().lower() for p in platforms if p))
    return f"trending:{k}:{platforms_str}"


def trending_competitors_cache_key(competitor_names: list) -> str:
    """Normalized cache key for competitor list (e.g. for batch). Sorts names for consistency."""
    sorted_names = ",".join(sorted((n or "").strip().lower() for n in competitor_names if n))
    return f"trending:competitors:{sorted_names}"
