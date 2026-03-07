# ADOS Backend – Architecture & Feature Map

> **Stack**: Python · FastAPI · Flask · SQLAlchemy · Supabase (PostgreSQL) · Groq LLM · pnpm

---

## 1. Overview – Two Backend Codebases

The backend is split into **two separate codebases** that run as separate services:

| Codebase | Root | Framework | Default Port | Purpose |
|---|---|---|:---:|---|
| **Main Orchestrator** | `backend/` | Flask + FastAPI | `:8000` | Launches all sub-services as subprocesses |
| **ADOS Surveillance API** | `backend/ados-backend/` | FastAPI + Flask | `:8000` | Ad surveillance, competitors, targeting intel, metrics |

Sub-services launched by the orchestrator:

| Sub-Service | Framework | Default Port | Purpose |
|---|---|:---:|---|
| Auth Service | Flask | `:5003` | Login / Signup via Supabase |
| Command Center | Flask | `:5002` | GenAI chat + image generation |
| AutoCreate | Flask | `:5050` | Campaign wizard steps (goal → copy → assets) |

---

## 2. Boot Sequence

### Main Orchestrator (`backend/main.py`)
```
python backend/main.py
  │
  ├── FastAPI app started  (port :8000)
  │     └── Mounts api_router → /api/v1/competitors
  │
  └── subprocess.Popen() launches each sub-service in parallel:
        ├── app/api/Authentication/auth.py     → Flask :5003
        ├── app/api/AutoCreate/campaign_goal.py \
        ├── app/api/AutoCreate/copy_messaging.py  → registered into
        ├── app/api/AutoCreate/audience_step.py    AutoCreate main.py :5050
        ├── app/api/AutoCreate/budget_testing.py /
        └── app/api/commandCenter/api_call.py  → Flask :5002
```

### ADOS Surveillance API (`backend/ados-backend/app/main.py`)
```
uvicorn app.main:app
  │
  ├── FastAPI lifespan: Base.metadata.create_all()  ← auto-migrate DB tables
  │
  ├── Flask Auth mounted at /auth via WSGIMiddleware
  │     └── authservice/auth.py  (login, signup, JWT)
  │
  └── FastAPI Routers mounted:
        ├── /api/users        → routers/users.py
        ├── /api/competitors  → routers/competitors.py
        ├── /api/ads          → routers/ads.py
        ├── /api/platforms    → routers/platforms.py
        ├── /api/metrics      → routers/metrics.py
        ├── /api/trending     → routers/trending.py
        ├── /api/targ-intel   → routers/targ_intel.py
        └── /api/sum-metrics  → routers/sum_metrics.py
```

---

## 3. Feature Breakdown

### 3.1 Authentication
**Service**: Flask · Port `:5003`

| File | Role |
|------|------|
| `app/api/Authentication/auth.py` | Flask app – `/sign-up` and `/login` routes |
| `ados-backend/authservice/auth.py` | Auth mounted inside ADOS API at `/auth` |
| `ados-backend/app/utils/security.py` | JWT helpers, password hashing |
| `ados-backend/app/dependencies.py` | `get_current_user()` FastAPI dependency (reads JWT from header) |

**Flow**:
```
POST /signup
  → validate fields (name, email, password, confirmPassword)
  → check Supabase: email already exists?
  → bcrypt hash password
  → INSERT into Supabase users table
  → create JWT { user_id, email, name, exp: +30 days }
  → return { success: true, token, user }

POST /login
  → fetch user by email from Supabase
  → bcrypt verify password
  → create JWT
  → return { success: true, token, user }
```

**Token structure** (HS256 JWT, 30-day expiry):
```json
{ "user_id": "uuid", "email": "...", "name": "...", "iat": 0, "exp": 0 }
```

**Env vars needed**:
```
SECRET_KEY=...        # JWT signing secret
SUPABASE_URL=...
SUPABASE_KEY=...      # service role key (server-side only)
```

---

### 3.2 Ad Surveillance
**Service**: FastAPI · ADOS API (`ados-backend/`)

