# FlyCare Header Brand Lockup Workstream

## Objective

- remove the eldercare SmartCare mark from the FlyCare route header
- give `/flycare` its own route-correct header mark without changing workflow logic

## Branch

- `ben/frontend-only-improve`

## Target files

- `frontend/src/components/shell/AppHeader.tsx`
- `frontend/src/styles/app-shell.css`

## Protected surfaces

- `frontend/src/pages/FlyCarePage.tsx`
- polling behavior
- zone logic
- drawer behavior
- device mapping behavior
- backend files and payload contracts

## Acceptance

- FlyCare header no longer renders the SmartCare / Proactive Guardian Care mark
- FlyCare header uses the FlyCare route asset instead
- desktop and mobile FlyCare header alignment stays stable
- overview and other routes keep the SmartCare mark

## Validation

- `npm run build`
- `npm run lint`
- Playwright smoke on `/flycare` and `/`
- verify asset source paths remain repo-local
