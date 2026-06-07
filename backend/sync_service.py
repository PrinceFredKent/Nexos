"""
sync_service.py
───────────────
Handles all synchronisation between the local SQLite database and Supabase.

Two directions:
  PUSH  → find locally-modified rows (last_modified > synced_at) and upsert them
          into Supabase, then mark synced_at = now.
  PULL  → find rows in Supabase modified after our last pull, merge them into
          local SQLite (last-write-wins on last_modified).

Also manages the initial_pull for new-device first-launch:
  1. Pull users table (credentials only) so login can proceed immediately.
  2. Pull remaining tables in priority order with progress updates.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from database import LocalSession, CloudSession, cloud_engine

log = logging.getLogger("sync_service")

# ─── Column Safety Cache ─────────────────────────────────────────────────────
# Caches the column names of each Supabase table so we can strip any locally-
# added columns that haven't been migrated to Supabase yet.  Cleared on error
# so it re-fetches after schema changes.
_cloud_col_cache: dict = {}


def _get_cloud_columns(cloud: Session, table: str) -> set:
    """Return the set of column names that exist in the cloud (Supabase) table."""
    if table in _cloud_col_cache:
        return _cloud_col_cache[table]
    try:
        rows = cloud.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = :t"
            ),
            {"t": table},
        ).fetchall()
        cols = {r[0] for r in rows}
        if cols:
            _cloud_col_cache[table] = cols
            log.debug(f"Cached {len(cols)} cloud columns for '{table}'")
        return cols
    except Exception as e:
        log.warning(f"Could not fetch cloud columns for '{table}': {e}")
        return set()


def _filter_to_cloud_cols(cloud: Session, table: str, row_dict: dict) -> dict:
    """Strip any local-only keys that don't exist in the cloud table."""
    cloud_cols = _get_cloud_columns(cloud, table)
    if not cloud_cols:
        return row_dict  # unknown schema — try as-is
    filtered = {k: v for k, v in row_dict.items() if k in cloud_cols}
    skipped = set(row_dict.keys()) - cloud_cols
    if skipped:
        log.debug(f"Skipping local-only cols for '{table}': {skipped}")
    return filtered



# ─── Sync State (in-memory, reset on restart) ─────────────────────────────────

_sync_state = {
    "last_sync_at": None,       # datetime of last completed full sync
    "is_syncing": False,        # True while a sync is running
    "cloud_reachable": None,    # True/False/None (None = not yet tested)
    "pending_push": 0,          # estimated dirty rows waiting to push
    "last_error": None,         # last error message, if any
    # Initial pull progress (0–100), None when not in progress
    "initial_pull_progress": None,
    "initial_pull_status": None,
    "initial_pull_done": False,
}


def get_sync_status() -> dict:
    return {
        "last_sync_at": _sync_state["last_sync_at"].isoformat() if _sync_state["last_sync_at"] else None,
        "is_syncing": _sync_state["is_syncing"],
        "cloud_reachable": _sync_state["cloud_reachable"],
        "pending_push": _sync_state["pending_push"],
        "last_error": _sync_state["last_error"],
        "initial_pull_progress": _sync_state["initial_pull_progress"],
        "initial_pull_status": _sync_state["initial_pull_status"],
        "initial_pull_done": _sync_state["initial_pull_done"],
    }


def _cloud_db() -> Optional[Session]:
    """Return a Supabase session, or None if cloud is not configured."""
    if not CloudSession:
        return None
    return CloudSession()


def _test_cloud_connection() -> bool:
    """Quickly test if Supabase is reachable. Returns True/False."""
    if not cloud_engine:
        _sync_state["cloud_reachable"] = False
        return False
    try:
        with cloud_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        _sync_state["cloud_reachable"] = True
        return True
    except Exception as e:
        _sync_state["cloud_reachable"] = False
        log.warning(f"Cloud unreachable: {e}")
        return False


# ─── Initial Pull — Credentials First (for new-device login) ─────────────────

