MEMPROTO v1 (lin fork)

- Same line grammar as `_ben_mem/PROTO.md`: one fact per line, `PREFIX.key=value`, `PREFIX` in `{V,R,I,B}`.
- Paths under this repo: prefer `frontend/...` repo-relative (no drive letter) unless a fact requires absolute.
- Write: append `_lin_mem/LOG/YYYYMMDD-HHMMSS.mem` for each batch; merge durable facts into `_lin_mem/CURR.mem`.
- Do not delete old `_lin_mem/LOG/*.mem`; supersede only via newer lines in `CURR.mem` or newer logs.
