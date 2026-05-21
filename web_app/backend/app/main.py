from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager

from .models.database import init_db
from .routers import auth, dashboard, alerts, investigate, ioc, admin, compliance, assets, kpi, ws
from .core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print(f"SOC Center API started — base path: {settings.app_base_path}")
    yield


app = FastAPI(
    title="SOC Center API",
    version="1.0.0",
    root_path=settings.app_base_path,
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for mod in [auth, dashboard, alerts, investigate, ioc, admin, compliance, assets, kpi, ws]:
    app.include_router(mod.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "version": "1.0.0"}
