"""Decoupled asynchronous persistence worker for Kestrel."""

import asyncio
import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.dialects.sqlite import insert as sqlite_upsert
from sqlalchemy.ext.asyncio import AsyncSession

from kestrel_common.config import settings
from kestrel_common.logging import get_logger
from services.api.app.core.database import AsyncSessionLocal, init_db
from services.api.app.models.db_models import (
    TransactionRecord,
    PredictionRecord,
    FraudDecisionRecord,
)

logger = get_logger("kestrel.persistence_worker")


async def persist_batch(session: AsyncSession, batch: List[Dict[str, Any]]):
    """Idempotently insert or update a batch of scored transactions."""
    for item in batch:
        txn_id = item["transaction_id"]

        # Parse timestamp
        raw_ts = item.get("timestamp")
        if isinstance(raw_ts, str):
            dt = datetime.fromisoformat(raw_ts)
        else:
            dt = datetime.now(timezone.utc)

        # Check existing
        existing = await session.get(TransactionRecord, txn_id)
        if existing:
            continue

        txn_record = TransactionRecord(
            transaction_id=txn_id,
            customer_id=item["customer_id"],
            timestamp=dt,
            amount=item["amount"],
            currency=item.get("currency", "USD"),
            merchant_id=item.get("merchant_id", "unknown"),
            merchant_category=item.get("merchant_category", "retail"),
            payment_channel=item.get("payment_channel", "online"),
            device_id=item.get("device_id"),
        )
        pred_record = PredictionRecord(
            prediction_id=f"pred_{txn_id}",
            transaction_id=txn_id,
            model_version=item.get("model_version", "kestrel-hgb-v1.0.0"),
            fraud_probability=item.get("fraud_probability", 0.0),
            prediction=item.get("prediction", 0),
            inference_latency_ms=item.get("inference_latency_ms", 0.0),
            features_snapshot=item.get("features"),
        )
        dec_record = FraudDecisionRecord(
            decision_id=f"dec_{txn_id}",
            transaction_id=txn_id,
            decision=item.get("decision", "APPROVE"),
            reason_codes=item.get("reason_codes", []),
        )

        session.add(txn_record)
        session.add(pred_record)
        session.add(dec_record)

    await session.commit()
    logger.info(f"Persisted batch of {len(batch)} records to database.")


async def run_persistence_worker():
    """Main worker loop subscribing to transactions.scored or waiting for events."""
    logger.info("Starting Kestrel Persistence Worker...")
    await init_db()

    try:
        from aiokafka import AIOKafkaConsumer

        consumer = AIOKafkaConsumer(
            settings.KAFKA_SCORED_TOPIC,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.KAFKA_PERSISTENCE_GROUP,
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            max_poll_records=100,
        )
        await consumer.start()
        logger.info(f"Subscribed to topic: {settings.KAFKA_SCORED_TOPIC}")

        try:
            while True:
                data = await consumer.getmany(timeout_ms=1000, max_records=100)
                batch = []
                for tp, messages in data.items():
                    for msg in messages:
                        try:
                            record = json.loads(msg.value.decode("utf-8"))
                            batch.append(record)
                        except Exception as e:
                            logger.error(f"Error parsing scored message: {e}")

                if batch:
                    async with AsyncSessionLocal() as session:
                        await persist_batch(session, batch)
                    await consumer.commit()

        finally:
            await consumer.stop()

    except Exception as e:
        logger.warning(f"Kafka unavailable ({e}). Persistence worker standby mode.")
        while True:
            await asyncio.sleep(10)


if __name__ == "__main__":
    asyncio.run(run_persistence_worker())
