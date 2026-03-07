# Deploy Reverse Engineering to Railway

Code is ready. Follow these steps in the Railway dashboard.

---

## 1. New project from GitHub

1. Go to [railway.app](https://railway.app) → sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select your **elfsod1.0** repo (or the repo that contains `backend/` and `ml/`).

---

## 2. Configure the service

1. Open the service that was created (or **+ New** → **GitHub Repo** and select the same repo).
2. Go to **Settings** (or the service’s gear icon).

### Root Directory

- **Root Directory:** `backend`  
  (So the build and run context is the `backend/` folder.)

### Build

- **Builder:** Nixpacks (default).
- **Build Command:**  
  `pip install --no-cache-dir appnope==0.1.3 && pip install --no-cache-dir -r ml/requirements.txt`

This installs `appnope` from PyPI first to avoid a broken conda path during dependency resolution. `face-recognition` is optional (commented out in requirements) so the build succeeds on Railway; face detection is skipped if not installed.

### Start / Run

- **Start Command:**  
  `PYTHONPATH=. python ml/scripts/reverse_engineering_final.py`

(Or in **Settings** → **Deploy** / **Run** set the same as the start command.)

### System packages (ffmpeg, tesseract)

- There is a **`backend/nixpacks.toml`** that adds `ffmpeg` and `tesseract`. With Root Directory = `backend`, Nixpacks should pick it up.
- If the deploy fails with “ffmpeg not found” or “tesseract not found”, check that **Root Directory** is exactly `backend` and that `backend/nixpacks.toml` is committed.

---

## 3. Variables (environment)

In the same service, open **Variables** (or **Environment**) and add:

| Variable           | Value                               | Required |
|--------------------|-------------------------------------|----------|
| **OPENAI_API_KEY** | Your OpenAI API key (e.g. `sk-...`) | Yes      |
| **FRONTEND_URL**   | `https://elfsod1-0.vercel.app`      | No (CORS)|
| **FLASK_DEBUG**    | `false`                             | No       |

Do **not** set `PORT`; Railway sets it automatically.

---

## 4. Generate domain

1. In the service, open **Settings** → **Networking** (or **Deployments** → **Generate domain**).
2. Click **Generate domain**.
3. Copy the URL (e.g. `https://backend-production-xxxx.up.railway.app`).

---

## 5. Deploy and check logs

1. **Deploy** (push a commit or click **Redeploy**).
2. Open **Deployments** → latest deployment → **View logs**.
3. You should see:
   - `[INFO] Loading Whisper model...`
   - `[INFO] Whisper model loaded`
   - `[INFO] Starting Flask server on port XXXX (debug=False)`
4. Open `https://<your-domain>/` in a browser; you should get JSON with `"service": "reverse-engineering"`.  
   Open `https://<your-domain>/health` for `{"status":"healthy"}`.

---

## 6. Optional: use this API from the frontend

1. In Vercel (or your frontend host), add an env var:
   - **Name:** `VITE_REVERSE_ENGINEERING_API_URL`
   - **Value:** `https://<your-railway-domain>` (no trailing slash)
2. In the Video Analysis / Reverse Engineering page, call:
   - `POST ${VITE_REVERSE_ENGINEERING_API_URL}/api/analyze`  
   (You’ll need to add file upload and pass the server path or extend the API to accept uploads.)

---

## Quick checklist

- [ ] Root Directory = `backend`
- [ ] Build command = `pip install -r ml/requirements.txt`
- [ ] Start command = `PYTHONPATH=. python ml/scripts/reverse_engineering_final.py`
- [ ] `backend/nixpacks.toml` exists (ffmpeg, tesseract)
- [ ] Variables: `OPENAI_API_KEY`, optionally `FRONTEND_URL`, `FLASK_DEBUG=false`
- [ ] Domain generated; `/` and `/health` return JSON
