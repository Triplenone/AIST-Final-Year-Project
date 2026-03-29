# FlyCare Panel Badge Removal Workstream

## Objective

- remove the stray FlyCare badge from the info panel header
- restore the panel header to the shared operational layout

## Branch

- `ben/frontend-only-improve`

## Target files

- `frontend/src/styles/app-shell.css`

## Protected surfaces

- `frontend/src/pages/FlyCarePage.tsx`
- polling behavior
- zone logic
- drawer behavior
- device mapping behavior
- backend files and payload contracts

## Acceptance

- FlyCare info panel header no longer renders the badge beside `Refresh`
- the header keeps the title and refresh control aligned cleanly
- no workflow logic changes

## Validation

- `npm run build`
- `npm run lint`
- Playwright smoke on `/flycare`
