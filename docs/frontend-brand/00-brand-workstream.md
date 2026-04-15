# Frontend Brand Integration Workstream

## 1. Workstream identity

This is a new brand integration workstream.

This is not Position Phase 4.

This workstream starts on top of a completed Position rebuild.

## 2. Current repo reality

Current branch:
- `ben/frontend-only-improve`

Current Position state:
- Phase 1 complete
- Phase 2 complete
- Phase 3 complete

Current protected surface:
- `frontend/src/pages/FlyCarePage.tsx` remains protected for workflow logic

Current backend state:
- live backend validation is still blocked
- blocker: `backend/backend/.env` contains extra keys rejected by current `Settings` validation

## 3. Exact asset source paths

SVG exact:
- `D:\Download\texture-eldercare-exact-full.svg`
- `D:\Download\texture-airport-exact-full.svg`
- `D:\Download\smartcare-mark-exact-full.svg`
- `D:\Download\flycare-badge-exact-crop.svg`

PNG fallback:
- `D:\texture-airport.png`
- `D:\texture-eldercare.png`
- `D:\flycare-badge.png`
- `D:\smartcare-mark.png`

## 4. Exact repo target paths

- `frontend/src/assets/brand/texture-eldercare-exact-full.svg`
- `frontend/src/assets/brand/texture-airport-exact-full.svg`
- `frontend/src/assets/brand/smartcare-mark-exact-full.svg`
- `frontend/src/assets/brand/flycare-badge-exact-crop.svg`
- `frontend/src/assets/brand/texture-airport.png`
- `frontend/src/assets/brand/texture-eldercare.png`
- `frontend/src/assets/brand/flycare-badge.png`
- `frontend/src/assets/brand/smartcare-mark.png`

## 5. Allowed scope

- Header brand mark integration
- Overview hero texture layer
- FlyCare shell visual branding only
- FlyCare panel header badge only
- brand docs and handoff docs

## 6. Forbidden scope

- backend changes
- Position architecture reopening
- Position map stage redesign
- FlyCare workflow changes
- polling changes
- zone logic changes
- flight drawer changes
- device mapping changes
- route changes
- broad unrelated cleanup

## 7. Recommended execution order

- Run 0, Ask plan only
- Run 1A, assets only
- Run 1B, brand docs kickoff only
- Run 2, header only
- Run 3, overview only
- Run 4, FlyCare shell visual only
- Run 5, closeout only

## 8. Reporting contract

Each later run should report:
- files changed
- validations run
- whether SVG fell back to PNG
- whether protected surfaces stayed untouched
- exact commit message