async def initial_pull_credentials(username: str):
    """
    Stage 1: Pull just the user row from Supabase for a given email/username.
    Called synchronously during login when the user is not found locally.
    Returns the raw user dict or None.
    """
    cloud = _cloud_db()
    if not cloud:
        return None
    try:
        result = cloud.execute(
            text("SELECT * FROM users WHERE username = :u OR email = :u LIMIT 1"),
            {"u": username}
        ).mappings().first()
        if result:
            return dict(result)
        return None
    except Exception as e:
        log.warning(f"Credential pull failed: {e}")
        return None
    finally:
        cloud.close()


async def initial_pull_all(username: str):
    """
    Stage 2: Pull all remaining data for a user from Supabase into local SQLite.
    Runs as a background task after login. Updates progress in _sync_state.
    """
    # Reset in-memory initial pull fields to default/starting state
    _sync_state["initial_pull_progress"] = 0
    _sync_state["initial_pull_status"] = "Starting sync..."
    _sync_state["initial_pull_done"] = False
    _sync_state["last_error"] = None

    cloud = _cloud_db()
    if not cloud:
        _sync_state["initial_pull_progress"] = 100
        _sync_state["initial_pull_status"] = "Cloud sync not configured"
        _sync_state["initial_pull_done"] = True
        return

    local = LocalSession()
    try:
        # Get user_id from local (should exist after credential pull upserted the user row)
        user_row = local.execute(
            text("SELECT id FROM users WHERE username = :u"), {"u": username}
        ).first()

        if not user_row:
            log.warning("initial_pull_all: user not found locally, aborting.")
            _sync_state["initial_pull_progress"] = 100
            _sync_state["initial_pull_status"] = "User not found locally"
            _sync_state["initial_pull_done"] = True
            return

        user_id = user_row[0]

        # ── Stage: Medications (25%) ──
        _sync_state["initial_pull_status"] = "Syncing medications..."
        _sync_state["initial_pull_progress"] = 5
        await _pull_table(
            cloud, local, "medications", "user_id", user_id,
            exclude_cols=[]
        )
        _sync_state["initial_pull_progress"] = 25

        # ── Stage: Cycle Logs (50%) ──
        _sync_state["initial_pull_status"] = "Syncing cycle data..."
        await _pull_table(cloud, local, "cycle_logs", "user_id", user_id)
        _sync_state["initial_pull_progress"] = 50

        # ── Stage: Appointments / Planner (75%) ──
        _sync_state["initial_pull_status"] = "Syncing appointments..."
        await _pull_table(cloud, local, "appointments", "user_id", user_id)
        _sync_state["initial_pull_progress"] = 75

        # ── Stage: Symptom Logs (100%) ──
        _sync_state["initial_pull_status"] = "Syncing health history..."
        await _pull_table(cloud, local, "symptom_logs", "user_id", user_id)

        # Pull medication_intakes
        _sync_state["initial_pull_status"] = "Finalising..."
        await _pull_medication_intakes(cloud, local, user_id)

        # Push local changes to Supabase so that signup info is also pushed immediately
        await _push_dirty_rows(local, cloud)

        _sync_state["initial_pull_progress"] = 100
        _sync_state["initial_pull_status"] = "All data synced!"
        _sync_state["initial_pull_done"] = True
        _sync_state["last_sync_at"] = datetime.now(timezone.utc)
        log.info(f"Initial pull complete for user: {username}")

    except Exception as e:
        log.error(f"Initial pull error: {e}")
        _sync_state["last_error"] = str(e)
        _sync_state["initial_pull_progress"] = 100
        _sync_state["initial_pull_status"] = f"Sync error: {e}"
        _sync_state["initial_pull_done"] = True
    finally:
        local.close()
        cloud.close()


