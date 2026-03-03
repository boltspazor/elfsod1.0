uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

ados-backend/
├── .env                          # Environment variables (Supabase, API keys)
├── requirements.txt              # Python dependencies
├── Procfile                      # Render deployment
├── railway.json                  # Railway deployment
├── Dockerfile                    # Containerization
├── .dockerignore
├── .gitignore
├── app/                          # Main application
│   ├── __init__.py              # Python package
│   ├── main.py                  # FastAPI application entry point
│   ├── config.py                # Configuration settings (Pydantic)
│   ├── database.py              # Database connection (SQLAlchemy)
│   ├── models.py                # SQLAlchemy ORM models (Users, Competitors, Ads)
│   ├── schemas.py               # Pydantic schemas (request/response validation)
│   ├── dependencies.py          # Authentication dependencies, rate limiting
│   ├── routers/                 # API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py              # User registration, login, JWT
│   │   ├── users.py             # User profile management
│   │   ├── competitors.py       # Competitor CRUD operations
│   │   ├── ads.py               # Ad fetching endpoints
│   │   └── platforms.py         # Platform-specific ad fetching
│   ├── services/                # Business logic
│   │   ├── __init__.py
│   │   ├── ad_fetcher.py        # Unified ad fetching across platforms
│   │   ├── google_service.py    # Google Ads API integration
│   │   ├── meta_service.py      # Meta/Facebook Ads API
│   │   ├── reddit_service.py    # Reddit Ads API
│   │   └── linkedin_service.py  # LinkedIn Ads API
│   ├── utils/                   # Utilities
│   │   ├── __init__.py
│   │   ├── security.py          # Password hashing, JWT tokens (Werkzeug)
│   │   ├── validators.py        # Email, URL, password validation
│   │   └── logger.py            # Structured logging with audit
│   └── tasks/                   # Background tasks (Celery-ready)
│       ├── __init__.py
│       └── fetch_ads_task.py    # Async ad fetching tasks
├── alembic/                     # Database migrations
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
└── logs/                        # Application logs

## Summary till ads fetching

# **ADOS Ad Surveillance - Project Summary**

## **📁 Directory Structure**
```
ados-backend/
├── .env                          # Environment variables (Supabase, API keys)
├── requirements.txt              # Python dependencies
├── Procfile                      # Render deployment
├── railway.json                  # Railway deployment
├── Dockerfile                    # Containerization
├── .dockerignore
├── .gitignore
├── app/                          # Main application
│   ├── __init__.py              # Python package
│   ├── main.py                  # FastAPI application entry point
│   ├── config.py                # Configuration settings (Pydantic)
│   ├── database.py              # Database connection (SQLAlchemy)
│   ├── models.py                # SQLAlchemy ORM models (Users, Competitors, Ads)
│   ├── schemas.py               # Pydantic schemas (request/response validation)
│   ├── dependencies.py          # Authentication dependencies, rate limiting
│   ├── routers/                 # API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py              # User registration, login, JWT
│   │   ├── users.py             # User profile management
│   │   ├── competitors.py       # Competitor CRUD operations
│   │   ├── ads.py               # Ad fetching endpoints
│   │   └── platforms.py         # Platform-specific ad fetching
│   ├── services/                # Business logic
│   │   ├── __init__.py
│   │   ├── ad_fetcher.py        # Unified ad fetching across platforms
│   │   ├── google_service.py    # Google Ads API integration
│   │   ├── meta_service.py      # Meta/Facebook Ads API
│   │   ├── reddit_service.py    # Reddit Ads API
│   │   └── linkedin_service.py  # LinkedIn Ads API
│   ├── utils/                   # Utilities
│   │   ├── __init__.py
│   │   ├── security.py          # Password hashing, JWT tokens (Werkzeug)
│   │   ├── validators.py        # Email, URL, password validation
│   │   └── logger.py            # Structured logging with audit
│   └── tasks/                   # Background tasks (Celery-ready)
│       ├── __init__.py
│       └── fetch_ads_task.py    # Async ad fetching tasks
├── alembic/                     # Database migrations
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
└── logs/                        # Application logs
```

## **✅ What's Working**

### **1. Core Infrastructure**
- ✅ **FastAPI backend** running on `localhost:8000`
- ✅ **Supabase PostgreSQL** database connected
- ✅ **JWT authentication** with password hashing (Werkzeug)
- ✅ **SQLAlchemy ORM** with all models defined
- ✅ **Complete API documentation** at `/docs` and `/redoc`

