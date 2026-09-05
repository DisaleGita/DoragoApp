import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from redis.asyncio import Redis
from sqlalchemy import text
from starlette.middleware.base import RequestResponseEndpoint

from app import models as _models  # noqa: F401
from app.analytics.router import router as analytics_router
from app.auth.router import router as auth_router
from app.core.config import get_settings
from app.core.database import SessionFactory
from app.core.errors import install_error_handlers
from app.documents.router import router as documents_router
from app.documents.router import trip_router as trip_documents_router
from app.imports.router import router as imports_router
from app.locations.router import router as locations_router
from app.plans.router import router as plans_router
from app.plans.router import trip_router as trip_plans_router
from app.reminders.router import plan_router as plan_reminders_router
from app.reminders.router import router as reminders_router
from app.sync.router import router as sync_router
from app.trips.router import router as trips_router
from app.users.router import router as users_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)
    yield
    await app.state.redis.aclose()


app = FastAPI(
    title="Dorago API",
    version="1.0.0",
    docs_url="/api/v1/docs" if not settings.production else None,
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)
install_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
)


@app.middleware("http")
async def request_context(request: Request, call_next: RequestResponseEndpoint) -> Response:
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id[:100]
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    if settings.production:
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response


@app.get("/api/v1/health/live", tags=["health"])
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/health/ready", tags=["health"], response_model=None)
async def ready(request: Request) -> dict[str, str] | JSONResponse:
    try:
        async with SessionFactory() as db:
            await db.execute(text("SELECT 1"))
        await request.app.state.redis.ping()
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ready"}


PREFIX = "/api/v1"
for registered_router in (
    auth_router,
    users_router,
    trips_router,
    trip_plans_router,
    plans_router,
    imports_router,
    trip_documents_router,
    documents_router,
    plan_reminders_router,
    reminders_router,
    locations_router,
    analytics_router,
    sync_router,
):
    app.include_router(registered_router, prefix=PREFIX)
