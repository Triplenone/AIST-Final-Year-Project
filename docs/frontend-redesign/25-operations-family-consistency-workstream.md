# Operations and Family Consistency Workstream

## Objective

- make `/operations` and `/family` read as intentional utility briefs instead of placeholder single-column surfaces
- keep both routes inside the existing shared shell language without creating new route files or changing derivation logic
- preserve backend contracts, event logic, route paths, auth persistence, and theme persistence

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

## Changes

- rebuilt `/operations` into a route brief with a summary strip, alert queue, shift-focus rail, and compact coverage snapshot
- rebuilt `/family` into a communication brief with summary metrics, family-ready updates, outreach queue, and communication pulse context
- kept all alert, insight, resident, and timestamp data on the existing `alerts`, `insights`, `residentList`, `priorityResidentCount`, and `formattedTime` derivations
- added route-scoped brief styling in the shared shell instead of reviving the old generic `alert-list` and `insight-list` visuals

## Acceptance result

- both routes now feel intentional instead of placeholder surfaces
- hierarchy matches the shell language with one summary strip, one primary list, and one secondary context rail
- light and dark themes stay readable
- narrow-width layouts collapse without page overflow

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/operations` light desktop
- Playwright `/operations` dark desktop
- Playwright `/family` light desktop
- Playwright `/family` dark desktop
- Playwright `/operations` mobile light
- Playwright `/family` mobile light

## Blockers kept out of scope

- React Router future warnings remain unchanged
- no backend or event logic changes
- no new route creation and no changes to auth/theme persistence
- this run does not address bundle-size warnings or upstream runtime data gaps
