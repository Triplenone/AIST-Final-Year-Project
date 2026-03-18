# Setup

This runbook describes how to run the **implemented prototype**:

- **Backend**: `backend/backend/` (FastAPI, port 8000)
- **Primary UI**: `frontend/` (React/Vite, port 5173)

## Quick start (Docker, recommended)

Prereq: Docker + Docker Compose.

```bash
docker compose -f docker-compose.demo.yml up --build
```

Open:

- UI + API: `http://localhost:8000`
- Health: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

Trigger a fall payload:

```bash
docker compose -f docker-compose.demo.yml exec backend python test_data_reception.py
```

Reset DB (if you want a clean import):

```bash
docker compose -f docker-compose.demo.yml down -v
```

## Local setup (no Docker)

### Prereqs (repo evidence)

- Node.js (CI uses Node 20: `.github/workflows/ci-frontend.yml`)
- Python (CI uses Python 3.11: `.github/workflows/ci-backend.yml`)
- MySQL database (schema file: `backend/Dump20251120.sql`)

### Initialize the MySQL DB

DB name: `smart_elderly_care_system` (created in `backend/Dump20251120.sql`).

```bash
# macOS / Linux
mysql -u root -p < backend/Dump20251120.sql

# Windows PowerShell
Get-Content backend\Dump20251120.sql | mysql -u root -p
```

### Backend (FastAPI)

Backend loads `.env` via `backend/backend/app/config.py`.

- Template: `backend/backend/.env.example`
- Local file: copy `.env.example` to `.env` and edit values

```bash
cd backend/backend
# macOS / Linux
cp .env.example .env
# Windows PowerShell
copy .env.example .env
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify:

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/docs`

### Frontend (primary UI)

Frontend backend URL is hard-coded (no `import.meta.env` in this repo):

- `frontend/src/constants/backend.ts`

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
