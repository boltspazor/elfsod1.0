# ADOS Frontend – Architecture & Feature Map

> **Stack**: Vite · React 18 · TypeScript · Tailwind CSS · React Router v6 · Supabase · pnpm

---

## 1. Boot Sequence (How the App Starts)

```
index.html
  └── src/main.tsx                  ← React root, mounts <App> inside StrictMode
        └── src/App.tsx             ← Router setup + splash screen logic
              ├── SplashScreen      ← Shown for 1 s on first load
              └── <Router>
                    └── <Routes>    ← All URL → Page mappings live here
```

### Execution order on first page load
1. **`index.html`** loads `main.tsx` as the entry point
2. **`main.tsx`** creates the React root and renders `<App>`
3. **`App.tsx`** shows `<SplashScreen>` for 1 000 ms, then mounts the router
4. **React Router** matches the current URL and renders the correct page component
5. Each page component fetches its own data via a **service** in `src/services/`

---

## 2. Routing Table

| URL | Page Component | Auth Required |
|-----|---------------|:---:|
| `/` | `pages/Home.tsx` | ❌ Public |
| `/login` | `pages/Login.tsx` | ❌ Public (redirects away if logged in) |
| `/sign-up` | `pages/Signup.tsx` | ❌ Public (redirects away if logged in) |
| `/ads/:id` | `pages/AdDetailPage.tsx` | ❌ Public |
| `/onboarding` | `components/OnBoarding.tsx` | ✅ Protected |
| `/command-center` | `pages/CommandCenter.tsx` | ✅ Protected |
| `/dashboard` | `pages/CommandCenter.tsx` | ✅ Protected (alias) |
| `/auto-create` | `pages/AutoCreate.tsx` | ✅ Protected |
| `/ad-surveillance` | `components/AdSurveillance.tsx` | ✅ Protected |
| `/targeting_intel` | `pages/targetingIntel.tsx` | ✅ Protected |
| `/video-analysis` | `pages/VideoAnalysis.tsx` | ✅ Protected |
| `/booking` | `pages/BookingPage.tsx` | ✅ Protected |
| `*` | Redirect → `/` | – |

### Auth Guard – how it works
```
src/components/ProtectedRoute.tsx
  ├── ProtectedRoute  → reads localStorage('token')
  │     if missing  → <Navigate to="/" />
  │     if present  → renders children
  └── PublicRoute    → reads localStorage('token')
        if present  → <Navigate to="/command-center" />
        if missing  → renders children
```
**Token** is a JWT stored in `localStorage` by the auth service on login/signup.

---

## 3. Feature Breakdown

### 3.1 Landing Page
| File | Role |
|------|------|
| `pages/Home.tsx` | Main landing page shell, assembles all marketing sections |
| `components/HeroBanner.tsx` | Top hero section with headline + CTA |
| `components/ui/hero-parallax.tsx` | Parallax scroll hero variant |
| `components/ui/marketing-parallax.tsx` | Marketing section with parallax tiles |
| `components/ui/benefits-section.tsx` | Benefits/feature highlights grid |
| `components/ui/features-section.tsx` | Feature cards section |
| `components/ui/stats-grid.tsx` | Key metrics / stats display |
| `components/ui/cta-section.tsx` | Mid-page call-to-action banner |
| `components/ui/final-cta-section.tsx` | Bottom call-to-action section |
| `components/ui/dashboard-preview.tsx` | Animated dashboard preview screenshot |
| `components/AnimatedTileGrid.tsx` | Background tile animation grid |
| `components/LoginAnimatedTile4x3.tsx` | 4×3 animated tile for login background |
| `components/Header.tsx` | Top navigation bar for landing page |
| `components/Footer.tsx` | Site-wide footer |
| `components/ui/flip-words.tsx` | Animated word-flip text effect |
| `components/ui/sparkles.tsx` | Sparkle particle animation |
| `components/ui/hero-highlight.tsx` | Highlight underline animation |
| `components/ui/resizable-navbar.tsx` | Scroll-aware resizable navbar |

---

### 3.2 Authentication
| File | Role |
|------|------|
| `pages/Login.tsx` | Login page shell |
| `pages/Signup.tsx` | Signup page shell |
| `components/Login-form.tsx` | Login form – POSTs to `AUTH_API_URL/login`, stores JWT |
| `components/Signup-form.tsx` | Signup form – POSTs to `AUTH_API_URL/signup`, stores JWT |
| `components/ProtectedRoute.tsx` | Route guards (ProtectedRoute + PublicRoute) |
| `utils/auth.ts` | Auth utility helpers (currently empty, reserved) |
| `src/config.ts` | Exports `AUTH_API_URL` (default: `localhost:5003`) |

**Flow**:
```
User submits Login-form.tsx
  → POST AUTH_API_URL/login
    → on success: localStorage.setItem('token', jwt)
                  localStorage.setItem('user', JSON.stringify(user))
                  navigate('/onboarding') or navigate('/command-center')
    → on failure: shows inline error message
```

---

