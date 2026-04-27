# Setup

This runbook describes how to run the **implemented prototype**:

- **Backend**: `backend/backend/` (FastAPI, port 8000)
- **Primary UI**: `frontend/` (React/Vite, port 5173)

## Prereqs (repo evidence)

- Node.js (CI uses Node 20: `.github/workflows/ci-frontend.yml`)
- Python (CI uses Python 3.11: `.github/workflows/ci-backend.yml`)
- MySQL database (schema file: `database/mysql/Dump20260426.sql`)

## Backend (FastAPI)

### Configure env vars

Backend loads `.env` via `backend/backend/app/config.py`.

- Template: `backend/backend/.env.example`
- Active file: `backend/backend/.env`

### Install + run

```bash
cd backend/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify:

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/docs`
- The frontend dev server proxies `/api/*`, `/sim/*`, and `/health` to this backend, so the backend can stay bound to localhost for LAN and tunnel demos.

## Frontend (primary UI)

### Backend routing

Frontend API calls use same-origin paths configured in:

- `frontend/src/constants/backend.ts`

During local development, Vite proxies those paths to `http://127.0.0.1:8000` via:

- `frontend/vite.config.ts`

### Install + run

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173`.

For phones or other devices on the same Wi-Fi/LAN, open the computer's LAN address, for example `http://192.168.48.18:5173`. The page and API use this one frontend URL; no device needs to access port `8000` directly.

For devices on a different Wi-Fi/network, expose only the frontend dev server through a temporary HTTPS tunnel:

```bash
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://127.0.0.1:5173
```

Use the generated `https://*.trycloudflare.com` URL on the remote device. Vite is configured to allow that tunnel hostname and proxy API calls back to the local backend.

### Optional: custom public domain

To use `smartcare2026.com` instead of a temporary `trycloudflare.com` URL, the domain must be registered and controlled in Cloudflare first. Current repo-side Vite config already allows:

- `smartcare2026.com`
- `www.smartcare2026.com`

Tested tunnel setup:

```bash
npx wrangler login
npx wrangler tunnel create smartcare2026
npx wrangler tunnel run smartcare2026
```

Current tunnel ID:

```text
babedbb3-a829-4d58-8102-9acc3016f72d
```

Cloudflare tunnel ingress is configured for:

- `smartcare2026.com` -> `http://127.0.0.1:5173`
- `www.smartcare2026.com` -> `http://127.0.0.1:5173`

Required DNS after the domain exists in the Cloudflare account:

```text
smartcare2026.com      CNAME babedbb3-a829-4d58-8102-9acc3016f72d.cfargotunnel.com
www.smartcare2026.com  CNAME babedbb3-a829-4d58-8102-9acc3016f72d.cfargotunnel.com
```

If the domain is not registered, not added as a Cloudflare zone, or the account lacks zone/DNS permissions, the tunnel can be healthy but `https://smartcare2026.com` will not resolve.

### Optional: frontend scripts (verified in `frontend/package.json`)

- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`

## Optional (recommended for a full demo): Initialize the MySQL DB

DB name: `smart_elderly_care_system` (created in `database/mysql/Dump20260426.sql`).

- **DB import command**: Not found in repo.
- Use your preferred MySQL client/tooling (e.g., GUI import) to load `database/mysql/Dump20260426.sql`.

## Optional: Admin CRUD UI (legacy / not primary)

This UI is separate from the primary `frontend/` app:

```bash
cd backend/forntend
npm install
npm run dev
```

Default dev port is `http://localhost:3000` (see `backend/forntend/vite.config.js`).
