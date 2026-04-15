# Position Header and Shell Readability Workstream

## Objective

- make the Proactive Guardian Care route identity read clearly inside the shared shell
- strengthen brand, subtitle, context pills, and nav readability on `/position`
- keep the change scoped to route-position shell selectors only

## Branch

- `ben/frontend-only-improve`

## Visual thesis

- a calm clinical command rail: dark shell frame, warm active state, bright brand copy, restrained navigation chrome

## Target files

- `frontend/src/styles/app-shell.css`
- `docs/frontend-position/14-position-header-shell-readability-workstream.md`

## Protected surfaces

- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/PositionPage.tsx`
- backend files and payload contracts
- route contract
- auth persistence
- theme persistence
- FlyCare route visuals

## Forbidden changes

- no backend changes
- no adapter logic changes
- no route changes
- no Position content-surface changes
- no FlyCare piggyback edits

## Acceptance

- Proactive Guardian Care title and subtitle remain readable in light and dark mode
- the Position top rail feels distinct from FlyCare while staying inside the shared shell system
- nav items and active state remain readable at desktop and mobile sizes
- `/position` keeps sticky top rail behavior with no horizontal overflow

## Validation

- `npm run build`
- `npm run lint`
- Playwright `/position` in light, dark, and mobile
- inspect `git diff --name-only`
