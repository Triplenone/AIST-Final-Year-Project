# Position Presentation Recovery Workstream

## Objective

- restore readable dark-mode contrast on `/position`
- integrate `frontend/src/assets/brand/texture-eldercare-exact-full.svg` as the active Position background layer
- keep the eldercare PNG out of source usage

## Branch

- `ben/frontend-only-improve`

## Target files

- `frontend/src/styles/position-page.css`
- `docs/frontend-position/13-position-presentation-recovery-workstream.md`

## Protected surfaces

- `frontend/src/adapters/position-command-center.ts`
- `frontend/src/pages/PositionPage.tsx`
- backend files and payload contracts
- route contract
- auth persistence
- theme persistence
- Position map source and zone derivation

## Forbidden changes

- no adapter logic changes
- no route changes
- no backend changes
- no FlyCare changes

## Acceptance

- dark mode keeps resident rail tiles, selected resident card, map command strip, summary blocks, and decision-panel controls readable
- Position uses the repo-local eldercare exact SVG as its background asset
- no PNG fallback is introduced in source
- light mode remains visually stable
- `/position` keeps current sticky and responsive behavior

## Validation

- `npm run build`
- `npm run lint`
- Playwright dark-mode and light-mode checks on `/position`
- inspect `git diff --name-only`
