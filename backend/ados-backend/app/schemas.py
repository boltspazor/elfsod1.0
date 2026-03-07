from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.utils.validators import validate_email, validate_url, validate_domain
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from decimal import Decimal
import uuid
# Trending Ads Schemas
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ================ AUTHENTICATION SCHEMAS ================

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')
        return v
    
    @validator('email')
    def validate_email_format(cls, v):
        if not validate_email(v):
            raise ValueError('Invalid email format')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    user_id: UUID
    created_at: datetime
    is_active: bool
    email_verified: bool
    business_type: Optional[str] = None
    industry: Optional[str] = None
    goals: Optional[str] = None
    onboarding_completed: bool
    
    class Config:
        from_attributes = True  # For SQLAlchemy compatibility

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: UUID
    email: str
    name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[UUID] = None

# ================ COMPETITOR SCHEMAS ================

class CompetitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    domain: Optional[str] = None
    industry: Optional[str] = None
    estimated_monthly_spend: Optional[float] = None
    
    @validator('domain')
    def validate_domain(cls, v):
        if v and not validate_domain(v):
            raise ValueError('Invalid domain format')
        return v

class CompetitorCreate(CompetitorBase):
    pass

class CompetitorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    domain: Optional[str] = None
    industry: Optional[str] = None
    estimated_monthly_spend: Optional[float] = None
    is_active: Optional[bool] = None
    
    @validator('domain')
    def validate_domain(cls, v):
        if v and not validate_domain(v):
            raise ValueError('Invalid domain format')
        return v

