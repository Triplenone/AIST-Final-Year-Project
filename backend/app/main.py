"""FastAPI placeholder matching the architecture playbook."""
from fastapi import FastAPI

app = FastAPI(title="Eldercare Backend", version="0.0.0-shell")


@app.get("/healthz", tags=["health"])
async def health() -> dict[str, str]:
    """Lightweight liveness probe."""
    return {"status": "ok", "note": "Replace shell with real services."}
