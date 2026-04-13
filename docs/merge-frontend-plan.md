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

### Pending slices

| Slice | Status | Gate |
|-------|--------|------|
| C | not started | MQTT raw ingest only; no frontend dependency |
| D | not started | `vitals_event_bridge` blocked by device mapping strategy; `Device.mac_address` remains `String(20)` vs 22-char external ID |

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
- `/api/v1/mongo-upstream/vitals/user/{id}/history` is still pending Slice D
- Family and residents vitals UI already degrade gracefully for `404/503`

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
