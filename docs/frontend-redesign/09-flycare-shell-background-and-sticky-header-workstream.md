# Shell Spacing, Controls, And FlyCare Top Rail Workstream

## Objective

- remove excess dead space under the shared shell header
- make the FlyCare ambient texture fill the viewport responsively instead of sitting in a narrow strip
- pin the FlyCare title rail to the top of the viewport
- make the shared quick-actions control stay fixed above scroll and recover dark-mode readability

## Branch

- `ben/frontend-only-improve`

## Visual thesis

- compact operator shell with persistent chrome, no oversized dead air, and route-specific texture that reads as part of the workspace instead of a boxed decoration

## Interaction thesis

- top rail stays pinned while the workspace moves
- quick-actions control stays viewport-fixed and above content during scroll
- dark-mode controls keep readable foreground contrast instead of fading into the panel

## Target files

- `frontend/src/App.tsx`
- `frontend/src/styles/app-shell.css`
- `docs/frontend-redesign/09-flycare-shell-background-and-sticky-header-workstream.md`

## Protected surfaces

- `frontend/src/pages/FlyCarePage.tsx`
- map image source
- polling behavior
- zone logic
- drawer behavior
- device mapping behavior
- backend files and payload contracts

## Acceptance

- shared shell top gap is materially reduced on `/position`
- FlyCare title rail stays pinned at the top of the viewport
- FlyCare ambient texture scales to the viewport instead of remaining boxed into the shell width
- quick-actions toggle stays fixed and topmost while scrolling
- quick-actions dark-mode panel text remains readable
- no workflow logic changes

## Validation

- `npm run build`
- `npm run lint`
- Playwright smoke on `/position`
- Playwright smoke on `/flycare`
