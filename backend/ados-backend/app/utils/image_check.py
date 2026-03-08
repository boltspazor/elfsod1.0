# app/utils/image_check.py
"""Validate that an image URL is displayable (returns 200 and image content-type)."""
import logging
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# Allow list of content-type prefixes that are displayable images in browser
IMAGE_CONTENT_TYPES = (
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/x-icon",
)

TIMEOUT = 8
MAX_REDIRECTS = 3


def is_image_url_displayable(url: Optional[str]) -> bool:
    """
    Return True if the URL returns 200 and a displayable image content-type.
    Used to filter trending ads so only those with loadable images are stored/shown.
    """
    if not url or not isinstance(url, str) or not url.strip().startswith(("http://", "https://")):
        return False
    url = url.strip()
    try:
        # HEAD first to avoid downloading body; some servers don't support HEAD
        resp = requests.head(
            url,
            timeout=TIMEOUT,
            allow_redirects=True,
            max_redirects=MAX_REDIRECTS,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ElfsodTrending/1.0)"},
        )
        if resp.status_code != 200:
            # Fallback: GET with stream (only read headers)
            resp = requests.get(
                url,
                timeout=TIMEOUT,
                stream=True,
                allow_redirects=True,
                max_redirects=MAX_REDIRECTS,
                headers={"User-Agent": "Mozilla/5.0 (compatible; ElfsodTrending/1.0)"},
            )
            if resp.status_code != 200:
                return False
        content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if any(content_type.startswith(t) for t in IMAGE_CONTENT_TYPES):
            return True
        # Some CDNs return generic octet-stream for images
        if content_type in ("application/octet-stream", "binary/octet-stream"):
            return True
        return False
    except Exception as e:
        logger.debug("Image check failed for %s: %s", url[:80], e)
        return False
