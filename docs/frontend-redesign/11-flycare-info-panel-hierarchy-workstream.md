# FlyCare Info Panel Hierarchy Workstream

## Objective

- tighten the right-side information hierarchy on `/flycare`
- reduce dead space in loading, empty, and error states
- improve dark-theme readability without changing FlyCare workflow logic

## Branch

- `ben/frontend-only-improve`

## Visual thesis

- the right rail should read like an operator brief: a fixed command header, a clear state card when data is missing, and denser summary cards when data exists

## Content plan

- sticky panel header with refresh control
- state card for loading, empty, and error conditions
- flight summary first
- compact two-column info grid for device, routing, alert, and health details

## Interaction thesis

- no new motion
- keep the refresh action anchored at the top while the panel body scrolls

## Target files

- `frontend/src/pages/FlyCarePage.tsx`
- `frontend/src/styles/global.css`
- `docs/frontend-redesign/11-flycare-info-panel-hierarchy-workstream.md`

## Protected surfaces

- `frontend/src/pages/FlyCarePage.tsx` workflow logic
- polling behavior
- zone logic
- flight drawer behavior
- device mapping behavior
- map image source
- backend files and payload contracts

## Forbidden changes

- no polling or fetch interval changes
- no drawer logic changes
- no map interaction changes
- no backend changes

## Acceptance

- info panel header remains anchored and scans cleanly
- loading, empty, and error states no longer leave a mostly blank panel
- live data blocks read as one operational brief with clearer grouping
- dark theme text remains legible in the right rail

## Validation

- `npm run build`
- `npm run lint`
- Playwright smoke on `/flycare`
- Playwright dark-theme check on `/flycare`
- inspect `git diff --name-only`
