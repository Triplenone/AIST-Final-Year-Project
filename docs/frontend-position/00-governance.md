# Position Command Center Rebuild Governance

## 1. Governance Purpose

This file defines how the Position rebuild must be executed, documented, reviewed, and maintained.

This is not a feature spec.  
This is the execution contract.

---

## 2. Source of Truth

### 2.1 Planning Stage
Temporary planning board may live in Notion.

### 2.2 Implementation Stage
Once implementation starts, source of truth must move into the repo.

Repo source of truth:
- `docs/frontend-position/*.md`
- `_ben_mem/*`
- committed code in the active branch

Rule:  
If Notion and repo differ, repo wins.

Canonical memory path:
- `E:\FYP\AIST-Final-Year-Project-main\_ben_mem`

Deprecated path:
- `E:\FYP\_codex_mem`

Rule:
- future Position work must read and write repo-local `_ben_mem` only
- do not use the deprecated outer path

---

## 3. Protected Surfaces

### 3.1 Backend
Protected.  
Do not modify backend.

Protected directories and responsibilities:
- `backend/backend/`
- backend routes
- backend payload contract
- backend schema
- event generation logic
- mongo-upstream route behavior

### 3.2 FlyCare
Protected.  
Do not modify FlyCare core workflow.

Protected file:
- `frontend/src/pages/FlyCarePage.tsx`

### 3.3 Shell stability
Protected.  
Do not destabilize:
- route contract
- theme persistence
- auth persistence
- top-level navigation behavior

---

## 4. Active Scope

Only active scope:
- Position command center rebuild

Allowed work:
- Position page architecture
- Position components
- Position styles
- Position adapter layer
- Position docs
- Position validation
- Position mem logs

Not allowed in the same phase:
- Overview redesign
- FlyCare redesign
- Admin redesign
- broad refactor unrelated to Position

---

## 5. File-Level Rules

### 5.1 Position page
Main target:
- `frontend/src/pages/PositionPage.tsx`

Rule:  
This file must be reduced in responsibility over time.

### 5.2 Position styles
Rule:  
Create:
- `frontend/src/styles/position-page.css`

Do not keep scaling Position-specific logic inside:
- `frontend/src/styles/global.css`

### 5.3 Position adapter
Rule:  
Create:
- `frontend/src/adapters/position-command-center.ts`

Purpose:  
All major state derivation must happen before rendering.

### 5.4 Position components
Rule:  
Use dedicated Position component files.  
Do not keep rebuilding one giant page file.

---

## 6. Documentation Rules

Every phase must update:
- phase doc
- handoff-relevant notes
- `_ben_mem` state

Required docs:
- `00-master-plan.md`
- `00-governance.md`
- `01-phase-foundation.md`
- `02-phase-command.md`
- `03-phase-production.md`
- `99-handoff.md`

Phase doc minimum sections:
- Scope
- Protected surfaces
- Files
- What
- Why
- How
- Validation
- Risks
- Next

---

## 7. `_ben_mem` Rules

### 7.1 Purpose
`_ben_mem` is machine-facing memory, not human-facing prose.

### 7.1.1 Path discipline
Canonical repo-local path:
- `E:\FYP\AIST-Final-Year-Project-main\_ben_mem`

Deprecated outer path:
- `E:\FYP\_codex_mem`

Rule:
- read repo-local `_ben_mem` first
- write repo-local `_ben_mem` only
- never restore Position workflow to the deprecated outer path

### 7.2 Format
Use short machine log only.

Allowed prefixes:
- `R`
- `V`
- `I`
- `B`

Recommended fields:
- `scope`
- `protect`
- `phase`
- `files`
- `done`
- `verify`
- `next`
- `risk`

### 7.3 Style
Rules:
- one fact per line
- ASCII first
- no narrative paragraphs
- no repeated background
- no essay writing
- minimal token usage
- maximum state density

### 7.4 Example
```text
R.scope=position-rebuild
R.protect=backend,flycare,api-contract
R.phase=foundation
R.files=PositionPage,position-page.css,position-command-center
V.build=1
V.backend_touch=0
V.flycare_regress=0
I.next=phase-command
```

---

## 8. Codex Execution Rules

### 8.1 Read order
Codex must read in this order:
1. `_ben_mem/PROTO.md`
2. `_ben_mem/CURR.mem`
3. current phase doc
4. target files

### 8.2 Write order
Codex must write in this order:
1. phase start log
2. code change
3. validation result
4. phase doc update
5. phase done log
6. `CURR.mem` update

### 8.3 Prompt design rules
Each Codex run must be:
- single objective
- file-scoped
- constraint-heavy
- acceptance-driven
- no vague natural-language mission creep

Every run must include:
- objective
- protected surfaces
- target files
- forbidden changes
- acceptance checks
- required doc updates
- required `_ben_mem` writes

### 8.4 Forbidden Codex behavior
Do not allow:
- backend edits
- unrelated file edits
- silent scope expansion
- doc omission
- memory omission
- vague ???疾anup everything??runs

---

## 9. Validation Rules

Every phase must validate:
- build
- active route render
- Position page render
- no backend changes
- no FlyCare regressions
- docs updated
- mem logs updated

Minimum build command:
- `npm run build`

Reference:
- `frontend/package.json`
- `https://github.com/Triplenone/AIST-Final-Year-Project/blob/main/frontend/package.json`

---

## 10. Review Rules

A phase is not complete if any of the following is missing:
- changed code
- changed docs
- changed mem logs
- explicit validation result

Visual improvement alone is not completion.  
Refactor alone is not completion.  
Docs alone are not completion.

Completion means:
- code
- docs
- mem
- validation

---

## 11. Handoff Rules

Before handoff:
- update `99-handoff.md`
- summarize changed files
- summarize protected surfaces status
- summarize unresolved risks
- summarize next recommended phase

Handoff must be readable by:
- future Codex
- future human maintainer
- future reviewer with no chat context

---

## 12. Governance Summary

The rebuild succeeds only if:
- Position becomes the primary command center
- backend remains frozen
- FlyCare remains protected
- docs remain synchronized
- `_ben_mem` remains lean and useful
- Codex work stays phase-based and auditable