# Shell Foundation Workstream

## Objective

- unify the shared ambient shell for the active React routes
- establish one consistent workspace frame before route-by-route visual refinement
- leave overview art direction, Position architecture, and FlyCare workflow behavior untouched

## Branch

- `ben/frontend-only-improve`

## Target files

- `frontend/src/App.tsx`
- `frontend/src/components/shell/AppHeader.tsx`
- `frontend/src/components/shell/QuickActionsDock.tsx`
- `frontend/src/styles/tokens.css`
- `frontend/src/styles/app-shell.css`

## Protected surfaces

- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- theme persistence
- `frontend/src/pages/FlyCarePage.tsx` workflow logic
- Position page architecture and map-stage structure

## Acceptance

- the shared shell reads as one system across `/`, `/residents`, `/location`, `/operations`, `/family`, and `/admin`
- the header keeps the SmartCare mark and exposes clearer current-workspace context
- the quick actions dock has an explicit closed and open state
- `/position` keeps its wide layout
- `/flycare` keeps workflow behavior unchanged

## Validation

- `npm run build`
- `npm run lint`
- route smoke checks for `/`, `/residents`, `/location`, `/position`, `/flycare`, `/admin`
- protected-surface diff review before commit
