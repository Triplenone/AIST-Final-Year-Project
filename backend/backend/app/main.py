"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import api_router
from app.config import settings
from app.db.mongo import close_mongo_client, ensure_indexes
from app.services.mqtt_subscriber import start_mqtt, stop_mqtt


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize MongoDB indexes and MQTT lifecycle hooks."""
    try:
        await ensure_indexes()
    except Exception as exc:
        print(f"Warning: Mongo index initialization skipped: {exc}")

    try:
        start_mqtt()
    except Exception as exc:
        print(f"Warning: MQTT startup skipped: {exc}")
    try:
        yield
    finally:
        stop_mqtt()
        await close_mongo_client()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="智能养老系统后端API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

static_dir = Path(__file__).parent.parent / "static"


@app.get("/")
def root():
    """Serve the built frontend when present, otherwise expose basic metadata."""
    index_path = static_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "note": "Frontend build not found. Run: cd frontend && npm run build",
    }


@app.get("/health")
def health_check():
    """Simple health endpoint."""
    return {"status": "healthy"}


if static_dir.exists():
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    public_dir = static_dir / "public"
    if public_dir.exists():
        app.mount("/public", StaticFiles(directory=public_dir), name="public")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Fallback to the SPA entry point for non-API routes."""
        if (
            full_path.startswith("api/")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path == "openapi.json"
        ):
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Not found")

        if full_path.rstrip("/") == "health":
            return {"status": "healthy"}

        file_path = static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(index_path)

        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
