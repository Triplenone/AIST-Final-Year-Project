# Residents Workspace Utility Pass Workstream

## Objective

- make `/residents` read like an operator roster workspace instead of a plain admin table
- prioritize status, filters, and resident context without changing resident CRUD or backend contracts
- keep empty, loading, and error states explicit in both themes

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

- `frontend/src/components/admin/ResidentsAdmin.tsx`
- `frontend/src/styles/residents-admin.css`

## Changes

- turned the residents surface into one workspace with an intro, control rail, operator summary, and roster table shell
- added a route-scoped CSS file instead of growing shared admin styling in `global.css`
- promoted filter state and roster counts above the table so the current slice is readable at a glance
- tightened row scanning with stacked cell content for resident identity, last seen context, and device detail
- replaced plain loading and error strings with explicit state banners while keeping the original fetch and filter behavior

## Acceptance result

- table scanning is faster because the active slice, counts, and device context are visible before the user reaches the grid
- filters and refresh controls now read as the primary utility actions
- empty, loading, and error states remain explicit in light and dark themes
- `/residents` mobile keeps table overflow inside the roster shell instead of the page

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/residents` light desktop
- Playwright `/residents` dark desktop
- Playwright `/residents` mobile light
- Playwright `/admin` resident tab smoke

## Blockers kept out of scope

- React Router future warnings remain unchanged
- no resident CRUD behavior, route composition, backend payload, auth, or theme persistence changes
- `/admin` still shares the same resident component, so ready-state behavior continues to depend on the same upstream resident API