| File | Role |
|------|------|
| `ados-backend/app/routers/ads.py` (655 lines) | REST endpoints: refresh, list, get ad by id |
| `ados-backend/app/routers/competitors.py` | CRUD for competitor entries |
| `ados-backend/app/routers/platforms.py` | List supported platforms |
| `ados-backend/app/routers/metrics.py` | Ad performance metrics endpoints |
| `ados-backend/app/routers/sum_metrics.py` | Summary / aggregated metrics |
| `ados-backend/app/routers/trending.py` | Trending ads across platforms |
| `ados-backend/app/services/ad_fetcher.py` | Orchestrates per-platform fetching |
| `ados-backend/app/services/meta_service.py` | Meta Ad Library scraping |
| `ados-backend/app/services/google_service.py` | Google Ads Transparency scraping |
| `ados-backend/app/services/instagram_service.py` | Instagram ad data |
| `ados-backend/app/services/linkedin_service.py` | LinkedIn ad data |
| `ados-backend/app/services/youtube_service.py` | YouTube ad data |
| `ados-backend/app/services/reddit_service.py` | Reddit ad data |
| `ados-backend/app/services/metrics_calculator.py` | Computes CPM, CPC, ROAS, engagement |
| `ados-backend/app/services/sum_metrics_calculator.py` | Aggregated metrics across all ads |
| `ados-backend/app/services/background_tasks.py` | Async background processing |
| `ados-backend/app/tasks/fetch_ads_task.py` | Celery/background task: fetch new ads |
| `ados-backend/app/tasks/calculate_metrics_task.py` | Celery/background task: recalculate metrics |
| `app/pipeline/fetch_ads.py` | Legacy pipeline: fetch ads from APIs |
| `app/pipeline/save_to_database.py` | Legacy pipeline: persist fetched ads |
| `app/pipeline/job.py` | Cron scheduler: runs pipeline every 6 hours |
| `app/workers/alert_worker.py` | Background worker: fires spend/performance alerts |
| `app/workers/landing_page_worker.py` | Background worker: scans landing pages |

**Key API endpoints**:
```
POST /api/ads/refresh/{competitor_id}?platforms=meta,google,...
  → triggers AdFetcher for specified platforms
  → stores raw ads in DB

GET  /api/ads/{competitor_id}
  → returns paginated ad list with metrics

GET  /api/metrics/{competitor_id}
  → returns performance metrics per ad

GET  /api/trending
  → top ads sorted by spend/engagement this week

GET  /api/sum-metrics/{user_id}
  → aggregated dashboard numbers
```

**Platform integrations** (`ados-backend/app/integrations/` and `app/integrations/`):
```
meta_client.py     → Meta Ad Library API (Facebook/Instagram)
google_client.py   → Google Ads Transparency API
http_client.py     → Generic async HTTP wrapper (aiohttp)
```

---

### 3.3 Targeting Intelligence
**Service**: FastAPI · ADOS API

| File | Role |
|------|------|
| `ados-backend/app/routers/targ_intel.py` (365 lines) | REST endpoints: calculate, get, list |
| `ados-backend/app/services/targ_intel_calculator.py` | Core algorithm: audience + demographic analysis |

**Key API endpoints**:
```
POST /api/targ-intel/calculate
  body: { competitor_ids?: [uuid], force_recalculate: bool }
  → TargIntelCalculator.calculate_for_user()
  → returns BulkTargIntelResponse

GET  /api/targ-intel/{competitor_id}
  → returns stored targeting intel record

GET  /api/targ-intel/summary/{user_id}
  → high-level targeting summary for dashboard
```

**What the calculator computes**:
- Audience age/gender distribution from ad creative metadata
- Platform-specific audience overlap
- Estimated CPC/CPM benchmarks per segment
- Recommended targeting adjustments

---

### 3.4 Command Center (GenAI Chat)
**Service**: Flask · Port `:5002`

| File | Role |
|------|------|
| `app/api/commandCenter/main.py` | Flask app – registers blueprints, CORS config |
| `app/api/commandCenter/api_call.py` | `POST /genai_call` – chat with Groq LLM |
| `app/api/commandCenter/generate_ad.py` | `POST /image_gen` – generate ad image via Runway |

**`POST /genai_call`** flow:
```
Request: { message, action, locale, context: { brand, product, ... } }
  │
  ├── validate action is in ALLOWED_ACTIONS
  ├── validate message contains marketing keyword
  ├── build system prompt with brand context + ad-only guardrails
  ├── Groq.chat.completions.create(model="llama-3.3-70b-versatile")
  └── return { reply: string }
```

**`POST /image_gen`** flow:
```
Request: { message, aspect_ratio, style, negative_prompt }
  │
  ├── construct enhanced prompt
  ├── Runway ML API → generates image
  ├── poll for task completion
  ├── download image to generated_images/ folder
  └── return { success, task_id, cloudfront_url, local_url }

GET /check_local_image/:task_id
  → check if downloaded image is available locally
  → return { success, status, local_url }
```

