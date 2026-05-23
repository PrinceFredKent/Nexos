# Explicitly import all ORM models so SQLAlchemy metadata includes every table.
from . import appointment
from . import cycle
from . import health_data
from . import health_knowledge
from . import medication
from . import outbox
from . import sync_conflict
from . import sync_meta
from . import user

__all__ = [
    "appointment",
    "cycle",
    "health_data",
    "health_knowledge",
    "medication",
    "outbox",
    "sync_conflict",
    "sync_meta",
    "user",
]
