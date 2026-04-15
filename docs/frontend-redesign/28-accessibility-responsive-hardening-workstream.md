# Accessibility and Responsive Hardening Workstream

## Objective

- close keyboard focus, narrow-width spacing, and reduced-motion gaps across the shared shell and the key operator routes
- improve visibility of keyboard focus without changing route behavior or backend contracts
- keep the work bounded to shell CSS and legacy FlyCare-compatible CSS only

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

- `frontend/src/styles/app-shell.css`
- `frontend/src/styles/global.css`

## Changes

- added explicit keyboard focus rings for shared header nav links, including active links
- added visible focus treatment for quick-actions controls and panel focus-within state
- added visible focus treatment for FlyCare legacy grid cells, refresh buttons, and simulate button
- reduced shell and stage padding for very narrow widths and tightened floating quick-actions spacing
- added shell-level scroll-margin for focused controls under the fixed header
- disabled shell and FlyCare drawer animation/transition effects in `prefers-reduced-motion`

## Acceptance result

- keyboard focus is now visible across shell navigation, quick actions, and key FlyCare controls
- narrow widths from `320`, `360`, and `393` keep `overflowX=false` on `/`, `/position`, `/flycare`, and `/residents`
- reduced-motion checks show no shell panel animation and no FlyCare drawer animation
- no route, backend, auth, or theme persistence behavior changed

## Validation

- `npm run build`
- `npm run lint`
- Playwright mobile width smoke on `/`, `/position`, `/flycare`, `/residents`
- Playwright keyboard focus smoke on `/`, `/position`, `/residents`
- Playwright quick-actions focus smoke
- Playwright reduced-motion smoke on `/flycare`

## Blockers kept out of scope

- React Router future warnings remain unchanged
- Vite CJS deprecation warning remains unchanged
- upstream `status_update` and `mongo-upstream` runtime failures remain unchanged
- Recharts width/height warnings on overview remain unchanged