**Env vars needed**:
```
GROQ_API_KEY=...
RUNWAY_API_KEY=...
```

---

### 3.5 AutoCreate (Campaign Wizard)
**Service**: Flask · Port `:5050`

| File | Role |
|------|------|
| `app/api/AutoCreate/main.py` | Flask app – registers all step blueprints |
| `app/api/AutoCreate/campaign_goal.py` | `POST /api/campaign-goal` – save campaign objective |
| `app/api/AutoCreate/copy_messaging.py` | `POST /api/copy-messaging` – generate ad copy via Groq |
| `app/api/AutoCreate/audience_step.py` | `POST /api/audience-step` – save audience targeting |
| `app/api/AutoCreate/budget_testing.py` | `POST /api/budget-testing` – save budget + A/B test config |
| `app/api/AutoCreate/creative_assets.py` | `POST /api/creative-assets` – upload / generate creatives |
| `app/api/AutoCreate/database.py` | SQLite DB setup for local dev |
| `app/api/AutoCreate/unified_db.py` | Shared DB helpers: decode JWT, save campaign, get active campaign |
| `app/api/AutoCreate/api/campaign_goal.py` | Duplicate/refactored version of campaign goal endpoint |
| `app/api/AutoCreate/api/copy_messaging.py` | Duplicate/refactored version of copy messaging endpoint |

**Step → Endpoint map**:
```
Step 1 – Campaign Goal
  POST /api/campaign-goal
  body: { goal, user_id, platforms[] }
  → decode JWT → save to Supabase campaigns table

Step 4 – Copy Messaging
  POST /api/copy-messaging
  body: { campaign_id, message, tone, user_id }
  → decode JWT
  → Groq LLM: generate headline + body copy in chosen tone
  → save to Supabase
  → return { headline, body, cta }

Step 3 – Audience
  POST /api/audience-step
  body: { campaign_id, age_range, gender, interests[], locations[] }
  → save audience config to Supabase

Step 6 – Budget Testing
  POST /api/budget-testing
  body: { campaign_id, budget, ab_variants[] }
  → save budget + A/B test variants

Step 5 – Creative Assets
  POST /api/creative-assets
  body: { campaign_id, images[], videos[] }
  → upload files → Supabase storage bucket
```

**Env vars needed**:
```
SUPABASE_URL=...
SUPABASE_KEY=...
SECRET_KEY=...     # for JWT decode
GROQ_API_KEY=...
RUNWAY_API_KEY=... # for video generation
```

---

### 3.6 Data Pipeline (Cron)
**Location**: `backend/app/pipeline/`

| File | Role |
|------|------|
| `pipeline/job.py` (256 lines) | Cron scheduler – runs every 6 hours via `schedule` library |
| `pipeline/fetch_ads.py` | Step 1: calls ad platform APIs, returns raw ad objects |
| `pipeline/save_to_database.py` | Step 2: upserts raw ads into Supabase via SQLAlchemy |

**Execution cycle**:
```
Every 6 hours:
  job.py (schedule)
    → fetch_ads.py → Meta API + Google API + ...
    → save_to_database.py → Supabase PostgreSQL
    → workers/alert_worker.py → check spend thresholds → send alerts
```

---

### 3.7 Data Models
**Location**: `backend/app/models/` and `backend/ados-backend/app/models.py`

| File | SQLAlchemy Model |
|------|------|
| `models/ad.py` | `Ad` – ad_id, competitor_id, platform, creative, spend, dates |
| `models/competitor.py` | `Competitor` – competitor_id, user_id, name, domain, is_active |
| `models/spend.py` | `Spend` – spend_id, ad_id, date, amount, currency |
| `models/public_ads_raw.py` | `PublicAdRaw` – raw scraped ad JSON blob |
| `models/public_ads_evaluation.py` | `PublicAdEvaluation` – scored/evaluated ad record |
| `ados-backend/app/models.py` | All models in one file: User, Competitor, Ad, AdFetch, TargIntel |

---

### 3.8 Schemas (Pydantic)
**Location**: `backend/app/schemas/` and `backend/ados-backend/app/schemas.py`

| File | Pydantic Schemas |
|------|------|
| `schemas/ad.py` | `AdCreate`, `AdResponse`, `AdUpdate` |
| `schemas/competitor.py` | `CompetitorCreate`, `CompetitorResponse` |
| `schemas/spend.py` | `SpendCreate`, `SpendResponse` |
| `schemas/user.py` | `UserCreate`, `UserResponse` |
| `ados-backend/app/schemas.py` | All schemas in one file (AdResponse, TargIntelInDB, etc.) |

