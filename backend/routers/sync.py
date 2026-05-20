from fastapi import APIRouter, Depends
import os

from database import cloud_engine
from auth_service import get_current_user
from sync_service import (
    get_sync_status, estimate_pending_push, run_sync
)

router = APIRouter(tags=["Sync Operations"])

@router.get("/sync-status")
async def sync_status_endpoint():
    """Full sync state: last sync time, pending rows, cloud reachability."""
    data = get_sync_status()
    if not data["is_syncing"]:
        data["pending_push"] = estimate_pending_push()
    data["sync_interval_minutes"] = int(os.environ.get("SYNC_INTERVAL_MINUTES", "5"))
    data["cloud_configured"] = cloud_engine is not None
    return data

@router.get("/sync-progress")
async def sync_progress_endpoint():
    """Lightweight poll for the frontend toast progress bar on new-device first launch."""
    s = get_sync_status()
    return {
        "progress": s["initial_pull_progress"],
        "status_msg": s["initial_pull_status"],
        "done": s["initial_pull_done"],
    }

@router.post("/sync-now")
async def sync_now(username: str = Depends(get_current_user)):
    """Manually trigger an immediate bidirectional sync."""
    if not cloud_engine:
        return {"status": "no_cloud", "message": "Cloud database not configured"}
    result = await run_sync()
    return result or {"pushed": 0, "pulled": 0}
