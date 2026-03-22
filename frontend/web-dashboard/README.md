# Legacy SmartCare Web Dashboard (static)

This folder contains an **older, frontend-only dashboard**. It is **not the primary demo UI** for this repo.

- **Primary demo UI**: [`../`](../) (React/Vite)
- **Backend API**: [`../../backend/backend/`](../../backend/backend/) (FastAPI)

## What this is

- Static HTML/CSS/JS served by any static server.
- Contains its own legacy mock/SSE scripts (e.g. `sw-sse.js`, `sse-client.js`).
- Does **not** depend on the FastAPI `/api/v1/*` backend.

## How to run (verified)

```bash
cd frontend/web-dashboard
python -m http.server 5500
```

Open `http://localhost:5500`.

## Not found / not applicable

- No `package.json` exists in this directory → `npm install` / `npm run dev` are **not applicable here**.
