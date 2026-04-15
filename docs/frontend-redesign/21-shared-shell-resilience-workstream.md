# Shared Shell Resilience Workstream

## Objective

- harden the shared shell on `ben/frontend-only-improve`
- fix general-route nav clipping under dense desktop layouts and 125 percent zoom
- make quick actions collapse to a true toggle footprint when closed and anchor upward when open

## Protected surfaces

- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- auth persistence
- theme persistence
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/FlyCarePage.tsx` core workflow

## Target files

- `frontend/src/components/shell/AppHeader.tsx`
- `frontend/src/components/shell/QuickActionsDock.tsx`
- `frontend/src/styles/app-shell.css`

## Changes

- added a dense-nav route class for non-FlyCare shared headers with the long 8-item nav set
- compacted general-route header spacing, brand lockup, context pills, and nav link padding so `Family engagement` and `Admin` stay visible under zoomed desktop widths
- changed quick actions to use a real hidden panel state with `aria-controls`, `aria-hidden`, and `hidden`
- moved the quick-actions panel to an absolute upward anchor so the fixed wrapper stays at toggle size when closed

## Acceptance result

- nav remains visible on overview and admin under simulated 125 percent zoom
- quick actions no longer reserve a tall hidden fixed footprint when closed
- quick actions open upward with an explicit gap above the toggle
- header spacing remains stable across `/`, `/position`, `/flycare`, and `/admin`

## Validation

- `npm run build`
- `npm run lint`
- Playwright desktop routes: `/`, `/position`, `/flycare`, `/admin`
- Playwright mobile routes: `/flycare`, `/admin`
- Playwright simulated 125 percent zoom on `/admin`

## Blockers kept out of scope

- React Router future warnings remain unchanged
- upstream `status_update` and `mongo-upstream` runtime failures remain unchanged
- no backend, route, auth, theme persistence, Position adapter, or FlyCare workflow changes
