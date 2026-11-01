"""SQLAlchemy database models for Kestrel persistence."""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    JSON,
    ForeignKey,
    Index,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship

from services.api.app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class TransactionRecord(Base):
    """Persisted raw and enriched transaction entity."""
    __tablename__ = "transactions"

    transaction_id = Column(String(64), primary_key=True, index=True)
    customer_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    merchant_id = Column(String(64), nullable=False)
    merchant_category = Column(String(32), nullable=False, index=True)
    payment_channel = Column(String(32), nullable=False)
    device_id = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    prediction = relationship(
        "PredictionRecord", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )
    decision = relationship(
        "FraudDecisionRecord", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )
    feedback = relationship(
        "FraudFeedbackRecord", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )


class PredictionRecord(Base):
    """Model inference scoring output."""
    __tablename__ = "predictions"

    prediction_id = Column(String(64), primary_key=True, index=True)
    transaction_id = Column(
        String(64), ForeignKey("transactions.transaction_id"), nullable=False, unique=True, index=True
    )
    model_version = Column(String(64), nullable=False, index=True)
    fraud_probability = Column(Float, nullable=False, index=True)
    prediction = Column(Integer, nullable=False)
    inference_latency_ms = Column(Float, default=0.0)
    features_snapshot = Column(JSON, nullable=True)
    scored_at = Column(DateTime(timezone=True), default=utc_now)

    transaction = relationship("TransactionRecord", back_populates="prediction")


class FraudDecisionRecord(Base):
    """Multi-tier business decision output."""
    __tablename__ = "fraud_decisions"

    decision_id = Column(String(64), primary_key=True, index=True)
    transaction_id = Column(
        String(64), ForeignKey("transactions.transaction_id"), nullable=False, unique=True, index=True
    )
    decision = Column(String(16), nullable=False, index=True)  # APPROVE, REVIEW, BLOCK
    reason_codes = Column(JSON, nullable=True)
    overridden_by = Column(String(64), nullable=True)
    decided_at = Column(DateTime(timezone=True), default=utc_now)

    transaction = relationship("TransactionRecord", back_populates="decision")


class FraudFeedbackRecord(Base):
    """Ground-truth label feedback submitted by fraud analysts."""
    __tablename__ = "fraud_feedback"

    feedback_id = Column(String(64), primary_key=True, index=True)
    transaction_id = Column(
        String(64), ForeignKey("transactions.transaction_id"), nullable=False, unique=True, index=True
    )
    actual_label = Column(Integer, nullable=False)  # 1 for fraud, 0 for legitimate
    reported_by = Column(String(64), nullable=False)
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=utc_now)

    transaction = relationship("TransactionRecord", back_populates="feedback")
