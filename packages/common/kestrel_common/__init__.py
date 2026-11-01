"""Kestrel Common Library."""

from kestrel_common.config import settings, KestrelSettings
from kestrel_common.logging import get_logger
from kestrel_common.schemas import (
    TransactionRaw,
    TransactionFeatures,
    ScoredTransaction,
    DecisionType,
    MerchantCategory,
    PaymentChannel,
    DeadLetterEvent,
    FraudFeedbackSubmission,
)

__version__ = "1.0.0"

__all__ = [
    "settings",
    "KestrelSettings",
    "get_logger",
    "TransactionRaw",
    "TransactionFeatures",
    "ScoredTransaction",
    "DecisionType",
    "MerchantCategory",
    "PaymentChannel",
    "DeadLetterEvent",
    "FraudFeedbackSubmission",
]
