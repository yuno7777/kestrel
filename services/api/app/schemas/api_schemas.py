"""Pydantic schemas for FastAPI endpoints."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from kestrel_common.schemas import (
    TransactionFeatures,
    DecisionType,
    MerchantCategory,
    PaymentChannel,
)


class PredictRequest(BaseModel):
    """Inbound inference scoring request."""
    transaction_id: str
    customer_id: str
    amount: float
    currency: str = "USD"
    merchant_category: MerchantCategory = MerchantCategory.RETAIL
    payment_channel: PaymentChannel = PaymentChannel.ONLINE
    features: TransactionFeatures


class PredictResponse(BaseModel):
    """Inference scoring response."""
    transaction_id: str
    fraud_probability: float
    prediction: int
    decision: DecisionType
    reason_codes: List[str]
    model_version: str
    inference_latency_ms: float
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransactionResponse(BaseModel):
    """Full historical transaction detail with prediction and decision."""
    transaction_id: str
    customer_id: str
    timestamp: datetime
    amount: float
    currency: str
    merchant_id: str
    merchant_category: str
    payment_channel: str
    fraud_probability: Optional[float] = None
    prediction: Optional[int] = None
    decision: Optional[str] = None
    reason_codes: Optional[List[str]] = None
    model_version: Optional[str] = None
    inference_latency_ms: Optional[float] = None
    feedback_label: Optional[int] = None
    features: Optional[Dict[str, Any]] = None


class PaginatedTransactionsResponse(BaseModel):
    """Paginated list of transactions."""
    total: int
    page: int
    page_size: int
    items: List[TransactionResponse]


class SystemSummaryResponse(BaseModel):
    """Platform operational summary KPIs."""
    total_transactions_processed: int
    fraud_transactions_detected: int
    approval_rate: float
    review_rate: float
    block_rate: float
    avg_inference_latency_ms: float
    p95_inference_latency_ms: float
    active_model_version: str
    system_status: str


class ActivateModelRequest(BaseModel):
    """Request to change active model version."""
    model_version: str
