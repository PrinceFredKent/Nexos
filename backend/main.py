from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import sys
import os
import logging
import json

from database import engine, get_db, Base, cloud_engine
# Import all model modules so SQLAlchemy's metadata includes every table
from models import appointment, cycle, health_data, health_knowledge, medication, outbox, sync_conflict, sync_meta, user
from models.health_knowledge import HealthCondition
from sync_service import run_sync

# Configure logging
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nexos.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger("nexos")
log.setLevel(logging.INFO)

# Create all local SQLite tables (instant — no network)
Base.metadata.create_all(bind=engine)

# Background sync scheduler
_scheduler = AsyncIOScheduler()

app = FastAPI(
    title="Nexos Health AI API",
    description="Backend API for Nexos — an offline-first AI health assistant.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS — read allowed origins from env var and normalize them
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
_frontend_url = os.environ.get("FRONTEND_URL")
origins = []

if not _raw_origins or _raw_origins.strip() == "*":
    # Development default: allow localhost and all origins
    origins = ["*"]
else:
    origins = [o.strip().rstrip('/') for o in _raw_origins.split(",") if o.strip()]
    if any(o == "*" for o in origins):
        origins = ["*"]

# If FRONTEND_URL is configured, ensure it is allowed too
if _frontend_url and origins != ["*"]:
    normalized_frontend_url = _frontend_url.strip().rstrip('/')
    if normalized_frontend_url not in origins:
        origins.append(normalized_frontend_url)

# Always include Cloudflare Pages deployment URL as fallback when not wildcard
if origins != ["*"] and "https://nexos-health.pages.dev" not in origins:
    origins.append("https://nexos-health.pages.dev")

if origins == ["*"]:
    log.warning("CORS is set to '*' — restrict ALLOWED_ORIGINS to your frontend URL in production.")
else:
    log.info(f"CORS restricted to: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health Check Endpoint ────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """Render health check — returns 200 when the service is up."""
    return {"status": "ok", "service": "nexos-api"}

@app.on_event("startup")
async def startup_event():
    """Start periodic cloud sync on app launch and migrate data."""
    # Data migration from static to dynamic
    db = next(get_db())
    try:
        from services.ai_service import LOCAL_CONDITION_REGISTRY
        if db.query(HealthCondition).count() == 0:
            log.info("Migrating static medical data to database...")
            for name, data in LOCAL_CONDITION_REGISTRY.items():
                db.add(HealthCondition(
                    name=name,
                    symptoms=json.dumps(data["symptoms"]),
                    explanation=data["explanation"],
                    action_steps=json.dumps(data["action_steps"]),
                    is_emergency=data.get("is_emergency", False),
                    female_only=data.get("female_only", False),
                    required_any=json.dumps(data.get("required_any", [])),
                    icon=data.get("icon", "medical_services")
                ))
            db.commit()
            log.info("Migration complete.")
    except Exception as e:
        log.error(f"Migration error: {e}")
    finally:
        db.close()

    # Warn loudly if critical production env vars are missing
    _jwt_secret = os.environ.get("JWT_SECRET_KEY", "nexos-dev-secret-change-in-production")
    if _jwt_secret == "nexos-dev-secret-change-in-production":
        log.warning("JWT_SECRET_KEY is using the insecure dev default — Set it in your Railway/cloud environment variables!")
    _frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    if "localhost" in _frontend_url:
        log.warning(f"FRONTEND_URL is set to '{_frontend_url}' — update to your production Cloudflare Pages URL.")
    else:
        log.info(f"Frontend URL: {_frontend_url}")

    interval = int(os.environ.get("SYNC_INTERVAL_MINUTES", "5"))
    if interval > 0 and cloud_engine:
        _scheduler.add_job(run_sync, "interval", minutes=interval, id="periodic_sync")
        _scheduler.start()
        log.info(f"Sync scheduler started — interval: {interval} min")
    else:
        log.info("Sync scheduler disabled (no cloud engine or interval=0).")

@app.on_event("shutdown")
async def shutdown_event():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)

# Register sub-routers
from routers import auth, user, sync, medications, cycle_tracker, events, symptoms, intelligence

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(sync.router)
app.include_router(medications.router)
app.include_router(cycle_tracker.router)
app.include_router(events.router)
app.include_router(symptoms.router)
app.include_router(intelligence.router)

# PyInstaller creates a temporary folder and stores path in _MEIPASS
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    FRONTEND_DIR = os.path.join(BASE_DIR, "dist")
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

# --- Frontend Serving & Catch-All Route ---

if os.path.exists(FRONTEND_DIR) and os.path.isdir(FRONTEND_DIR):
    log.info(f"Serving frontend from: {FRONTEND_DIR}")
    
    # Mount assets folder for standard static serving
    assets_dir = os.path.join(FRONTEND_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        log.info("Mounted /assets directory")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # 1. Handle root or empty path
        if not full_path or full_path == "/":
            return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
            
        # 2. Check if the file exists in the frontend dist directory
        clean_path = full_path.lstrip("/")
        file_path = os.path.join(FRONTEND_DIR, clean_path)
        
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # 3. SPA Routing: fallback to index.html for unknown paths
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
            
        return {"error": "Frontend not found"}
else:
    log.warning(f"Frontend directory NOT found at: {FRONTEND_DIR}")
    @app.get("/")
    def read_root():
        return {"message": "Welcome to the AI Health Assistant API (Frontend not built)"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Render injects $PORT
    uvicorn.run(app, host="0.0.0.0", port=port)