### **2. Database Schema**
```sql
-- 4 main tables created in Supabase:
1. users           - User accounts, authentication
2. competitors     - Competitor companies per user  
3. ads             - Fetched ads with platform data
4. ad_fetches      - Tracking of ad fetch jobs
```

### **3. API Endpoints Implemented**
```
POST    /api/auth/register      # Register new user
POST    /api/auth/login         # Login with JWT token
GET     /api/users/me           # Get user profile
POST    /api/competitors/       # Add competitor
GET     /api/competitors/       # List competitors  
POST    /api/ads/refresh-all    # Fetch ads for all competitors
GET     /api/ads/fetches        # View fetch history
GET     /api/platforms/         # Platform information
```

### **4. Ad Fetching Services**
- ✅ **Google Ads** service (`fetch_company_ads` by domain)
- ✅ **Meta/Facebook Ads** service (`search_ads` by keyword)
- ✅ **Reddit Ads** service (`search_ads` by keyword)
- ✅ **LinkedIn Ads** service (`search_ads` by company name)
- ✅ **Unified AdFetcher** that coordinates all platforms
- ✅ **Background task processing** for async fetching

### **5. CLI Tool**
- ✅ **Interactive CLI** (`ados_cli.py`) for:
  - User login/registration
  - Adding competitors
  - Running ad surveillance
  - Viewing fetched ads
  - Monitoring fetch status

## **🔧 Key Features Implemented**

### **Authentication & Security**
- JWT token-based authentication (30-minute expiry)
- Password hashing with Werkzeug (pbkdf2:sha256)
- CORS configuration for frontend access
- Rate limiting ready (dependencies configured)
- Audit logging for security events

### **Data Management**
- SQLAlchemy ORM with PostgreSQL on Supabase
- Proper foreign key relationships
- Automatic timestamp management
- Soft delete support (is_active flags)
- JSON field for raw API responses

### **Error Handling & Logging**
- Structured logging with multiple levels (DEBUG, INFO, ERROR)
- JSON logging for production
- Audit logging for user actions
- Comprehensive error handling in all services
- Health check endpoints

### **Deployment Ready**
- Environment-based configuration
- Render and Railway deployment files
- Docker support
- Database migration setup (Alembic)
- Production-ready logging

## **🚀 What You Can Do Now**

1. **Run the backend:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Use the CLI:**
   ```bash
   python ados_cli.py
   ```

3. **Workflow:**
   - Register/login user
   - Add competitor companies (Nike, Apple, etc.)
   - Run ad surveillance (fetches from Google, Meta, Reddit, LinkedIn)
   - View fetched ads in database

4. **API Testing:**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

## **📊 Current Status**

**✅ COMPLETED:**
- Backend API with all endpoints
- Database schema and models
- Authentication system
- Ad fetching services for 4 platforms
- CLI interface
- Deployment configuration

**⚙️ READY FOR:**
- Frontend development (React/Vue.js)
- Production deployment (Render/Railway)
- Additional features (analytics, alerts)
- Scaling with background workers

## **🔗 Key Files for Reference**

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI application entry |
| `app/models.py` | Database models (Users, Competitors, Ads) |
| `app/routers/auth.py` | User authentication endpoints |
| `app/services/ad_fetcher.py` | Main ad fetching logic |
| `ados_cli.py` | Command-line interface |
| `.env` | Configuration (Supabase URL, API keys) |

## **🎯 Next Steps Ready**

1. **Build Frontend** - React/Vue.js dashboard
2. **Deploy to Production** - Render/Railway
3. **Add Features** - Email alerts, analytics dashboard
4. **Scale** - Add Celery for background processing

**The backend is fully functional and ready for frontend integration!** 🚀


📊 METRICS CALCULATION EXPLAINED
1. Number of Active Ads
How: Direct count from ads table

python
active_ads = COUNT(*) FROM ads 
WHERE competitor_id = ? AND is_active = true
Data Source: Direct database query

2. Ad History Timeline
How: Simple extraction from ads table

python
timeline = SELECT first_seen, last_seen, headline 
FROM ads 
WHERE competitor_id = ?
ORDER BY first_seen DESC
Data Source: Direct from ads table

3. Daily/Weekly/Monthly Spend Estimation
How: ESTIMATION based on platform averages ❌ NOT from ads table

