"""Canonical transaction event schemas for Kestrel."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator


class MerchantCategory(str, Enum):
    RETAIL = "retail"
    GROCERY = "grocery"
    ELECTRONICS = "electronics"
    TRAVEL = "travel"
    DINING = "dining"
    ENTERTAINMENT = "entertainment"
    GAMING = "gaming"
    CRYPTO = "crypto"
    UTILITIES = "utilities"


class PaymentChannel(str, Enum):
    ONLINE = "online"
    POS_CHIP = "pos_chip"
    POS_CONTACTLESS = "pos_contactless"
    ATM = "atm"
    MOBILE_APP = "mobile_app"


class DecisionType(str, Enum):
    APPROVE = "APPROVE"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"


class GeoLocation(BaseModel):
    """Optional geographic metadata associated with transaction."""
    country: Optional[str] = Field(None, max_length=2)
    city: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)


class TransactionRaw(BaseModel):
    """Raw transaction event ingested by Kestrel."""
    transaction_id: str = Field(default_factory=lambda: str(uuid4()))
    customer_id: str = Field(..., min_length=1, description="Pseudonymized customer token")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    amount: float = Field(..., gt=0.0, description="Transaction amount in currency units")
    currency: str = Field("USD", min_length=3, max_length=3)
    merchant_id: str = Field(..., min_length=1)
    merchant_category: MerchantCategory
    payment_channel: PaymentChannel
    location: Optional[GeoLocation] = None
    device_id: Optional[str] = None
    schema_version: str = "1.0.0"

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0.0:
            raise ValueError("Amount must be strictly positive")
        return round(v, 2)


class TransactionFeatures(BaseModel):
    """Real-time enriched features utilized for model inference."""
    amount: float
    log_amount: float
    hour_of_day: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    is_weekend: int = Field(..., ge=0, le=1)
    is_night: int = Field(..., ge=0, le=1)
    txns_last_1m: int = Field(1, ge=0)
    txns_last_5m: int = Field(1, ge=0)
    txns_last_1h: int = Field(1, ge=0)
    amount_sum_1h: float = Field(0.0, ge=0.0)
    amount_avg_1h: float = Field(0.0, ge=0.0)
    amount_to_avg_ratio: float = Field(1.0, ge=0.0)
    time_since_last_txn_sec: float = Field(3600.0, ge=0.0)
    distinct_merchants_1h: int = Field(1, ge=0)
    is_high_risk_category: int = Field(0, ge=0, le=1)


class ScoredTransaction(BaseModel):
    """Transaction enriched with model inference output and decision policy."""
    transaction_id: str
    customer_id: str
    timestamp: datetime
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    amount: float
    currency: str = "USD"
    merchant_id: str
    merchant_category: MerchantCategory
    payment_channel: PaymentChannel
    features: TransactionFeatures
    fraud_probability: float = Field(..., ge=0.0, le=1.0)
    prediction: int = Field(..., ge=0, le=1)
    decision: DecisionType
    reason_codes: List[str] = Field(default_factory=list)
    model_version: str
    inference_latency_ms: float = 0.0
    schema_version: str = "1.0.0"


class FraudFeedbackSubmission(BaseModel):
    """Ground-truth feedback submitted by human fraud analyst."""
    actual_label: int = Field(..., ge=0, le=1, description="1 if fraud, 0 if legitimate")
    reported_by: str = Field(..., min_length=1)
    notes: Optional[str] = None
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DeadLetterEvent(BaseModel):
    """Dead-letter envelope for corrupted or invalid payloads."""
    dlq_id: str = Field(default_factory=lambda: str(uuid4()))
    failed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source_topic: str
    partition: Optional[int] = None
    offset: Optional[int] = None
    error_type: str
    error_message: str
    raw_payload: str
    schema_version: str = "1.0.0"
