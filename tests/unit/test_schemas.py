"""Unit tests for Kestrel event schemas and validations."""

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError
from kestrel_common.schemas import (
    TransactionRaw,
    TransactionFeatures,
    ScoredTransaction,
    DecisionType,
    MerchantCategory,
    PaymentChannel,
    DeadLetterEvent,
)


def test_transaction_raw_valid():
    """Test valid transaction creation and rounding."""
    txn = TransactionRaw(
        customer_id="cust_123",
        amount=149.999,
        merchant_id="merch_456",
        merchant_category=MerchantCategory.ELECTRONICS,
        payment_channel=PaymentChannel.ONLINE,
    )
    assert txn.customer_id == "cust_123"
    assert txn.amount == 150.00  # rounded to 2 decimals
    assert txn.currency == "USD"
    assert txn.schema_version == "1.0.0"


def test_transaction_raw_negative_amount_fails():
    """Test that zero or negative amounts fail validation."""
    with pytest.raises(ValidationError):
        TransactionRaw(
            customer_id="cust_123",
            amount=-25.0,
            merchant_id="merch_456",
            merchant_category=MerchantCategory.RETAIL,
            payment_channel=PaymentChannel.POS_CHIP,
        )


def test_transaction_features_defaults():
    """Test default values for feature enrichment."""
    features = TransactionFeatures(
        amount=100.0,
        log_amount=4.615,
        hour_of_day=14,
        day_of_week=2,
        is_weekend=0,
        is_night=0,
    )
    assert features.txns_last_1m == 1
    assert features.amount_to_avg_ratio == 1.0
    assert features.is_high_risk_category == 0


def test_scored_transaction_structure():
    """Test scored transaction structure and valid decisions."""
    features = TransactionFeatures(
        amount=2500.0,
        log_amount=7.824,
        hour_of_day=3,
        day_of_week=6,
        is_weekend=1,
        is_night=1,
        txns_last_1m=4,
        amount_to_avg_ratio=5.2,
        is_high_risk_category=1,
    )
    scored = ScoredTransaction(
        transaction_id="test_id_001",
        customer_id="cust_999",
        timestamp=datetime.now(timezone.utc),
        amount=2500.0,
        merchant_id="merch_crypto_01",
        merchant_category=MerchantCategory.CRYPTO,
        payment_channel=PaymentChannel.ONLINE,
        features=features,
        fraud_probability=0.89,
        prediction=1,
        decision=DecisionType.BLOCK,
        reason_codes=["HIGH_VELOCITY_SPIKE", "NOCTURNAL_HIGH_RISK_CATEGORY"],
        model_version="kestrel-hgb-v1.0.0",
        inference_latency_ms=3.12,
    )
    assert scored.decision == DecisionType.BLOCK
    assert scored.prediction == 1
    assert len(scored.reason_codes) == 2


def test_dead_letter_event():
    """Test dead letter event serialization."""
    dlq = DeadLetterEvent(
        source_topic="transactions.raw",
        partition=1,
        offset=504,
        error_type="ValidationError",
        error_message="Invalid currency",
        raw_payload="{\"bad\":\"payload\"}",
    )
    assert dlq.source_topic == "transactions.raw"
    assert dlq.error_type == "ValidationError"
