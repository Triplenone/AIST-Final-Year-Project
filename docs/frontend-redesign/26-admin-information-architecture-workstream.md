# Admin Information Architecture Workstream

## Objective

- tighten `/admin` into a clear control-room surface instead of a loose stack of tabs plus raw CRUD cards
- make tab intent, current workspace, and operator guidance obvious without changing admin workflows
- preserve backend contracts, auth/session behavior, route paths, and existing admin CRUD logic

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

- `frontend/src/components/admin/AdminSection.tsx`
- `frontend/src/styles/global.css`

## Changes

- rebuilt `AdminSection` into a control-room frame with summary cards, a stronger workspace tab rail, active-workspace briefing, and operator guidance aside
- added tab metadata so each admin domain communicates what it controls, which endpoint family it maps to, and what an operator should verify first
- kept each admin CRUD component intact while route-scoping visual overrides under `.admin-section--workspace`
- tightened admin cards, tables, forms, and modal surfaces inside `/admin` only, so `/residents` keeps its separate utility treatment

## Acceptance result

- tab priorities are clearer
- the active workspace now explains what the operator is managing before the CRUD surface begins
- operational content outweighs decorative chrome
- light, dark, and narrow-width layouts remain readable without page overflow

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/admin` light desktop
- Playwright `/admin` dark desktop
- Playwright `/admin` narrow-width dark
- Playwright `/admin` Users tab smoke
- Playwright `/admin` Events tab smoke

## Blockers kept out of scope

- React Router future warnings remain unchanged
- Vite CJS deprecation warning remains unchanged
- bundle-size warning remains unchanged
- no admin API behavior, auth/session state, route contract, or backend logic changes
