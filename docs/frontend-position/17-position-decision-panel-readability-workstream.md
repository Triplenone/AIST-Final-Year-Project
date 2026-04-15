# Position Decision Panel Readability and Sticky Balance Workstream

## Objective

- improve the right-side decision panel readability on `/position`
- make the panel header and refresh action clearer without overpowering the center map stage
- keep all changes CSS-scoped and preserve Position behavior

## Branch

- `ben/frontend-only-improve`

## Visual thesis

- a restrained operator briefing column: sticky context at the top, clearer state messaging, and quieter grouped sections underneath

## Target files

- `frontend/src/styles/position-page.css`
- `docs/frontend-position/17-position-decision-panel-readability-workstream.md`

## Protected surfaces

- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/PositionPage.tsx`
- `frontend/src/components/position/PositionDecisionPanel.tsx`
- backend files and payload contracts
- route contract
- auth persistence
- theme persistence
- `frontend/src/pages/FlyCarePage.tsx`

## Forbidden changes

- no adapter or polling changes
- no route or data-flow changes
- no backend changes
- no map-stage or resident-rail changes beyond shared inherited selectors
- no FlyCare edits

## Acceptance

- panel title, refresh action, and state messaging stay readable in light and dark mode
- sticky behavior supports the workspace on desktop and relaxes on narrower layouts
- ready-state hero and section blocks gain clearer hierarchy without becoming another card wall
- mobile keeps clean stacking and no horizontal overflow

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/position` in light, dark, and mobile
- inspect `git diff --name-only`
