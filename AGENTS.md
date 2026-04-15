# AGENTS.md

## Purpose

This repository uses Codex with strict scope control.
Codex must prefer small, auditable, file-scoped work.
Do not silently expand scope.
Do not treat one branch as a place to batch unrelated redesigns.

## Primary source of truth

Implementation-stage source of truth lives in the repo.

Read in this order:
1. `_ben_mem/PROTO.md`
2. `_ben_mem/CURR.mem`
3. relevant docs under `docs/`
4. target files to be changed

If Notion and repo differ, repo wins.
If chat history, memory, and repo differ, repo wins.

## Canonical memory path

Use repo-local memory only:

`E:\FYP\AIST-Final-Year-Project-main\_ben_mem`

Deprecated outer path:

`E:\FYP\_codex_mem`

Do not read from or write to the deprecated outer path.

## Current workflow model

The old Position Command Center rebuild was phase-based and is already completed.
Do not reopen that completed epic unless a new issue explicitly says so.

After merge, new work must use issue-sized workstreams:
- one clear objective
- explicit target files
- explicit protected surfaces
- explicit acceptance checks
- explicit validation
- explicit doc updates when needed
- explicit `_ben_mem` updates when needed

Do not invent a new multi-phase program unless the repo docs explicitly define one.
Do not label unrelated work as a new Position phase.

## Protected surfaces

Protected unless the task explicitly says otherwise:
- `backend/backend/`
- backend routes
- backend payload contract
- database schema
- event generation logic
- route contract
- auth persistence
- theme persistence

Extra protected surface for Position-related tasks:
- `frontend/src/pages/FlyCarePage.tsx` core workflow

For brand-asset tasks:
- visual brand integration into shell, header, hero, and panel header is allowed
- FlyCare core workflow change is not allowed
- Position architecture change is not allowed
- backend change is not allowed

## Task shape rules

Each Codex run must be:
- single objective
- file-scoped
- constraint-heavy
- acceptance-driven
- validation-backed

Every task prompt should include:
- objective
- target branch
- protected surfaces
- target files
- forbidden changes
- acceptance criteria
- validation commands
- expected final report format

Do not accept vague instructions like:
- clean up everything
- improve the whole frontend
- refactor broadly
- make it nicer everywhere

## Scope control rules

Do not mix these into one PR unless the task explicitly requires it:
- Position architecture work
- brand asset integration
- backend config recovery
- runtime validation recovery
- unrelated shell polish
- broad CSS cleanup

For brand work, do not mix these into one run unless explicitly required:
- repo governance reset
- asset intake
- Header branding
- Overview branding
- FlyCare shell visual work
- validation and handoff

Prefer one PR per objective.
Prefer one run per concern.

## File boundary rules

For Position work:
- keep Position derivation in `frontend/src/adapters/position-command-center.ts`
- keep Position-specific visual growth out of `frontend/src/styles/global.css`
- prefer `frontend/src/styles/position-page.css`

For brand integration work:
- place brand assets under `frontend/src/assets/brand/`
- never reference local Windows absolute paths in source code
- prefer exact SVG assets first
- fall back to PNG only if SVG import or rendering is broken in the current toolchain
- if falling back, state it explicitly in the final report

## Documentation rules

Use `docs/` as the system of record.
Do not overload this file with volatile project state.

When a task changes implementation meaningfully, update the relevant docs.
When a task is minor and self-contained, do not create unnecessary docs.

For Position-scoped work, docs usually live under:
`docs/frontend-position/`

For brand-scoped work, docs should live under:
`docs/frontend-brand/`

At minimum for brand work:
- `docs/frontend-brand/00-brand-workstream.md`
- `docs/frontend-brand/99-handoff.md`

Do not update docs mechanically.
Only update docs that are affected by the task.

## `_ben_mem` rules

`_ben_mem` is machine-facing memory.
Keep it lean.

Style:
- one fact per line
- ASCII first
- no essay writing
- no repeated background
- maximum state density

Recommended fields:
- `R.scope`
- `R.phase`
- `R.protect`
- `R.files`
- `V.build`
- `V.test`
- `V.verify`
- `I.next`
- `B.blocker`

If the task is not part of the old Position phase workflow, do not fake a phase name just to fit the old model.
Use a scope name that matches the actual task.
Do not force old phase names onto new workstreams.

## Validation rules

At minimum, after code changes:
1. verify imports and file paths
2. run the most relevant build
3. run the most relevant test or lint if reasonable
4. verify no protected surface was changed unintentionally
5. inspect `git diff`
6. ensure final worktree state is intentional

Do not claim live backend success if backend is still blocked by known config issues.

## Branch and PR rules

Prefer a fresh branch from latest `main` for each new workstream.
If the user explicitly says to stay on the current branch, respect that.

Branch names should describe one workstream only.
Do not create or switch branches unless the task explicitly asks for it.
Do not force-push unless the task explicitly requires it.

Prefer small, focused PRs.
Do not batch unrelated frontend redesign work into a PR that already has a different review purpose.

## Final report rules

Final reports must be short and concrete.

Include:
1. branch used
2. files changed
3. validations run
4. blockers
5. docs updated
6. mem updated
7. whether any asset fell back from SVG to PNG
8. exact commit message if a commit was made

Do not write long narratives in the final report.

## Completion gate

Before declaring completion, verify all are true:
- task objective satisfied
- scope stayed bounded
- protected surfaces respected
- validation run
- final report includes the required concrete facts

If any of the above is false, do not claim the task is complete.
