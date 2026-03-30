# Performance and Asset Hygiene Workstream

## Objective

- reduce frontend delivery weight without changing route behavior or backend contracts
- split the monolithic entry bundle into route and vendor chunks
- keep exact SVG brand assets in place where the repo requires them, while documenting their retained cost explicitly

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

- `frontend/src/App.tsx`
- `frontend/src/styles/app-shell.css`
- `frontend/vite.config.ts`

## Changes

- converted route-heavy surfaces in `App.tsx` to `React.lazy` so Overview, Residents, Location, Position, FlyCare, and Admin load on demand instead of entering the initial bundle together
- added a small route loading shell so lazy route transitions never flash an empty stage
- configured `vite.config.ts` with stable manual chunks for React, i18n, motion, maps, charts, and remaining vendor code
- kept exact SVG brand assets unchanged and verified there are still no Windows absolute paths in source

## Acceptance result

- the original `index` JavaScript chunk dropped from `1117.47 kB` to `72.14 kB`
- the build no longer emits the Vite chunk-size warning
- route smoke checks on `/`, `/position`, `/flycare`, and `/admin` complete without horizontal overflow or stuck lazy fallback
- exact SVG assets remain active for Position, FlyCare, and shared branding by design

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/`, `/position`, `/flycare`, `/admin`
- source search for Windows absolute paths

## Blockers kept out of scope

- Vite CJS deprecation warning remains unchanged
- React Router future warnings remain unchanged at runtime
- upstream `status_update` and `mongo-upstream` runtime failures remain unchanged
- exact SVG brand files are still very large, but they were intentionally retained because repo rules require exact SVG usage first
