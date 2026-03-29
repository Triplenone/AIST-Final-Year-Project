# FlyCare Header Readability Workstream

## Objective

- correct the FlyCare header lockup after the title became underscaled and low-contrast on the dark fixed rail
- keep the mark, title, and subtitle readable at desktop and mobile widths

## Branch

- `ben/frontend-only-improve`

## Target files

- `frontend/src/styles/app-shell.css`
- `docs/frontend-redesign/13-flycare-header-readability-workstream.md`

## Protected surfaces

- `frontend/src/pages/FlyCarePage.tsx`
- polling behavior
- zone logic
- drawer behavior
- map image source
- backend files and payload contracts

## Forbidden changes

- no workflow or polling edits
- no route changes
- no auth or theme persistence changes

## Acceptance

- FlyCare header title is clearly legible on the dark rail in light and dark mode
- title scale is intentionally larger than the subtitle
- mobile lockup remains compact without truncation or overlap

## Validation

- `npm run build`
- `npm run lint`
- Playwright smoke on `/flycare` desktop and mobile
- inspect header title color, font size, and lockup height