---

### 3.9 Storage
**Location**: `backend/app/storage/`

| File | Role |
|------|------|
| `storage/s3_client.py` | AWS S3 / compatible object storage client |
| `storage/file_service.py` | High-level file upload/download wrapper over S3 |

---

### 3.10 Database & Migrations
**Location**: `backend/ados-backend/alembic/`

| File | Role |
|------|------|
| `alembic/env.py` | Alembic migration environment setup |
| `alembic/alembic.ini` | Migration config (DB URL, script location) |
| `alembic/versions/` | Individual migration scripts |
| `ados-backend/app/database.py` | SQLAlchemy engine + `get_db()` dependency |
| `app/core/database.py` | Same for the main backend codebase |

**DB**: Supabase-hosted PostgreSQL (connection via `DATABASE_URL` env var)

---

## 4. Config & Environment Variables

### Main Orchestrator (`backend/app/core/config.py`)
```
DATABASE_URL=...                        # Supabase PostgreSQL connection string
META_AD_LIBRARY_ACCESS_TOKEN=...        # Meta Ad Library
GOOGLE_TRANSPARENCY_API_KEY=...         # Google Ads Transparency
TIKTOK_COMMERCIAL_API_KEY=...           # TikTok (disabled by default)
```

### ADOS Surveillance API (`backend/ados-backend/app/config.py`)
```
DATABASE_URL=...                        # Supabase PostgreSQL
SECRET_KEY=...                          # JWT signing
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
SCRAPECREATORS_API_KEY=...             # ScrapeCreators (ad library scraper)
MAX_ADS_PER_COMPETITOR=50
GOOGLE_MAX_ENRICHMENT=3
FETCH_TIMEOUT=30
ALLOWED_ORIGINS=http://localhost:5173,...
```

### Auth Service
```
SUPABASE_URL=...
SUPABASE_KEY=...   # service_role key (NEVER expose to frontend)
SECRET_KEY=...     # must match across all services for JWT verify
```

### Command Center
```
GROQ_API_KEY=...       # Groq cloud LLM
RUNWAY_API_KEY=...     # Runway ML image/video generation
```

### AutoCreate
```
SUPABASE_URL=...
SUPABASE_KEY=...
SECRET_KEY=...
GROQ_API_KEY=...
RUNWAY_API_KEY=...
```

---

## 5. Full Request Flow – End to End

### Login
```
Browser → POST :5003/login
  → auth.py (Flask)
    → Supabase: SELECT user WHERE email=?
    → bcrypt verify password
    → jwt.encode({ user_id, email, name })
    → { success, token, user }
  → Browser stores token in localStorage
```

### Load Ad Surveillance Dashboard
```
Browser → GET :8000/api/ads/{competitor_id}  (JWT in Authorization header)
  → ados-backend FastAPI
    → get_current_user() dependency decodes JWT → user object
    → ads.py router
    → AdFetcher.get_ads_for_competitor()
      → SQLAlchemy query on Supabase PostgreSQL
    → MetricsCalculator.enrich(ads)
    → return paginated AdResponse[]
```

### AI Chat (Command Center)
```
Browser → POST :5002/genai_call
  body: { message, action:"chat", context:{...} }
  → api_call.py (Flask Blueprint)
    → validate action + marketing keyword guard
    → build system prompt with brand context
    → Groq API (llama-3.3-70b-versatile)
    → return { reply: string }
```

### Generate Ad Image
```
Browser → POST :5002/image_gen
  body: { message, aspect_ratio, style }
  → generate_ad.py (Flask Blueprint)
    → Runway ML API: create task
    → poll until SUCCEEDED
    → download image → generated_images/{task_id}.jpg
    → return { cloudfront_url, local_url, task_id }

Browser → GET :5002/check_local_image/{task_id}
  → check file exists on disk
  → return { status: "available_locally", local_url }
```

### Campaign Goal (AutoCreate Step 1)
```
Browser → POST :5050/api/campaign-goal
  body: { goal, user_id, platforms[] }
  → campaign_goal.py (Flask Blueprint)
    → decode JWT → verify user_id
    → Supabase: INSERT INTO campaigns(user_id, goal, platforms)
    → return { success, campaign_id }
```

