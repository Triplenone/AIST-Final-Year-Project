"""
FastAPI应用主入口
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from app.config import settings
from app.api.routes import api_router
from app.db.mongo import ensure_indexes, close_mongo_client
from app.services.mqtt_subscriber import start_mqtt, stop_mqtt


@asynccontextmanager
async def lifespan(_: FastAPI):
    """应用生命周期：启动 Mongo 索引与 MQTT 订阅，关闭时释放资源。"""
    try:
        await ensure_indexes()
    except Exception as e:
        print(f"⚠️ Mongo 索引初始化失败: {e}")
    start_mqtt()
    try:
        yield
    finally:
        stop_mqtt()
        await close_mongo_client()

# 创建FastAPI应用实例
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="智能养老系统后端API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 配置CORS（跨域资源共享）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应设置具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由（必须在静态文件之前）
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# 静态文件目录
static_dir = Path(__file__).parent.parent / "static"


@app.get("/")
def root():
    """根路径 - 返回前端应用"""
    index_path = static_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {
        "message": "智能养老系统API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "note": "前端未构建，请运行: cd frontend && npm run build"
    }


@app.get("/health")
def health_check():
    """健康检查"""
    return {"status": "healthy"}


# 挂载静态文件（API路径之后，避免冲突）
if static_dir.exists():
    # 挂载assets目录
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # 挂载public目录（如果存在）
    public_dir = static_dir / "public"
    if public_dir.exists():
        app.mount("/public", StaticFiles(directory=public_dir), name="public")
    
    # SPA路由fallback：所有非API请求返回index.html
    # 注意：这个路由必须在最后注册，避免拦截API路由
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """
        处理前端路由，所有非API请求返回index.html
        让前端React Router处理路由
        """
        # 排除API路径和文档路径（这些应该已经被其他路由处理）
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path == "openapi.json":
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        if full_path.rstrip("/") == "health":
            return {"status": "healthy"}

        # 检查请求的文件是否存在（如favicon.ico等）
        file_path = static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        # 返回index.html（SPA fallback）
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
        reload=settings.DEBUG
    )