class CompetitorResponse(CompetitorBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    is_active: bool
    last_fetched_at: Optional[datetime] = None
    ads_count: int = 0
    last_fetch_status: str = "pending"
    
    class Config:
        from_attributes = True

# ================ AD SCHEMAS ================

class AdBase(BaseModel):
    platform: str
    platform_ad_id: str
    headline: Optional[str] = None
    description: Optional[str] = None
    full_text: Optional[str] = None
    destination_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    format: Optional[str] = None
    impressions: Optional[int] = None
    spend: Optional[float] = None
    is_active: bool = True
    
    @validator('destination_url', 'image_url', 'video_url')
    def validate_urls(cls, v):
        if v and not validate_url(v):
            raise ValueError('Invalid URL format')
        return v

class AdCreate(AdBase):
    competitor_id: UUID


from datetime import datetime
from typing import Optional

class AdResponse(BaseModel):
    id: UUID
    competitor_id: UUID
    platform: str

    headline: Optional[str] = None
    description: Optional[str] = None
    full_text: Optional[str] = None
    destination_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    format: Optional[str] = None
    impressions: Optional[str] = None
    spend: Optional[str] = None
    is_active: Optional[bool] = True
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    created_at: Optional[datetime] = None
    platform_ad_id: Optional[str] = None
    competitor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AdFetchBase(BaseModel):
    competitor_id: UUID

class AdFetchResponse(BaseModel):
    id: UUID
    user_id: UUID
    competitor_id: UUID
    competitor_name: Optional[str] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_ads_fetched: int = 0
    platforms_queried: Optional[str] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True

# ================ PLATFORM SCHEMAS ================

class PlatformAdFetchRequest(BaseModel):
    competitor_id: UUID
    platforms: List[str] = ["google", "meta", "reddit", "linkedin","instagram","youtube"]
    
    @validator('platforms')
    def validate_platforms(cls, v):
        valid_platforms = ["google", "meta", "reddit", "linkedin","instagram","youtube"]
        for platform in v:
            if platform not in valid_platforms:
                raise ValueError(f'Invalid platform: {platform}. Must be one of {valid_platforms}')
        return v

class PlatformAd(BaseModel):
    id: str
    headline: Optional[str] = None
    description: Optional[str] = None
    full_text: Optional[str] = None
    destination_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    format: Optional[str] = None
    impressions: Optional[str] = None
    spend: Optional[str] = None
    advertiser: Optional[str] = None
    platform: str
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    
    @validator('destination_url', 'image_url', 'video_url')
    def validate_urls(cls, v):
        if v and not validate_url(v):
            raise ValueError('Invalid URL format')
        return v

class PlatformAdFetchResponse(BaseModel):
    success: bool
    competitor_id: UUID
    competitor_name: str
    platform: str
    ads_fetched: int
    ads: List[PlatformAd]
    fetch_duration: Optional[float] = None
    error: Optional[str] = None

# ================ USER PROFILE SCHEMAS ================

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    business_type: Optional[str] = None
    industry: Optional[str] = None
    goals: Optional[str] = None

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')
        return v

# ================ DASHBOARD SCHEMAS ================

class DashboardStats(BaseModel):
    total_competitors: int
    total_ads: int
    active_competitors: int
    recent_fetches: int
    last_fetch_time: Optional[datetime] = None

class CompetitorStats(BaseModel):
    competitor_id: UUID
    competitor_name: str
    total_ads: int
    last_fetched: Optional[datetime] = None
    platforms: List[str]
    estimated_monthly_spend: Optional[float] = None

# ================ ERROR SCHEMAS ================

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

class ValidationError(BaseModel):
    loc: List[str]
    msg: str
    type: str

class HTTPValidationError(BaseModel):
    detail: List[ValidationError]


# ================ Metrics SCHEMAS ================

class MetricsBase(BaseModel):
    time_period: str = Field(..., description="daily, weekly, monthly, all_time")
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class MetricsCreate(MetricsBase):
    competitor_id: uuid.UUID

class MetricsUpdate(BaseModel):
    # Add fields that can be updated if needed
    pass

class MetricsResponse(MetricsBase):
    id: uuid.UUID
    competitor_id: uuid.UUID
    calculated_at: datetime
    
    # Basic Metrics
    total_ads: Optional[int] = None
    active_ads: Optional[int] = None
    ads_per_platform: Optional[Dict[str, int]] = None
    
    # Spend Metrics
    estimated_daily_spend: Optional[Decimal] = None
    estimated_weekly_spend: Optional[Decimal] = None
    estimated_monthly_spend: Optional[Decimal] = None
    total_spend: Optional[Decimal] = None
    
    # Performance Metrics
    avg_cpm: Optional[Decimal] = None
    avg_cpc: Optional[Decimal] = None
    avg_ctr: Optional[Decimal] = None
    avg_frequency: Optional[Decimal] = None
    conversion_probability: Optional[Decimal] = None
    
    # Creative Metrics
    creative_performance: Optional[Dict[str, Any]] = None
    top_performing_creatives: Optional[List[Dict[str, Any]]] = None
    
    # Funnel & Audience
    funnel_stage_distribution: Optional[Dict[str, float]] = None
    audience_clusters: Optional[List[Dict[str, Any]]] = None
    
    # Geo & Device Metrics
    geo_penetration: Optional[Dict[str, float]] = None
    device_distribution: Optional[Dict[str, float]] = None
    
    # Time-based Metrics
    time_of_day_heatmap: Optional[Dict[str, float]] = None
    ad_timeline: Optional[List[Dict[str, Any]]] = None
    
    # Derived Insights
    trends: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None
    risk_score: Optional[int] = None
    opportunity_score: Optional[int] = None
    
    class Config:
        from_attributes = True

class MetricsSummary(BaseModel):
    competitor_id: uuid.UUID
    competitor_name: str
    last_calculated: datetime
    active_ads: int
    estimated_monthly_spend: Decimal
    avg_ctr: Decimal
    risk_score: int
    opportunity_score: int

class CalculateMetricsRequest(BaseModel):
    competitor_ids: Optional[List[uuid.UUID]] = None  # If None, calculate for all user's competitors
    time_period: str = "weekly"  # daily, weekly, monthly, all_time
    force_recalculate: bool = False


class PlatformResult(BaseModel):
    """Result from a single platform"""
    platform: str
    id: str
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail: Optional[str] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    impressions: Optional[int] = None
    spend: Optional[float] = None
    created_at: Optional[datetime] = None
    score: Optional[float] = None
    rank: Optional[int] = None
    type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None



# ================ Trending SCHEMAS ================

class PlatformResult(BaseModel):
    """Result from a single platform"""
    platform: str
    id: str
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail: Optional[str] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    impressions: Optional[int] = None
    spend: Optional[float] = None
    created_at: Optional[datetime] = None
    score: Optional[float] = None
    rank: Optional[int] = None
    type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class TrendingSearchRequest(BaseModel):
    """Request schema for trending search"""
    keyword: str = Field(..., min_length=2, max_length=100, description="Search keyword")
    platforms: List[str] = Field(
        default=["meta", "reddit", "linkedin", "instagram", "youtube"],
        description="Platforms to search"
    )
    limit_per_platform: int = Field(default=5, ge=1, le=50, description="Max results per platform")
    async_mode: bool = Field(default=False, description="Run search asynchronously")

    @validator('platforms')
    def validate_platforms(cls, v):
        valid_platforms = ["meta", "reddit", "linkedin", "instagram", "youtube"]
        invalid_platforms = [p for p in v if p not in valid_platforms]
        if invalid_platforms:
            raise ValueError(f"Invalid platforms: {invalid_platforms}. Valid: {valid_platforms}")
        return v


class TrendingSummary(BaseModel):
    """Summary of trending search results"""
    total_results: int = Field(..., description="Total number of results")
    platforms_searched: List[str] = Field(..., description="Platforms that were searched")
    top_score: float = Field(..., description="Highest trending score")
    average_score: float = Field(..., description="Average trending score across all results")
    search_duration: Optional[float] = Field(None, description="Time taken for search in seconds")

    class Config:
        from_attributes = True


class TrendingSearchResponse(BaseModel):
    """Response schema for trending search"""
    task_id: Optional[str] = Field(None, description="Task ID for async operations")
    status: str = Field(..., description="Search status: completed, processing, failed")
    keyword: str = Field(..., description="Search keyword")
    results: Dict[str, List[PlatformResult]] = Field(
        ..., 
        description="Results organized by platform"
    )
    summary: TrendingSummary = Field(..., description="Search summary")
    top_trending: List[PlatformResult] = Field(
        ..., 
        description="Top trending items across all platforms"
    )
    platform_performance: Dict[str, float] = Field(
        ..., 
        description="Average trending score per platform"
    )
    search_timestamp: datetime = Field(default_factory=datetime.utcnow, description="When search was performed")

    class Config:
        from_attributes = True


class PlatformInfo(BaseModel):
    """Information about a search platform"""
    id: str = Field(..., description="Platform identifier")
    name: str = Field(..., description="Platform display name")
    description: str = Field(..., description="Platform description")
    requires_auth: bool = Field(..., description="Whether platform requires authentication")
    note: Optional[str] = Field(None, description="Additional notes about the platform")

    class Config:
        from_attributes = True


class TrendingStatsResponse(BaseModel):
    """Statistics for trending searches"""
    user_id: str = Field(..., description="User ID")
    total_searches: int = Field(..., description="Total number of searches performed")
    most_searched_keywords: List[Dict[str, Any]] = Field(
        ..., 
        description="Most frequently searched keywords"
    )
    top_platforms: List[Dict[str, Any]] = Field(
        ..., 
        description="Most frequently used platforms"
    )
    recent_searches: List[Dict[str, Any]] = Field(
        ..., 
        description="Recent search history"
    )

    class Config:
        from_attributes = True

# ================ TARGETING INTEL SCHEMAS ================

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class TargIntelBase(BaseModel):
    competitor_id: UUID
    age_range: Optional[str] = None
    primary_gender: Optional[str] = None
    primary_location: Optional[str] = None
    income_level: Optional[str] = None
    funnel_stage: Optional[str] = None
    audience_type: Optional[str] = None
    bidding_strategy: Optional[str] = None
    overall_confidence: float = Field(0.0, ge=0.0, le=1.0)

class TargIntelCreate(TargIntelBase):
    pass

class TargIntelUpdate(BaseModel):
    is_active: Optional[bool] = None

class TargIntelInDB(TargIntelBase):
    id: UUID
    user_id: UUID
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    gender_ratio: Optional[Dict[str, float]] = None
    geography: Optional[Dict[str, Any]] = None
    interest_clusters: Optional[List[str]] = None
    primary_interests: Optional[List[str]] = None
    income_score: Optional[float] = None
    device_distribution: Optional[Dict[str, float]] = None
    primary_device: Optional[str] = None
    funnel_score: Optional[float] = None
    audience_size: Optional[str] = None
    bidding_confidence: Optional[float] = None
    content_type: Optional[str] = None
    call_to_action: Optional[str] = None
    estimated_cpm: Optional[float] = None
    estimated_cpc: Optional[float] = None
    estimated_roas: Optional[float] = None
    engagement_rate: Optional[float] = None
    confidence_scores: Optional[Dict[str, float]] = None
    is_active: Optional[bool] = None
    raw_analysis: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_calculated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TargIntelFull(TargIntelInDB):
    """Full targeting intel with competitor name — returned by the /all endpoint."""
    competitor_name: str = ""

    class Config:
        from_attributes = True

class TargIntelSummary(BaseModel):
    competitor_id: UUID
    competitor_name: str
    age_range: Optional[str] = None
    primary_gender: Optional[str] = None
    primary_location: Optional[str] = None
    income_level: Optional[str] = None
    funnel_stage: Optional[str] = None
    audience_type: Optional[str] = None
    bidding_strategy: Optional[str] = None
    overall_confidence: float
    last_calculated_at: Optional[datetime] = None

class BulkTargIntelResponse(BaseModel):
    success: bool
    total_competitors: int
    calculated: int
    failed: int
    results: List[Dict[str, Any]]

class TargIntelCalculationRequest(BaseModel):
    competitor_ids: Optional[List[UUID]] = None  # If None, calculate for all user's competitors
    force_recalculate: bool = False


from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# ================ SUMMARY METRICS SCHEMAS ================

# ================ SUMMARY METRICS SCHEMAS ================

class SumMetricsResponse(BaseModel):
    id: UUID
    user_id: UUID
    time_period: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_competitors: int
    total_competitor_spend: float
    active_campaigns: int
    total_impressions: int
    avg_ctr: float
    is_active: bool
    calculated_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SumMetricsDashboard(BaseModel):
    total_competitor_spend: float
    active_campaigns: int
    total_impressions: int
    avg_ctr: float
    total_competitors: int
    spend_change_percentage: Optional[float] = None
    platform_distribution: Dict[str, float]
    top_competitors: List[Dict[str, Any]]

class SumMetricsCalculationRequest(BaseModel):
    time_period: str = Field("monthly", description="daily, weekly, monthly, all_time")
    competitor_ids: Optional[List[UUID]] = None
    force_recalculate: bool = False

class SumMetricsHistoryResponse(BaseModel):
    id: UUID
    time_period: str
    total_competitor_spend: float
    active_campaigns: int
    total_impressions: int
    avg_ctr: float
    total_competitors: int
    calculated_at: datetime