### 3.3 Command Center (AI Chat)
| File | Role |
|------|------|
| `pages/CommandCenter.tsx` | Full-page AI chat interface, sidebar, quick actions |
| `components/ChatInput.tsx` | Reusable chat input bar used inside AutoCreate steps |
| `components/MessageBubble.tsx` | Individual chat message bubble (user / bot) |
| `src/config.ts` | Exports `GENAI_API_URL` (default: `127.0.0.1:5002`) |

**API call**:
```
POST GENAI_API_URL/genai_call
  body: { message, action, locale, context: { brand, product, ... } }
  response: { reply: string }
```

---

### 3.4 Ad Surveillance
| File | Role |
|------|------|
| `components/AdSurveillance.tsx` | Main surveillance dashboard – competitor ad monitoring |
| `pages/AdDetailPage.tsx` | Full detail view for a single ad (`/ads/:id`) |
| `pages/adsurv.tsx` | Alternative/legacy ad surveillance page variant |
| `components/AdCard.tsx` | Card component for a single ad |
| `components/AdCarousel.tsx` | Horizontal carousel of ad cards |
| `components/AdDetailModal.tsx` | Modal popup for ad details |
| `components/InsightCard.tsx` | Metric/insight display card |
| `components/StatusBadge.tsx` | Active/paused/ended status pill |
| `components/QuickFilters.tsx` | Platform/date filter bar |
| `services/adsurv.ts` | All API calls for ad data (989 lines) |
| `services/Sample_1_adsurv.ts` | Mock/sample data for dev/testing |
| `src/config.ts` | Exports `API_BASE_URL` (default: `localhost:8000`) |

**Key service functions in `services/adsurv.ts`**:
- `fetchCompetitorAds()` – loads competitor ad library
- `fetchAdMetrics()` – performance metrics per ad
- `parseSpendValue()` – normalises `"$7K–$8K"` strings to numbers

---

### 3.5 Targeting Intelligence
| File | Role |
|------|------|
| `pages/targetingIntel.tsx` | Page shell, loads `TargetingIntel` component |
| `components/TargetingIntel.tsx` | Full targeting intelligence dashboard UI |
| `services/targetingIntel.ts` | All API calls for targeting data (622 lines) |
| `src/config.ts` | Exports `API_BASE_URL` (default: `localhost:8000`) |

**Key service functions in `services/targetingIntel.ts`**:
- JWT decoded from `localStorage('token')` to get `user_id`
- Fetches audience segments, demographic breakdowns, recommendations

---

### 3.6 Auto-Create (Campaign Builder)
| File | Role |
|------|------|
| `pages/AutoCreate.tsx` | Multi-step wizard shell, manages step state |
| `components/auto-create/StepIndicator.tsx` | Progress bar / step dots at top |
| `components/auto-create/CampaignGoalStep.tsx` | Step 1 – select campaign objective |
| `components/auto-create/PlatformSelectorStep.tsx` | Step 2 – choose ad platforms |
| `components/auto-create/AudienceStep.tsx` | Step 3 – define target audience |
| `components/auto-create/CopyMessagingStep.tsx` | Step 4 – generate ad copy with AI |
| `components/auto-create/CreativeAssetsStep.tsx` | Step 5 – upload / generate creatives |
| `components/auto-create/BudgetTestingStep.tsx` | Step 6 – budget allocation & A/B test |
| `src/config.ts` | Exports `AUTOCREATE_API_URL` (default: `localhost:5050`) |

**Step flow**:
```
AutoCreate.tsx (wizard state)
  step 1 → CampaignGoalStep    POST AUTOCREATE_API_URL/api/campaign-goal
  step 2 → PlatformSelector    (local state only)
  step 3 → AudienceStep        (local state)
  step 4 → CopyMessagingStep   POST AUTOCREATE_API_URL/api/... (copy gen)
  step 5 → CreativeAssetsStep  (uploads / image gen)
  step 6 → BudgetTestingStep   (local state)
```

---

### 3.7 Image / Ad Generation
| File | Role |
|------|------|
| `components/GenerateAdPopup.tsx` | Modal popup – generate ad images via AI |
| `services/imageGeneration.ts` | API wrapper for image generation REST API |
| `src/config.ts` | Exports `IMAGE_GEN_API_URL` (`:5002`) and `IMAGE_GEN_REST_URL` (`:5006/api`) |

**API calls**:
```
POST IMAGE_GEN_API_URL/image_gen           → generate new image from prompt
GET  IMAGE_GEN_API_URL/check_local_image/:taskId  → poll for image readiness
```

---

### 3.8 Video Analysis
| File | Role |
|------|------|
| `pages/VideoAnalysis.tsx` | Full video ad analysis dashboard |
| `services/supabase.ts` | Supabase client singleton (reads video metadata from DB) |