async def _pull_table(cloud: Session, local: Session, table: str, fk_col: str, user_id: int, exclude_cols: list = None):
    """Generic helper: pull all rows for a user from a cloud table into local SQLite."""
    try:
        rows = cloud.execute(
            text(f"SELECT * FROM {table} WHERE {fk_col} = :uid"),
            {"uid": user_id}
        ).mappings().all()

        now = datetime.utcnow()
        for row in rows:
            row_dict = dict(row)
            if exclude_cols:
                for col in exclude_cols:
                    row_dict.pop(col, None)

            # Build an INSERT OR REPLACE (upsert) for SQLite
            cols = ", ".join(row_dict.keys())
            placeholders = ", ".join([f":{k}" for k in row_dict.keys()])
            local.execute(
                text(f"INSERT OR REPLACE INTO {table} ({cols}) VALUES ({placeholders})"),
                row_dict
            )

            if "synced_at" in row_dict:
                local.execute(
                    text(f"UPDATE {table} SET synced_at = :now WHERE id = :id"),
                    {"now": now, "id": row_dict["id"]}
                )
        local.commit()
    except Exception as e:
        log.warning(f"Pull table '{table}' failed: {e}")
        local.rollback()


async def _pull_medication_intakes(cloud: Session, local: Session, user_id: int):
    """Pull medication_intakes (joined via medications table)."""
    try:
        rows = cloud.execute(
            text("""
                SELECT mi.* FROM medication_intakes mi
                JOIN medications m ON mi.medication_id = m.id
                WHERE m.user_id = :uid
            """),
            {"uid": user_id}
        ).mappings().all()

        for row in rows:
            row_dict = dict(row)
            cols = ", ".join(row_dict.keys())
            placeholders = ", ".join([f":{k}" for k in row_dict.keys()])
            local.execute(
                text(f"INSERT OR REPLACE INTO medication_intakes ({cols}) VALUES ({placeholders})"),
                row_dict
            )
        local.commit()
    except Exception as e:
        log.warning(f"Pull medication_intakes failed: {e}")
        local.rollback()


# ─── Periodic Full Sync ───────────────────────────────────────────────────────

async def run_sync():
    """
    Full bidirectional sync. Called by APScheduler every N minutes.
    Push dirty local rows → Supabase, then pull remote changes → local.
    """
    if _sync_state["is_syncing"]:
        log.info("Sync already running, skipping.")
        return

    if not _test_cloud_connection():
        log.info("Cloud unreachable — skipping sync, will retry next interval.")
        return

    _sync_state["is_syncing"] = True
    _sync_state["last_error"] = None

    cloud = _cloud_db()
    local = LocalSession()

    try:
        pushed = await _push_dirty_rows(local, cloud)
        pulled = await _pull_remote_changes(local, cloud)
        _sync_state["last_sync_at"] = datetime.now(timezone.utc)
        log.info(f"Sync complete. Pushed: {pushed}, Pulled: {pulled}")
        return {"pushed": pushed, "pulled": pulled}
    except Exception as e:
        log.error(f"Sync error: {e}")
        _sync_state["last_error"] = str(e)
        return {"pushed": 0, "pulled": 0, "error": str(e)}
    finally:
        _sync_state["is_syncing"] = False
        local.close()
        if cloud:
            cloud.close()


