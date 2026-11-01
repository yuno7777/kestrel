"""Structured logging configuration for Kestrel."""

import logging
import sys
from typing import Any, Dict


class KestrelFormatter(logging.Formatter):
    """Custom formatter producing readable and consistent log records."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        level = record.levelname.ljust(8)
        name = record.name
        message = record.getMessage()

        base = f"[{timestamp}] [{level}] [{name}] {message}"
        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)
        return base


def get_logger(name: str, level: str = "INFO") -> logging.Logger:
    """Create or retrieve a preconfigured logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(KestrelFormatter())
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, level.upper(), logging.INFO))
        logger.propagate = False
    return logger