python
# We DON'T have actual spend data for most ads
# So we ESTIMATE:
1. Get impressions from ads table
2. Multiply by estimated CPM for each platform:
   - Google: $2.50 per 1000 impressions
   - Meta: $5.00 per 1000 impressions
   - LinkedIn: $8.00 per 1000 impressions
   - Reddit: $1.50 per 1000 impressions
Truth: We're guessing spend because API doesn't give us real spend data

4. CPM / CPC / Frequency
How: ESTIMATION using platform averages ❌

python
# CPM: Using fixed platform averages (not actual)
cpm_estimates = {
    'google': 2.50,
    'meta': 5.00,
    'linkedin': 8.00,
    'reddit': 1.50
}

# CPC: Also estimated
cpc_estimates = {
    'google': 2.50,
    'meta': 1.20,
    'linkedin': 5.00,
    'reddit': 0.80
}

# Frequency: Rough estimate
frequency = (total_impressions / 1000) / ad_count
Truth: These are industry averages, not real data

5. CTR Estimation
How: ESTIMATION based on ad characteristics

python
# Base CTR: 2%
# Adjust based on:
# - Platform (Google higher, LinkedIn lower)
# - Has video? (+0.5%)
# - Good text length (+0.3%)
# No actual click data available!
Truth: Pure estimation algorithm, no real CTR data

6. Conversion Probability
How: ESTIMATION based on keywords

python
# Look for conversion keywords in ad text:
conversion_keywords = ['buy', 'purchase', 'shop', 'order now']

# If URL has checkout/buy: higher probability
# Platform: Google ads have higher conversion intent
Truth: Keyword-based guess, no actual conversion data

7. Creative Performance Ranking
How: SCORING algorithm using available data

python
score = 0
score += 30 if ad is active
score += platform_score[ad.platform]  # Google=20, LinkedIn=15, etc.
score += 20 if has video
score += len(headline)/5 + len(description)/10  # Text completeness
score += spend * 10 if spend available
Data Source: Real data from ads table + scoring algorithm

8. Funnel Stage Detection
How: Keyword analysis of ad text

python
# Read headline + description
# Count keywords for each stage:
awareness_words = ['new', 'introducing', 'discover']
consideration_words = ['compare', 'features', 'benefits']
conversion_words = ['buy', 'purchase', 'order now']
Truth: Text analysis, not actual funnel data

9. Geo-level Ad Penetration
How: Using static default distribution ❌

python
# Default distribution (same for everyone):
geo_distribution = {
    "US": 0.5,
    "UK": 0.15,
    "CA": 0.1,
    # ... etc.
}
# In reality, we DON'T have geo data from APIs
Truth: Hardcoded estimates, no real geo data

10. Device Mapping
How: Platform-based estimation ❌

python
# Each platform has typical device mix:
google = {"mobile": 0.7, "desktop": 0.25, "tablet": 0.05}
meta = {"mobile": 0.8, "desktop": 0.15, "tablet": 0.05}
# Weight average by platform usage
Truth: Platform stereotypes, not actual device data

11. Time-of-day Heatmaps
How: Business hours assumption ❌

python
# Peak during business hours (9 AM - 5 PM)
# Lower at night
# Same pattern for everyone
Truth: Assumed pattern, no real time data

12. Audience Cluster Inference
How: Industry + keyword analysis

python
# Look at competitor industry:
if 'B2B' in industry: audience = 'Business Professionals'
if 'tech' in industry: audience = 'Tech Early Adopters'

# Look for keywords in ads:
if 'students' in ad_text: audience += 'Students'
Truth: Inference from available text, not real audience data

📈 REAL vs ESTIMATED DATA
What We ACTUALLY Have from Ads Table:
✅ Real Data Available:

Ad IDs, headlines, descriptions, URLs

Platform, format (image/video)

Active/inactive status

First seen / Last seen dates

Impressions (sometimes)

Raw API response

❌ What We DON'T Have (but estimate):

Actual spend amounts

Click-through rates

Conversion data

Geographic distribution

Device breakdown

Time-of-day performance

Real audience demographics

Actual CPM/CPC

## Trending score
Score = Engagement(40%) + Recency(20%) + Quality(20%) + Platform(20%)

Where:
- Engagement: likes + 5×comments + 3×shares (log scale)
- Recency: Content age bonus (recent = higher)
- Quality: Title length, media presence, URL validity
- Platform: Platform-specific bonuses