async def _push_dirty_rows(local: Session, cloud: Session) -> int:
    """Push rows from local_changes_outbox to Supabase."""
    if not cloud:
        return 0

    total_pushed = 0
    now = datetime.utcnow()

    try:
        # Get all pending changes from outbox
        outbox_entries = local.execute(
            text("SELECT * FROM local_changes_outbox ORDER BY id ASC")
        ).mappings().all()

        # Sort outbox entries to prevent ForeignKeyViolations on DELETE actions
        def get_sync_order_key(entry):
            action = entry["action"]
            table = entry["table_name"]
            entry_id = entry["id"]
            
            # Non-deletes run first in chronological order
            if action != "DELETE":
                return (0, entry_id)
                
            # Deletes run after, child-first
            if table == "medication_intakes":
                return (1, entry_id)
            elif table in ("medications", "cycle_logs", "appointments", "symptom_logs"):
                return (2, entry_id)
            elif table == "users":
                return (3, entry_id)
            return (4, entry_id)

        sorted_entries = sorted(outbox_entries, key=get_sync_order_key)

        for entry in sorted_entries:
            table = entry["table_name"]
            row_id = entry["row_id"]
            action = entry["action"]
            
            if action in ("INSERT", "UPDATE"):
                row = local.execute(
                    text(f"SELECT * FROM {table} WHERE id = :id"),
                    {"id": row_id}
                ).mappings().first()

                if not row:
                    # Row was deleted locally after this update was queued, skip it.
                    local.execute(text("DELETE FROM local_changes_outbox WHERE id = :id"), {"id": entry["id"]})
                    continue

                row_dict = _filter_to_cloud_cols(cloud, table, dict(row))
                col_list = ", ".join(row_dict.keys())
                placeholders = ", ".join([f":{k}" for k in row_dict.keys()])
                update_set = ", ".join([f"{k} = EXCLUDED.{k}" for k in row_dict.keys() if k != "id"])

                cloud.execute(
                    text(f"""
                        INSERT INTO {table} ({col_list}) VALUES ({placeholders})
                        ON CONFLICT (id) DO UPDATE SET {update_set}
                    """),
                    row_dict
                )

                if "synced_at" in row_dict:
                    local.execute(
                        text(f"UPDATE {table} SET synced_at = :now WHERE id = :id"),
                        {"now": now, "id": row_id}
                    )
            elif action == "DELETE":
                cloud.execute(
                    text(f"DELETE FROM {table} WHERE id = :id"),
                    {"id": row_id}
                )

            # Remove from outbox
            local.execute(text("DELETE FROM local_changes_outbox WHERE id = :id"), {"id": entry["id"]})
            total_pushed += 1

        if outbox_entries:
            cloud.commit()
            local.commit()
            
    except Exception as e:
        log.warning(f"Push from outbox failed: {e}")
        # Clear column cache so we re-fetch schema on next sync attempt
        _cloud_col_cache.clear()
        try:
            cloud.rollback()
            local.rollback()
        except Exception:
            pass

    _sync_state["pending_push"] = 0
    return total_pushed


async def _pull_remote_changes(local: Session, cloud: Session) -> int:
    """Pull rows from Supabase modified after our last pull → merge into local SQLite."""
    if not cloud or not _sync_state["last_sync_at"]:
        return 0

    last_pull = _sync_state["last_sync_at"]
    tables_with_ts = [
        ("users", "last_modified"),
        ("medications", "last_modified"),
        ("cycle_logs", "last_modified"),
        ("appointments", "last_modified"),
        ("symptom_logs", "last_modified"),
    ]

    total_pulled = 0

    for table, ts_col in tables_with_ts:
        try:
            rows = cloud.execute(
                text(f"SELECT * FROM {table} WHERE {ts_col} > :since"),
                {"since": last_pull}
            ).mappings().all()

            for row in rows:
                row_dict = dict(row)
                row_id = row_dict["id"]
                
                # Conflict Detection for Critical Data
                if table in ("medications", "symptom_logs"):
                    local_row = local.execute(
                        text(f"SELECT * FROM {table} WHERE id = :id"), {"id": row_id}
                    ).mappings().first()
                    
                    if local_row:
                        in_outbox = local.execute(
                            text("SELECT 1 FROM local_changes_outbox WHERE table_name = :t AND row_id = :id"),
                            {"t": table, "id": row_id}
                        ).first()
                        
                        legacy_conflict = local_row.get("last_modified") and local_row.get("synced_at") and local_row["last_modified"] > local_row["synced_at"]
                        
                        if in_outbox or legacy_conflict:
                            import json
                            local.execute(
                                text("""
                                    INSERT INTO sync_conflicts (table_name, row_id, local_data, cloud_data, status)
                                    VALUES (:t, :id, :local_data, :cloud_data, 'AUTO_RESOLVED_LOCAL')
                                """),
                                {
                                    "t": table,
                                    "id": row_id,
                                    "local_data": json.dumps(dict(local_row), default=str),
                                    "cloud_data": json.dumps(row_dict, default=str)
                                }
                            )
                            
                            # Ensure local wins by queueing it to push to the cloud
                            if not in_outbox:
                                local.execute(
                                    text("INSERT INTO local_changes_outbox (table_name, row_id, action) VALUES (:t, :id, 'UPDATE')"),
                                    {"t": table, "id": row_id}
                                )
                                
                            log.info(f"Conflict detected for {table} row {row_id}. Automatically resolved by keeping local version.")
                            continue

                cols = ", ".join(row_dict.keys())
                placeholders = ", ".join([f":{k}" for k in row_dict.keys()])
                local.execute(
                    text(f"INSERT OR REPLACE INTO {table} ({cols}) VALUES ({placeholders})"),
                    row_dict
                )
                total_pulled += 1

            if rows:
                local.commit()

        except Exception as e:
            log.warning(f"Pull remote changes failed for {table}: {e}")
            try:
                local.rollback()
            except Exception:
                pass

    return total_pulled


