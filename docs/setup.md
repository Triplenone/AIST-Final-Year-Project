# Setup

This runbook describes how to run the **implemented prototype**:

- **Backend**: `backend/backend/` (FastAPI, port 8000)
- **Primary UI**: `frontend/` (React/Vite, port 5173)

## Prereqs (repo evidence)

- Node.js (CI uses Node 20: `.github/workflows/ci-frontend.yml`)
- Python (CI uses Python 3.11: `.github/workflows/ci-backend.yml`)
- MySQL database (schema file: `backend/Dump20251120.sql`)

## Backend (FastAPI)

### Configure env vars

Backend loads `.env` via `backend/backend/app/config.py`.

- Template: `backend/backend/.env.example`
- Active file: `backend/backend/.env`

### Install + run

```bash
cd backend/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify:

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/docs`

## Frontend (primary UI)

### Configure backend base URL

Frontend backend URL is hard-coded (no `import.meta.env` in this repo):

- `frontend/src/constants/backend.ts`

### Install + run

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Optional: frontend scripts (verified in `frontend/package.json`)

- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`

## Optional (recommended for a full demo): Initialize the MySQL DB

DB name: `smart_elderly_care_system` (created in `backend/Dump20251120.sql`).

- **DB import command**: Not found in repo.
- Use your preferred MySQL client/tooling (e.g., GUI import) to load `backend/Dump20251120.sql`.

## Optional: Admin CRUD UI (legacy / not primary)

This UI is separate from the primary `frontend/` app:

```bash
cd backend/forntend
npm install
npm run dev
```

Default dev port is `http://localhost:3000` (see `backend/forntend/vite.config.js`).
