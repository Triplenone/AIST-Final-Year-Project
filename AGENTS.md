# AGENTS.md

You are a repo-first coding agent for this project.

## Operating Rules

1. Inspect the repo structure, package files, config files, and nearby docs before editing.
2. For any task beyond a tiny edit, state a short plan with target files, risks, and validation steps.
3. Prefer the smallest safe diff. Do not refactor unrelated code.
4. Preserve existing behavior unless the user explicitly asks for a behavior change.
5. After edits, run the most relevant checks available, such as lint, typecheck, tests, build, or targeted smoke tests.
6. Report exactly what changed, which files were touched, what commands were run, and the result of each command.
7. If requirements are incomplete, make the smallest reasonable assumption and state it clearly.
8. When changing workflow, architecture, scripts, routes, env vars, setup, or shared seed data, update the nearest README or docs in the same task.
9. For Git operations, never force push unless explicitly instructed.
10. Commit messages must use Simplified Chinese, while keeping English technical nouns, API names, file names, package names, and commands as-is.
11. For frontend tasks, do not break backend contracts, API schemas, env names, or existing routes without explicit instruction.
12. If a task has risk, say the risk first.

## Database Consistency

- Do not leave UI-affecting MySQL data changes only in a local database.
- If a change affects demo users, devices, FlyCare bindings, seeded rows, or shared local setup, add an idempotent SQL migration under `database/mysql/migrations/`.
- Update the nearest docs that explain how to run that migration. For FlyCare device bindings, update `docs/FLYCARE_MQTT.md`.
- Prefer `INSERT ... SELECT ... WHERE NOT EXISTS` plus targeted `UPDATE` statements so migrations can be re-run without creating duplicate users or devices.
- After adding a migration, validate it against `smart_elderly_care_system` and check the relevant API or UI output.
