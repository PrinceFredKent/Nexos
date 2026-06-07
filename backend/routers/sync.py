from fastapi import APIRouter, Depends
import os

from database import cloud_engine, get_db
from auth_service import get_current_user
from sync_service import (
    get_sync_status, estimate_pending_push, run_sync, push_user_to_cloud
)
from sqlalchemy.orm import Session
from sqlalchemy import text

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

from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import json
from sqlalchemy import text
from fastapi import HTTPException

class ResolveConflictRequest(BaseModel):
    resolution: str  # "local" or "cloud"

@router.get("/conflicts")
async def get_sync_conflicts(db: Session = Depends(get_db)):
    """Get all pending sync conflicts."""
    rows = db.execute(text("SELECT * FROM sync_conflicts WHERE status = 'PENDING'")).mappings().all()
    conflicts = []
    for r in rows:
        conflicts.append({
            "id": r["id"],
            "table_name": r["table_name"],
            "row_id": r["row_id"],
            "local_data": json.loads(r["local_data"]) if r["local_data"] else None,
            "cloud_data": json.loads(r["cloud_data"]) if r["cloud_data"] else None,
            "created_at": r["created_at"]
        })
    return conflicts

@router.post("/conflicts/{conflict_id}/resolve")
async def resolve_sync_conflict(conflict_id: int, req: ResolveConflictRequest, db: Session = Depends(get_db)):
    """Resolve a conflict by choosing 'local' or 'cloud' version."""
    conflict = db.execute(text("SELECT * FROM sync_conflicts WHERE id = :id"), {"id": conflict_id}).mappings().first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")
        
    if conflict["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Conflict already resolved")
        
    table = conflict["table_name"]
    row_id = conflict["row_id"]
    
    if req.resolution == "cloud":
        # Apply cloud data to local DB
        cloud_data = json.loads(conflict["cloud_data"])
        cols = ", ".join(cloud_data.keys())
        placeholders = ", ".join([f":{k}" for k in cloud_data.keys()])
        db.execute(text(f"INSERT OR REPLACE INTO {table} ({cols}) VALUES ({placeholders})"), cloud_data)
        
        # Remove from local outbox if any pending changes
        db.execute(text("DELETE FROM local_changes_outbox WHERE table_name = :t AND row_id = :id"), {"t": table, "id": row_id})
        
    elif req.resolution == "local":
        # Keep local data. Ensure there's an UPDATE in the outbox to push it to cloud.
        outbox_exists = db.execute(text("SELECT 1 FROM local_changes_outbox WHERE table_name = :t AND row_id = :id AND action IN ('INSERT', 'UPDATE')"), {"t": table, "id": row_id}).first()
        if not outbox_exists:
            db.execute(text("INSERT INTO local_changes_outbox (table_name, row_id, action) VALUES (:t, :id, 'UPDATE')"), {"t": table, "id": row_id})
            
    else:
        raise HTTPException(status_code=400, detail="Invalid resolution. Must be 'local' or 'cloud'")
        
    # Mark resolved
    db.execute(text("UPDATE sync_conflicts SET status = 'RESOLVED' WHERE id = :id"), {"id": conflict_id})
    db.commit()
    return {"status": "success", "resolved_with": req.resolution}


@router.get("/cloud-diagnostics")
async def cloud_diagnostics(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Diagnostic endpoint: shows whether Railway has DATABASE_URL configured,
    whether Supabase is reachable, and how many local users are unsynced.
    Call this from the Railway app to debug missing users.
    """
    result = {
        "database_url_set": bool(os.environ.get("DATABASE_URL")),
        "cloud_engine_ready": cloud_engine is not None,
        "local_users": [],
        "supabase_users": [],
        "unsynced_count": 0,
        "supabase_error": None,
    }

    # Local users
    try:
        rows = db.execute(text(
            "SELECT id, username, email, synced_at, last_modified FROM users ORDER BY id DESC LIMIT 20"
        )).mappings().all()
        result["local_users"] = [
            {"id": r["id"], "username": r["username"], "email": r["email"],
             "synced_at": str(r["synced_at"]), "last_modified": str(r["last_modified"])}
            for r in rows
        ]
        unsynced = db.execute(text("SELECT COUNT(*) FROM users WHERE synced_at IS NULL")).scalar()
        result["unsynced_count"] = unsynced or 0
    except Exception as e:
        result["local_error"] = str(e)

    # Supabase users
    if cloud_engine:
        try:
            from database import CloudSession
            cloud = CloudSession()
            rows = cloud.execute(text(
                "SELECT id, username, email, synced_at, last_modified FROM users ORDER BY id DESC LIMIT 20"
            )).mappings().all()
            result["supabase_users"] = [
                {"id": r["id"], "username": r["username"], "email": r["email"],
                 "synced_at": str(r["synced_at"]), "last_modified": str(r["last_modified"])}
                for r in rows
            ]
            cloud.close()
        except Exception as e:
            result["supabase_error"] = str(e)
    else:
        result["supabase_error"] = "cloud_engine is None — DATABASE_URL not set or invalid on this server"

    return result


@router.post("/force-push-users")
async def force_push_users(username: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Recovery endpoint: immediately push ALL local users (especially those with
    synced_at IS NULL) directly to Supabase using push_user_to_cloud().
    Call this once to fix accounts that were created before the auto-push fix.
    """
    if not cloud_engine:
        return {"status": "error", "message": "DATABASE_URL not configured on this server — Supabase sync is disabled."}

    rows = db.execute(text("SELECT id, username, email FROM users")).mappings().all()
    results = []
    for r in rows:
        ok = await push_user_to_cloud(r["id"])
        results.append({"id": r["id"], "username": r["username"], "pushed": ok})

    pushed = sum(1 for r in results if r["pushed"])
    return {
        "status": "done",
        "total": len(results),
        "pushed_ok": pushed,
        "failed": len(results) - pushed,
        "details": results,
    }