async def push_user_to_cloud(user_id: int) -> bool:
    """
    Immediately push a single user row to Supabase by ID.

    This is called directly at signup and OTP-verification time so that
    the user account exists in Supabase *before* the server can restart
    and wipe the ephemeral local SQLite.  The outbox/background-sync path
    is intentionally NOT used here because there is no guarantee the
    background task will complete before a Railway dyno restart.

    Returns True on success, False on failure (non-fatal – login fallback
    still works via initial_pull_credentials).
    """
    cloud = _cloud_db()
    if not cloud:
        log.warning("push_user_to_cloud: no cloud engine configured, skipping.")
        return False

    local = LocalSession()
    now = datetime.utcnow()
    try:
        row = local.execute(
            text("SELECT * FROM users WHERE id = :id"),
            {"id": user_id}
        ).mappings().first()

        if not row:
            log.warning(f"push_user_to_cloud: user id={user_id} not found locally.")
            return False

        row_dict = _filter_to_cloud_cols(cloud, "users", dict(row))
        col_list  = ", ".join(row_dict.keys())
        placeholders = ", ".join([f":{k}" for k in row_dict.keys()])
        update_set   = ", ".join([f"{k} = EXCLUDED.{k}" for k in row_dict.keys() if k != "id"])

        cloud.execute(
            text(f"""
                INSERT INTO users ({col_list}) VALUES ({placeholders})
                ON CONFLICT (id) DO UPDATE SET {update_set}
            """),
            row_dict
        )
        cloud.commit()

        # Mark as synced locally so the outbox won't double-push it
        local.execute(
            text("UPDATE users SET synced_at = :now WHERE id = :id"),
            {"now": now, "id": user_id}
        )
        # Remove any pending outbox entries for this user (avoid duplicate push)
        local.execute(
            text("DELETE FROM local_changes_outbox WHERE table_name='users' AND row_id=:id"),
            {"id": user_id}
        )
        local.commit()

        log.info(f"push_user_to_cloud: user id={user_id} pushed to Supabase OK.")
        return True

    except Exception as e:
        log.error(f"push_user_to_cloud: failed for user id={user_id}: {e}")
        try:
            cloud.rollback()
            local.rollback()
        except Exception:
            pass
        return False
    finally:
        local.close()
        cloud.close()


def estimate_pending_push() -> int:
    """Quick count of unsynced rows — used by /sync-status endpoint."""
    local = LocalSession()
    total = 0
    try:
        count = local.execute(
            text("SELECT COUNT(*) FROM local_changes_outbox")
        ).scalar()
        total += count or 0
    except Exception:
        pass
    local.close()
    _sync_state["pending_push"] = total
    return total