**Data source**: Supabase PostgreSQL via `@supabase/supabase-js`
- Supabase URL/key from `.env` → `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- Queries video records, influencer data, pacing analysis, emotion scores

---

### 3.9 Onboarding
| File | Role |
|------|------|
| `components/OnBoarding.tsx` | Post-signup onboarding wizard (brand setup) |
| `components/Navigation.tsx` | Authenticated top nav bar used inside app pages |
| `pages/navbar.tsx` | Alternative navbar page/component |

---

### 3.10 Booking
| File | Role |
|------|------|
| `pages/BookingPage.tsx` | Book a demo / consultation page |

---

## 4. Shared Infrastructure

### Configuration (`src/config.ts`)
Single source of truth for all environment variables. Every service URL is exported from here.

```
config.ts
  ├── SUPABASE_URL          ← VITE_SUPABASE_URL
  ├── SUPABASE_ANON_KEY     ← VITE_SUPABASE_ANON_KEY
  ├── API_BASE_URL          ← VITE_API_BASE_URL       (default: :8000)
  ├── AUTH_API_URL          ← VITE_AUTH_API_URL        (default: :5003)
  ├── GENAI_API_URL         ← VITE_GENAI_API_URL       (default: :5002)
  ├── IMAGE_GEN_API_URL     ← VITE_IMAGE_GEN_API_URL   (default: :5002)
  ├── IMAGE_GEN_REST_URL    ← VITE_IMAGE_GEN_REST_URL  (default: :5006/api)
  └── AUTOCREATE_API_URL    ← VITE_AUTOCREATE_API_URL  (default: :5050)
```

### Environment Files
| File | Committed | Purpose |
|------|:---------:|---------|
| `.env` | ❌ (git-ignored) | Real values for local dev |
| `.env.example` | ✅ | Template – copy to `.env` and fill in |
| `src/env.d.ts` | ✅ | TypeScript types for `import.meta.env.*` |

### UI Primitives (`src/components/ui/`)
Reusable, unstyled-then-styled components used across all pages:
- `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`, `field.tsx` – form primitives
- `separator.tsx` – horizontal rule
- `stateful-button.tsx` – button with loading/success states
- `animation.css` – keyframe animations shared by UI components

### Styling
| File | Role |
|------|------|
| `src/index.css` | Global Tailwind base + CSS variables |
| `src/App.css` | App-level overrides |
| `src/styles/colors.ts` | Centralised colour palette object (used in inline styles) |

### Library Wrappers (`src/lib/`)
- `utils.ts` – `cn()` helper (clsx + tailwind-merge) used everywhere for conditional class names

---

## 5. Backend Services Map

| Service | Default Port | Used By |
|---------|:---:|---------|
| Main FastAPI backend | `:8000` | Ad Surveillance, Targeting Intel |
| Auth service | `:5003` | Login, Signup |
| GenAI / Chat service | `:5002` | Command Center, ChatInput |
| Image generation | `:5002` | GenerateAdPopup |
| Image generation REST | `:5006` | imageGeneration.ts |
| AutoCreate / Campaign | `:5050` | CampaignGoalStep, CopyMessagingStep |
| Supabase (cloud) | hosted | VideoAnalysis, supabase.ts |

---

## 6. Data Flow Diagram

```
Browser
  │
  ├─ Auth flow
  │    Login-form / Signup-form
  │      └── POST :5003/login|signup
  │            └── JWT → localStorage('token')
  │
  ├─ Protected pages (check localStorage for token)
  │    ProtectedRoute.tsx reads token → allow or redirect to /
  │
  ├─ Ad Surveillance
  │    AdSurveillance.tsx
  │      └── services/adsurv.ts
  │            └── GET/POST :8000/api/...
  │
  ├─ Targeting Intel
  │    TargetingIntel.tsx
  │      └── services/targetingIntel.ts
  │            └── GET/POST :8000/api/...  (JWT in header)
  │
  ├─ Command Center (AI Chat)
  │    CommandCenter.tsx / ChatInput.tsx
  │      └── POST :5002/genai_call
  │
  ├─ Auto-Create
  │    AutoCreate.tsx → step components
  │      └── POST :5050/api/campaign-goal
  │      └── POST :5050/api/...
  │
  ├─ Image Generation
  │    GenerateAdPopup.tsx
  │      └── POST :5002/image_gen
  │      └── GET  :5002/check_local_image/:taskId (polling)
  │
  └─ Video Analysis
       VideoAnalysis.tsx
         └── services/supabase.ts
               └── Supabase SDK → cloud PostgreSQL
```

---

## 7. File Count Summary

| Directory | Files | Purpose |
|-----------|:-----:|---------|
| `src/pages/` | 12 | Full-page route components |
| `src/components/` | ~25 | Reusable UI components |
| `src/components/auto-create/` | 7 | Campaign wizard steps |
| `src/components/ui/` | 20 | Design-system primitives |
| `src/services/` | 5 | API abstraction layer |
| `src/utils/` | 1 | Shared utilities |
| `src/styles/` | 1 | Color palette |
| `src/lib/` | 1 | `cn()` class helper |
| Root config | 4 | `config.ts`, `env.d.ts`, `.env`, `.env.example` |