### Generate Ad Copy (AutoCreate Step 4)
```
Browser → POST :5050/api/copy-messaging
  body: { campaign_id, message, tone:"Energetic" }
  → copy_messaging.py (Flask Blueprint)
    → decode JWT
    → unified_db: get_active_campaign(campaign_id)
    → build Groq prompt with tone + campaign context
    → Groq API → headline + body + CTA
    → Supabase: UPDATE campaigns SET copy=?
    → return { headline, body, cta }
```

### Targeting Intel Calculation
```
Browser → POST :8000/api/targ-intel/calculate
  body: { competitor_ids: [uuid] }  (JWT in header)
  → targ_intel.py router
    → get_current_user() → user
    → TargIntelCalculator.calculate_for_user()
      → load competitor ads from DB
      → analyse audience signals per platform
      → compute demographic breakdowns + recommendations
      → upsert TargIntel records in DB
    → return BulkTargIntelResponse
```

---

## 6. Directory Structure Summary

```
backend/
├── main.py                          ← Orchestrator: starts all sub-services
├── meta_ads.py                      ← Standalone Meta Ads utility script
├── test_video_generation.py         ← Test script for Runway video gen
│
├── app/                             ← Main backend package
│   ├── api/
│   │   ├── Authentication/auth.py   ← Flask auth service (:5003)
│   │   ├── commandCenter/           ← Flask GenAI + image gen service (:5002)
│   │   │   ├── main.py
│   │   │   ├── api_call.py          ← /genai_call endpoint
│   │   │   └── generate_ad.py       ← /image_gen endpoint
│   │   ├── AutoCreate/              ← Flask campaign wizard service (:5050)
│   │   │   ├── main.py
│   │   │   ├── campaign_goal.py
│   │   │   ├── copy_messaging.py
│   │   │   ├── audience_step.py
│   │   │   ├── budget_testing.py
│   │   │   ├── creative_assets.py
│   │   │   └── unified_db.py
│   │   └── v1/                      ← FastAPI v1 router (competitors only)
│   ├── core/
│   │   ├── config.py                ← Settings (DATABASE_URL, API keys)
│   │   ├── database.py              ← SQLAlchemy engine + session
│   │   └── logging.py               ← Logging config
│   ├── models/                      ← SQLAlchemy ORM models
│   ├── schemas/                     ← Pydantic request/response schemas
│   ├── services/                    ← Business logic (ad, competitor, spend)
│   ├── pipeline/                    ← Data pipeline (fetch → save → cron)
│   ├── workers/                     ← Background workers (alerts, landing pages)
│   ├── integrations/                ← Third-party API clients (Meta, Google)
│   └── storage/                     ← S3 file storage
│
├── ados-backend/                    ← Production surveillance API
│   ├── app/
│   │   ├── main.py                  ← FastAPI app + all routers mounted
│   │   ├── config.py                ← Settings class
│   │   ├── database.py              ← Engine + get_db()
│   │   ├── models.py                ← All ORM models
│   │   ├── schemas.py               ← All Pydantic schemas
│   │   ├── dependencies.py          ← get_current_user() JWT dependency
│   │   ├── routers/                 ← FastAPI route handlers
│   │   │   ├── users.py
│   │   │   ├── competitors.py
│   │   │   ├── ads.py               ← 655 lines – main ad endpoints
│   │   │   ├── metrics.py
│   │   │   ├── targ_intel.py        ← 365 lines – targeting intel
│   │   │   ├── trending.py
│   │   │   ├── sum_metrics.py
│   │   │   └── platforms.py
│   │   ├── services/                ← Business logic per platform
│   │   │   ├── ad_fetcher.py        ← Orchestrates all platform fetches
│   │   │   ├── meta_service.py
│   │   │   ├── google_service.py
│   │   │   ├── instagram_service.py
│   │   │   ├── linkedin_service.py
│   │   │   ├── youtube_service.py
│   │   │   ├── reddit_service.py
│   │   │   ├── metrics_calculator.py
│   │   │   ├── targ_intel_calculator.py
│   │   │   └── background_tasks.py
│   │   ├── tasks/                   ← Background task definitions
│   │   └── utils/                   ← logger, security, validators
│   ├── authservice/
│   │   └── auth.py                  ← Flask auth mounted at /auth
│   ├── alembic/                     ← DB migration scripts
│   ├── Dockerfile
│   ├── Procfile                     ← Railway deployment: uvicorn app.main:app
│   └── railway.json                 ← Railway config
│
└── ml/                              ← ML pipelines (separate, not yet wired)
    ├── config.py
    ├── pipelines/
    └── scripts/
```
