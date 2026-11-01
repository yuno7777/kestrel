"""Core stream processing pipeline for Kestrel."""

import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from pydantic import ValidationError

from kestrel_common.schemas import (
    TransactionRaw,
    TransactionFeatures,
    ScoredTransaction,
    DeadLetterEvent,
    DecisionType,
)
from kestrel_common.logging import get_logger
from services.stream_processor.app.redis_store import RedisFeatureStore
from services.api.app.services.model_manager import model_manager
from services.api.app.services.decision_engine import DecisionEngine

logger = get_logger("kestrel.stream_processor")


class StreamProcessor:
    """Consumes, validates, enriches, and scores transactions."""

    def __init__(self, redis_store: Optional[RedisFeatureStore] = None):
        self.redis_store = redis_store or RedisFeatureStore()
        self.decision_engine = DecisionEngine()

    async def initialize(self):
        """Initialize Redis connection and load champion ML model."""
        await self.redis_store.connect()
        if model_manager.model is None:
            model_manager.load_active_model()

    async def process_raw_event(
        self, raw_data: Dict[str, Any]
    ) -> Tuple[Optional[ScoredTransaction], Optional[DeadLetterEvent]]:
        """Process a single raw transaction event."""
        # 1. Pydantic Validation
        try:
            txn = TransactionRaw.model_validate(raw_data)
        except (ValidationError, Exception) as val_err:
            dlq = DeadLetterEvent(
                source_topic="transactions.raw",
                error_type=type(val_err).__name__,
                error_message=str(val_err),
                raw_payload=str(raw_data),
            )
            logger.warning(f"Validation failed for event: {val_err}")
            return None, dlq

        # 2. Idempotency & Deduplication
        is_dup = await self.redis_store.check_duplicate(txn.transaction_id)
        if is_dup:
            logger.info(f"Duplicate transaction skipped: {txn.transaction_id}")
            return None, None

        # 3. Feature Hydration
        dt = txn.timestamp
        hour = dt.hour
        day = dt.weekday()
        is_high_risk = 1 if txn.merchant_category.value in ("crypto", "electronics", "gaming") else 0

        features = await self.redis_store.hydrate_and_update(
            customer_id=txn.customer_id,
            transaction_id=txn.transaction_id,
            amount=txn.amount,
            merchant_id=txn.merchant_id,
            timestamp_epoch_sec=dt.timestamp(),
            hour=hour,
            day=day,
            is_high_risk=is_high_risk,
        )

        # 4. ML Inference
        fraud_prob, pred_class, latency_ms = model_manager.predict(
            features,
            merchant_category=txn.merchant_category.value,
            payment_channel=txn.payment_channel.value,
        )

        # 5. Multi-tier Decision Policy
        decision, reason_codes = self.decision_engine.evaluate(fraud_prob, features)

        scored = ScoredTransaction(
            transaction_id=txn.transaction_id,
            customer_id=txn.customer_id,
            timestamp=txn.timestamp,
            processed_at=datetime.now(timezone.utc),
            amount=txn.amount,
            currency=txn.currency,
            merchant_id=txn.merchant_id,
            merchant_category=txn.merchant_category,
            payment_channel=txn.payment_channel,
            features=features,
            fraud_probability=fraud_prob,
            prediction=pred_class,
            decision=decision,
            reason_codes=reason_codes,
            model_version=model_manager.active_version or "kestrel-hgb-v1.0.0",
            inference_latency_ms=latency_ms,
        )

        return scored, None
