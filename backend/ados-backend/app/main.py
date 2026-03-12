from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.middleware.wsgi import WSGIMiddleware
from authservice.auth import app as flask_auth_app
from app.config import settings
from app.database import engine, Base
from app.routers import (
    users,
    competitors,
    ads,
    platforms,
    metrics,
    trending,
    targ_intel,
    sum_metrics,
    video_analysis,
    brand_identity,
    campaign_ads,
    proxy,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
logger.info(f"🌍 CORS allowed origins: {settings.ALLOWED_ORIGINS}")



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting ADOS Ad Surveillance API")

    # NOTE:
    # In production, DO NOT auto-create tables.
    # Use Alembic migrations instead.
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"⚠️ Could not connect to database on startup: {e}")
        logger.warning("App will start without DB — requests needing DB will fail until it's reachable")

    yield

    # Shutdown
    logger.info("🛑 Shutting down ADOS API")


app = FastAPI(
    title="ADOS Ad Surveillance API",
    description="Track competitor ads across multiple platforms",
    version="1.0.0",
    lifespan=lifespan,
)

# --------------------
# CORS Middleware
# --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------
# Routers (NO AUTH ROUTER)
# --------------------
# 🔐 Authentication is handled by Flask (external service)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(competitors.router, prefix="/api/competitors", tags=["competitors"])
app.include_router(ads.router, prefix="/api/ads", tags=["ads"])
app.include_router(platforms.router, prefix="/api/platforms", tags=["platforms"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(trending.router, prefix="/api/trending", tags=["trending"])
app.include_router(targ_intel.router, prefix="/api/targ-intel", tags=["Targeting Intelligence"])
app.include_router(sum_metrics.router, prefix="/api/sum-metrics", tags=["Summary Metrics"])
app.include_router(video_analysis.router, prefix="/api/video-analysis", tags=["Video Analysis"])
app.include_router(brand_identity.router, prefix="/api/brand-identity", tags=["Brand Identity"])
app.include_router(campaign_ads.router, prefix="/api/campaign-ads", tags=["Campaign Ads"])
app.include_router(proxy.router, tags=["Proxy"])
app.mount("/auth", WSGIMiddleware(flask_auth_app))


# --------------------
# Root & Health
# --------------------
@app.get("/")
async def root():
    return {
        "message": "ADOS Ad Surveillance API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ados-backend",
    }


@app.get("/api/endpoints")
async def list_endpoints():
    """List all available API endpoints"""
    endpoints = []
    for route in app.routes:
        if hasattr(route, "methods"):
            endpoints.append(
                {
                    "path": route.path,
                    "methods": list(route.methods),
                    "name": route.name,
                }
            )
    return endpoints
