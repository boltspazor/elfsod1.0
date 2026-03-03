from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Numeric, Text, Date, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base  # Import Base from database.py

from sqlalchemy import Column, String, Float, Integer, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid


from sqlalchemy import Column, String, Float, Integer, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid

from sqlalchemy import Column, String, Float, Integer, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid

class SumMetrics(Base):
    __tablename__ = "sum_metrics"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Only user_id as foreign key (removed competitor_id)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # Time period
    time_period = Column(String(20), nullable=False)  # 'daily', 'weekly', 'monthly', 'all_time'
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    # Simple metrics (the 4 we need)
    total_competitors = Column(Integer, nullable=False, default=0)
    total_competitor_spend = Column(Float, nullable=False, default=0.0)
    active_campaigns = Column(Integer, nullable=False, default=0)
    total_impressions = Column(Integer, nullable=False, default=0)
    avg_ctr = Column(Float, nullable=False, default=0.0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<SumMetrics(user_id={self.user_id}, period={self.time_period}, spend=${self.total_competitor_spend:,.0f})>"

class TargIntel(Base):
    __tablename__ = "targ_intel"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # Demographic targeting
    age_min = Column(Integer, nullable=True)  # Minimum age target
    age_max = Column(Integer, nullable=True)  # Maximum age target
    age_range = Column(String, nullable=True)  # e.g., "18-24", "25-34", "35-44", "45-54", "55+"
    gender_ratio = Column(JSON, nullable=True)  # {"male": 0.6, "female": 0.4, "other": 0.0}
    primary_gender = Column(String, nullable=True)  # "male", "female", "balanced"
    
    # Geographic targeting
    geography = Column(JSON, nullable=True)  # {"countries": ["US", "UK"], "states": ["CA", "NY"], "cities": ["New York", "LA"]}
    primary_location = Column(String, nullable=True)  # Main target location
    
    # Interest clusters
    interest_clusters = Column(JSON, nullable=True)  # List of interest categories
    primary_interests = Column(JSON, nullable=True)  # Top 5 interests
    
    # Income level inference
    income_level = Column(String, nullable=True)  # "low", "middle", "high", "luxury"
    income_score = Column(Float, nullable=True)  # 0.0 to 1.0 scale
    
    # Device targeting
    device_distribution = Column(JSON, nullable=True)  # {"mobile": 0.7, "desktop": 0.25, "tablet": 0.05}
    primary_device = Column(String, nullable=True)  # "mobile", "desktop", "tablet"
    
    # Funnel stage targeting
    funnel_stage = Column(String, nullable=True)  # "awareness", "consideration", "conversion", "retention"
    funnel_score = Column(Float, nullable=True)  # 0.0 to 1.0
    
    # Audience type
    audience_type = Column(String, nullable=True)  # "retargeting", "broad", "lookalike", "custom"
    audience_size = Column(String, nullable=True)  # "small", "medium", "large", "very_large"
    
    # Bidding strategy inference
    bidding_strategy = Column(String, nullable=True)  # "cpc", "cpm", "tROAS", "reach", "frequency_cap"
    bidding_confidence = Column(Float, nullable=True)  # 0.0 to 1.0 confidence score
    
    # Content analysis
    content_type = Column(String, nullable=True)  # "video", "image", "carousel", "story"
    call_to_action = Column(String, nullable=True)  # "shop_now", "learn_more", "sign_up", "contact_us"
    
    # Performance metrics
    estimated_cpm = Column(Float, nullable=True)  # Estimated cost per mille
    estimated_cpc = Column(Float, nullable=True)  # Estimated cost per click
    estimated_roas = Column(Float, nullable=True)  # Estimated return on ad spend
    engagement_rate = Column(Float, nullable=True)  # Estimated engagement rate
    
    # Confidence scores
    confidence_scores = Column(JSON, nullable=True)  # {"age": 0.8, "gender": 0.7, "geography": 0.9, ...}
    overall_confidence = Column(Float, default=0.0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_calculated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Raw analysis data for debugging
    raw_analysis = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<TargIntel(competitor_id={self.competitor_id}, confidence={self.overall_confidence})>"


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    business_type = Column(Text, nullable=True)
    industry = Column(Text, nullable=True)
    goals = Column(Text, nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    
    competitors = relationship("Competitor", back_populates="user", cascade="all, delete-orphan")
    ad_fetches = relationship("AdFetch", back_populates="user")


class Competitor(Base):
    __tablename__ = "competitors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    estimated_monthly_spend = Column(Numeric(12, 2), default=0.00)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    ads_count = Column(Integer, default=0)
    last_fetch_status = Column(String(20), default="pending")
    
    user = relationship("User", back_populates="competitors")
    ad_fetches = relationship("AdFetch", back_populates="competitor")
    ads = relationship("Ad", back_populates="competitor")
    metrics = relationship("SurvMetrics", back_populates="competitor", cascade="all, delete-orphan")


class Ad(Base):
    __tablename__ = "ads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(20), nullable=False)  # google, meta, reddit, linkedin
    platform_ad_id = Column(String(255), nullable=False)
    headline = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    full_text = Column(Text, nullable=True)
    destination_url = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    format = Column(String(50), nullable=True)
    impressions = Column(String, nullable=True)
    spend = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    first_seen = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_seen = Column(DateTime(timezone=True), default=datetime.utcnow)
    raw_data = Column(Text, nullable=True)  # JSON as text
    
    competitor = relationship("Competitor", back_populates="ads")
    
    __table_args__ = (
        UniqueConstraint('competitor_id', 'platform', 'platform_ad_id', name='uq_competitor_platform_ad'),
    )


class AdFetch(Base):
    __tablename__ = "ad_fetches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_ads_fetched = Column(Integer, default=0)
    platforms_queried = Column(Text, nullable=True)  # JSON array
    error_message = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="ad_fetches")
    competitor = relationship("Competitor", back_populates="ad_fetches")


class SurvMetrics(Base):
    __tablename__ = "surv_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    competitor_id = Column(UUID(as_uuid=True), ForeignKey('competitors.id', ondelete='CASCADE'), nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Time period classification
    time_period = Column(String(20), nullable=False)  # daily, weekly, monthly, all_time
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    # Basic Metrics
    total_ads = Column(Integer, nullable=True)
    active_ads = Column(Integer, nullable=True)
    ads_per_platform = Column(JSONB, nullable=True)  # {"google": 10, "meta": 5, ...}
    
    # Spend Metrics
    estimated_daily_spend = Column(Numeric(12, 2), nullable=True)
    estimated_weekly_spend = Column(Numeric(12, 2), nullable=True)
    estimated_monthly_spend = Column(Numeric(12, 2), nullable=True)
    total_spend = Column(Numeric(12, 2), nullable=True)
    
    # Performance Metrics
    avg_cpm = Column(Numeric(10, 2), nullable=True)  # Cost Per Mille
    avg_cpc = Column(Numeric(10, 2), nullable=True)  # Cost Per Click
    avg_ctr = Column(Numeric(5, 4), nullable=True)   # Click Through Rate (0.0 - 1.0)
    avg_frequency = Column(Numeric(5, 2), nullable=True)  # Avg times user sees ad
    conversion_probability = Column(Numeric(5, 4), nullable=True)  # Estimated conversion rate
    
    # Creative Metrics
    creative_performance = Column(JSONB, nullable=True)  # {"headline_length": {"avg": 20}, "has_video": 0.3}
    top_performing_creatives = Column(JSONB, nullable=True)  # List of top ad IDs
    
    # Funnel & Audience
    funnel_stage_distribution = Column(JSONB, nullable=True)  # {"awareness": 0.4, "consideration": 0.3, "conversion": 0.3}
    audience_clusters = Column(JSONB, nullable=True)  # Detected audience segments
    
    # Geo & Device Metrics
    geo_penetration = Column(JSONB, nullable=True)  # {"US": 0.5, "UK": 0.3, ...}
    device_distribution = Column(JSONB, nullable=True)  # {"mobile": 0.6, "desktop": 0.3, "tablet": 0.1}
    
    # Time-based Metrics
    time_of_day_heatmap = Column(JSONB, nullable=True)  # {"00:00": 0.1, "06:00": 0.3, ...}
    ad_timeline = Column(JSONB, nullable=True)  # Timeline of ad launches/updates
    
    # Derived Insights
    trends = Column(JSONB, nullable=True)  # Trend analysis
    recommendations = Column(JSONB, nullable=True)  # Actionable recommendations
    risk_score = Column(Integer, nullable=True)  # 0-100 risk assessment
    opportunity_score = Column(Integer, nullable=True)  # 0-100 opportunity assessment
    
    # Relationships
    competitor = relationship("Competitor", back_populates="metrics")
    
    def __repr__(self):
        return f"<SurvMetrics(id={self.id}, competitor={self.competitor_id}, period={self.time_period})>"