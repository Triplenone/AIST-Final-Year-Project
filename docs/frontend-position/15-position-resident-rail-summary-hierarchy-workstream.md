# Position Resident Rail and Summary Hierarchy Workstream

## Objective

- reduce the card-wall feel on the left side of `/position`
- make resident scanning faster through a tighter queue and a lighter summary strip
- keep selected resident context readable without changing Position logic

## Branch

- `ben/frontend-only-improve`

## Visual thesis

- a compact clinical queue: lighter signal strip on top, stronger selected resident lane, calmer summary context underneath

## Target files

- `frontend/src/styles/position-page.css`
- `docs/frontend-position/15-position-resident-rail-summary-hierarchy-workstream.md`

## Protected surfaces

- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/components/position/PositionResidentRail.tsx`
- `frontend/src/components/position/PositionSummaryBar.tsx`
- backend files and payload contracts
- route contract
- auth persistence
- theme persistence

## Forbidden changes

- no adapter logic changes
- no route changes
- no backend changes
- no map-stage or decision-panel styling changes beyond shared inherited tokens
- no FlyCare edits

## Acceptance

- resident rail reads as a queue instead of stacked generic cards
- selected resident state is stronger through one clear accent treatment
- summary strip scans faster than the previous four equal-weight tiles
- selected resident summary reads as operational context, not another generic card block
- light and dark mode stay readable
- `/position` keeps responsive behavior and no horizontal overflow

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/position` in light, dark, and mobile
- inspect `git diff --name-only`
