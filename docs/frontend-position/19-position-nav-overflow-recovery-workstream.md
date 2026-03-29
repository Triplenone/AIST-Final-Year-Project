# Position Nav Overflow Recovery

## Objective

- fix the Position header navigation clipping on desktop
- keep all primary nav items visible without changing routes, labels, or runtime behavior
- preserve the recently rebalanced light-mode shell and the existing dark-mode treatment

## Target files

- `frontend/src/styles/app-shell.css`

## Protected surfaces

- `backend/backend/`
- backend routes and payload contracts
- database schema
- route contract
- auth persistence
- theme persistence
- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/FlyCarePage.tsx`

## Problem statement

- the Position route header brand block and nav were competing for width inside the shared shell grid
- the nav was still sizing close to its content width, so the last items were clipped from the visible area
- the issue was visual/layout only; no route data or link set was missing

## Change summary

- changed the Position route brand block to a vertical stack so the lockup and context pills stop consuming a long single row
- constrained the Position route nav to the remaining header track width instead of letting it size to content width
- kept the mobile reset so the context padding stays zero on narrow viewports

## Acceptance

- all Position nav items remain visible on desktop in normal browsing width
- dark mode remains readable
- mobile nav remains scrollable without horizontal page overflow
- no route, backend, or Position logic changes are introduced

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/position` light desktop, dark desktop, and mobile
- confirm header inner `scrollWidth` equals `clientWidth`

## Outcome

- desktop Position header no longer clips `Family engagement` and `Admin`
- the fix stays scoped to `app-shell.css`
- exact SVG background usage remains unchanged
