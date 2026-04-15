MEMPROTO v1

Goal
- Min-token / max-recall external memory for Codex-style recovery across chats.
- Prefer dense, deterministic, machine-first text over human prose.
- Canonical repo-local memory root is `E:\FYP\AIST-Final-Year-Project-main\_ben_mem`.
- Deprecated outer path `E:\FYP\_codex_mem` must not be read or written.

Boot
1. Read `E:\FYP\AIST-Final-Year-Project-main\_ben_mem\PROTO.md`
2. Read `E:\FYP\AIST-Final-Year-Project-main\_ben_mem\CURR.mem`
3. If needed, read newest files in `E:\FYP\AIST-Final-Year-Project-main\_ben_mem\LOG\`
4. Treat `CURR.mem` as authoritative snapshot unless newer log explicitly overrides it.

Write
- After any major discovery / validation / decision, update `CURR.mem`.
- Also append one new log file under `LOG\` named `YYYYMMDD-HHMMSS.mem`.
- Never delete old logs; only supersede.
- Keep all entries ASCII where possible; preserve exact paths, branch names, and commands verbatim.
- Write only inside repo-local `_ben_mem`; do not fall back to any outer memory path.

Format
- One fact per line.
- Use `KEY=VALUE`.
- Use short stable keys.
- Use absolute Windows paths.
- Status codes:
  - `V` = directly verified by tool/runtime
  - `R` = reported by user / prior chat memory only
  - `I` = inference from verified facts
  - `B` = blocked / unknown / not yet verified
- Prefix fact lines with status, like `V.key=value`.

Core Keys
- `ctx.*` conversation / project identity
- `plan.*` plan file and obligations
- `repo.*` git / path / branch / remote
- `shape.*` active repo structure
- `docs.*` canonical docs set
- `rel.*` release package facts
- `run.*` runtime validation facts
- `issue.*` discovered defects / caveats
- `next.*` pending work / operator guidance

Compression Rules
- Use sets in `[]`, comma-separated, no spaces unless required.
- Use maps as `{k:v,...}`.
- Use booleans `1/0`.
- Use paths without quoting unless spaces require quoting.
- Prefer canonical nouns over sentences.

Update Rules
- Preserve prior keys unless changed.
- If a key changes, overwrite in `CURR.mem` and record old/new in a log file.
- Separate verified facts from desired facts; never upgrade `R/I/B` to `V` without direct check.
- If runtime verification required env hacks/workarounds, record both raw failure and workaround success.

Cross-Chat Recovery Rule
- New chat must summarize `ctx.*`, `repo.*`, `shape.*`, `run.*`, `issue.*`, `next.*` before taking action.
- If user asks "do you remember", answer from memory files only, not from assumed hidden memory.
