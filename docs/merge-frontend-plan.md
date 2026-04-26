# Merge + Frontend Phase Plan

## Purpose

This document tracks the Ben-based frontend phase after backend merge Slice A+B landed on `ben/merge-backend-slices-rescue`.

Reader: future Codex, frontend maintainer, PR reviewer.

---

## Phase 1: Backend Merge (staged backport)

### Strategy
- Ben-based, slice-by-slice backend-only backport from `origin/Lin-saved-cleanup-release` (`7a6cf5c`)
- Integration branch: `ben/merge-backend-slices-rescue`
- Base: `origin/ben/frontend-only-improve` (`9473b23`)
- No direct merge. No whole-commit cherry-pick.

### Completed slices

| Slice | Commit | Scope |
|-------|--------|-------|
| A | `417a73d` | Mongo foundation, config, router registration, graceful 503 |
| B | `c0918e7` | Additive `avatar_url`, `family_summary` placeholder at `/api/v1/family-summary` |
| C | `9a47204` | MQTT device mapping + sync Mongo writes |
| D | `0d5f0f2` | vitals event bridge `GET /vitals/user/{user_id}/history` + Device.mac_address String(32) |

---

## Phase 2: Frontend Features

### Status

| Feature | Status | Commit | Notes |
|--------|--------|--------|-------|
| 4 - `/location` redirect + nav labels | complete | `e45d768` | `/location` preserved and redirected to `/position` |
| 1 - Family resident grid | complete | `5d1f0f8` | Uses `/api/v1/residents/` with additive `avatar_url` |
| 3 - Family today summary | complete | `2063281` | Selected resident only; uses `/api/v1/family-summary/today` |
| 2 - Family vitals history | complete with fallback | `0cb4bbb` | Uses user history endpoint; 404/503 maps to graceful fallback until Slice D lands |
| 5 - Residents vitals modal | complete with fallback | `518eb87` | Reuses `VitalsHistoryPanel`; preserves residents table state |

### Protected surfaces respected
- `backend/**` untouched during frontend phase
- `frontend/src/pages/FlyCarePage.tsx` untouched
- `frontend/src/adapters/position-command-center.ts` untouched
- Existing route paths preserved
- Auth persistence and theme persistence untouched

### Validation
- `npm run build`
- `npm run lint`
- `git diff -- backend/`
- `git diff -- frontend/src/pages/FlyCarePage.tsx`
- `git diff -- frontend/src/adapters/position-command-center.ts`

### Remaining backend dependency
All backend slices (A-D) landed. `/api/v1/mongo-upstream/vitals/user/{id}/history` is live. Frontend vitals UI will show real data when MongoDB has upstream documents.

---

## Phase 3: Guarded `ben/ee-main` Frontend Merge

### Strategy
- Integration branch: `ben/merge-ee-main-frontend-guarded`
- Source: local-only `ben/ee-main` at `7840429` (`2026-04-26 10:06:30 +08:00`)
- Target: `main` / `origin/main` at `a246837`
- GitHub finding: `ben/ee-main` is not present on GitHub; this merge used the local branch as the only source.
- No raw branch merge, no full `frontend/` overwrite, and no `git restore --source ben/ee-main -- frontend` without compatibility restoration.

### Imported frontend intent
- Family primary resident briefing UI:
  - `frontend/src/components/family/PrimaryResidentBriefing.tsx`
  - `frontend/src/utils/resident-slug.ts`
- Caregiver primary-resident routing in `frontend/src/App.tsx`
- Family page primary briefing composition in `frontend/src/pages/FamilyPage.tsx`
- Overview FlyCare entry polish and shell/header visual polish
- Additive `family.briefing.*` i18n keys

### Protected surfaces preserved
- `backend/**`, `database/**`, and `infra/**` untouched.
- Backend URL behavior stays host-dynamic through current `frontend/src/constants/backend.ts`.
- Current API contracts in `frontend/src/services/api.ts` and `frontend/src/hooks/useVitalsHistory.ts` preserved.
- Fall/SOS alert handling still includes both `fall` and `sos`.
- Current Position map show-all/current behavior preserved.
- Admin events/residents table behavior preserved.
- `_lin_mem` checked and intentionally left untouched; newer Lin logs were not replaced by `ben/ee-main`.

### Validation result
- `git diff --name-status`: expected frontend/docs/_ben_mem files only, plus untracked `.claude/` left out of commit.
- Protected path guard: no changes under `backend/`, `database/`, `infra/`, `_lin_mem`, `.claude/`, `run-logs/`, or SQL backups.
- `git diff --check -- frontend docs _ben_mem`: passed; only Git CRLF working-copy warnings were printed.
- `cd frontend && npm run lint`: passed.
- `cd frontend && npm run test`: passed, 2 files and 23 tests.
- `cd frontend && npm run build`: passed; Vite reported the existing `services/api.ts` dynamic/static import chunking warning.
- Backend smoke passed: `/health`, `/api/v1/residents/`, `/api/v1/events/`, `/api/v1/mongo-upstream/status`.
- Route/browser smoke passed: `/`, `/family`, `/position`, `/flycare`, `/admin`, `/residents`; `/family` shows the caregiver primary briefing, and Admin Events tab shows the events table.

---

## Recovery reading order

1. `_ben_mem/PROTO.md`
2. `_ben_mem/CURR.mem`
3. This file (`docs/merge-frontend-plan.md`)
4. `docs/frontend-position/11-backend-facing-boundary.md`
5. `AGENTS.md`

---

## Decision log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-13 | Finish frontend phase before Slice C/D | Slice A+B already unlock Feature 1, 3, and 4; Feature 2 and 5 can ship with graceful fallback |
| 2026-04-13 | Keep `/location` route and redirect | Preserve URL compatibility |
| 2026-04-13 | Bind family summary to selected resident only | Avoid silent fallback to the first resident |
| 2026-04-13 | Keep vitals history on user endpoint only | Device mapping remains a Slice D gate |
| 2026-04-16 | Complete Slice C/D before merge to main | All backend slices needed for complete feature set |
