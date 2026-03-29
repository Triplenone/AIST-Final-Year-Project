# FlyCare Layout Recovery Workstream

## Objective

- recover the FlyCare workspace after the latest layout regression
- remove the false full-page whitespace caused by the flight drawer entering normal layout flow
- shrink empty side-rail height and restore a compact floating drawer on desktop and mobile

## Branch

- `ben/frontend-only-improve`

## Target files

- `frontend/src/styles/global.css`
- `docs/frontend-redesign/12-flycare-layout-recovery-workstream.md`

## Protected surfaces

- `frontend/src/pages/FlyCarePage.tsx` workflow logic
- polling behavior
- zone logic
- flight update state transitions
- map image source
- backend files and payload contracts

## Forbidden changes

- no fetch logic changes
- no zone-grid changes
- no drawer behavior changes beyond visual placement and sizing
- no backend changes

## Acceptance

- the flight drawer is no longer positioned inside the FlyCare layout flow
- the FlyCare root height is not artificially stretched by the hidden drawer
- left and right panels no longer leave excessive empty space in no-data and error states
- mobile drawer presents as a bottom sheet instead of a broken in-flow column

## Validation

- `npm run build`
- `npm run lint`
- Playwright smoke on `/flycare` desktop and mobile
- inspect `git diff --name-only`
