# app/routers/proxy.py
"""Image proxy to bypass Instagram/CDN hotlinking restrictions."""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import httpx
from urllib.parse import urlparse

router = APIRouter()

ALLOWED_DOMAINS = (
    "cdninstagram.com",
    "fbcdn.net",
    "instagram.com",
)

PROXY_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.instagram.com/",
}


@router.get("/proxy-image")
async def proxy_image(url: str = Query(..., description="Image URL to proxy")):
    """Fetch image from allowed CDNs and stream to client to avoid CORS/hotlinking."""
    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL")

    if not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL")

    netloc_lower = parsed.netloc.lower()
    if not any(domain in netloc_lower for domain in ALLOWED_DOMAINS):
        raise HTTPException(status_code=403, detail="Domain not allowed")

    client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)
    try:
        req = client.build_request("GET", url, headers=PROXY_HEADERS)
        resp = await client.send(req, stream=True)
    except httpx.TimeoutException:
        await client.aclose()
        raise HTTPException(status_code=504, detail="Upstream timeout")
    except httpx.RequestError as e:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"Upstream error: {str(e)}")

    if resp.status_code != 200:
        await resp.aclose()
        await client.aclose()
        raise HTTPException(status_code=404, detail="Image fetch failed")

    content_type = resp.headers.get("content-type", "image/jpeg")
    if not content_type.startswith("image/"):
        content_type = "image/jpeg"

    async def stream_and_close():
        try:
            async for chunk in resp.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    return StreamingResponse(stream_and_close(), media_type=content_type)
