"""Time utilities for Kestrel stream processing."""

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return the current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def to_epoch_ms(dt: datetime) -> int:
    """Convert datetime to Unix epoch timestamp in milliseconds."""
    return int(dt.timestamp() * 1000)
