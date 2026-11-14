"""Defensive compatibility module for ConsentHistory.
The ConsentHistory model is defined in app.models.record.
This module re-exports it to guarantee backward compatibility with any direct imports.
"""
from app.models.record import ConsentHistory

__all__ = ["ConsentHistory"]

