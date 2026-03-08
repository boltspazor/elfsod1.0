# app/utils/ad_link_parser.py
"""Parse ad/content URLs from major platforms and return platform + external_id."""
import re
from typing import Optional
from urllib.parse import urlparse, parse_qs


# Supported platforms and their URL patterns (order can matter for overlapping domains)
PLATFORM_PATTERNS = [
    ("facebook", [
        r"facebook\.com/ads/library/\?id=(\d+)",
        r"fb\.com/ads/library/\?id=(\d+)",
        r"facebook\.com/.*[?&]id=(\d+)",
    ]),
    ("instagram", [
        r"instagram\.com/p/([A-Za-z0-9_-]+)",
        r"instagram\.com/reel/([A-Za-z0-9_-]+)",
        r"instagr\.am/p/([A-Za-z0-9_-]+)",
        r"instagr\.am/reel/([A-Za-z0-9_-]+)",
    ]),
    ("tiktok", [
        r"tiktok\.com/@[^/]+/video/(\d+)",
        r"tiktok\.com/t/([A-Za-z0-9]+)",
        r"vm\.tiktok\.com/([A-Za-z0-9]+)",
    ]),
    ("youtube", [
        r"youtube\.com/watch\?v=([A-Za-z0-9_-]+)",
        r"youtu\.be/([A-Za-z0-9_-]+)",
        r"youtube\.com/shorts/([A-Za-z0-9_-]+)",
    ]),
    ("linkedin", [
        r"linkedin\.com/feed/update/urn:li:activity:(\d+)",
        r"linkedin\.com/posts/[^/]+_([A-Za-z0-9-]+)",
        r"linkedin\.com/posts/.*activity-(\d+)",
    ]),
    ("twitter", [
        r"(?:twitter|x)\.com/[^/]+/status/(\d+)",
    ]),
]


def parse_ad_link(url: str) -> Optional[tuple[str, str]]:
    """
    Parse a supported ad/content URL. Returns (platform, external_id) or None if unsupported.
    """
    if not url or not url.strip():
        return None
    s = url.strip()
    if not s.startswith(("http://", "https://")):
        s = "https://" + s
    try:
        parsed = urlparse(s)
        host = (parsed.netloc or "").lower()
        path = parsed.path or ""
        query = parse_qs(parsed.query)
        full_url = f"{parsed.scheme}://{host}{path}"
        if query:
            full_url += "?" + parsed.query
    except Exception:
        return None

    for platform, patterns in PLATFORM_PATTERNS:
        for pattern in patterns:
            m = re.search(pattern, full_url, re.IGNORECASE)
            if m:
                return (platform, m.group(1))

    # Fallback: Facebook-style id= in query
    if "facebook.com" in host or "fb.com" in host:
        for key in ("id", "ID"):
            if key in query and query[key]:
                return ("facebook", str(query[key][0]))
    return None
