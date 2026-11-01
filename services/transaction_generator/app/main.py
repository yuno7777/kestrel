"""Continuous and batch synthetic financial transaction generator for Kestrel."""

import argparse
import asyncio
import json
import random
import time
from datetime import datetime, timezone
from typing import Optional
import httpx

from kestrel_common.config import settings
from kestrel_common.logging import get_logger
from ml.data.generator import SyntheticTransactionGenerator

logger = get_logger("kestrel.generator")


async def run_generator(
    tps: int = 10,
    fraud_ratio: float = 0.02,
    duration_sec: Optional[int] = None,
    api_url: Optional[str] = None,
    kafka_broker: Optional[str] = None,
):
    """Generate realistic transaction stream and publish to API or Kafka."""
    logger.info(
        f"Starting Kestrel Transaction Generator: target={tps} TPS, fraud_ratio={fraud_ratio:.1%}"
    )
    generator = SyntheticTransactionGenerator(seed=settings.GENERATOR_SEED)
    api_endpoint = api_url or f"http://{settings.API_HOST}:{settings.API_PORT}/api/v1/transactions"
    if "0.0.0.0" in api_endpoint:
        api_endpoint = api_endpoint.replace("0.0.0.0", "127.0.0.1")

    # Attempt Kafka connection if specified
    producer = None
    if kafka_broker:
        try:
            from aiokafka import AIOKafkaProducer
            producer = AIOKafkaProducer(bootstrap_servers=kafka_broker)
            await producer.start()
            logger.info(f"Connected to Kafka broker at {kafka_broker}")
        except Exception as e:
            logger.warning(f"Kafka unavailable ({e}); streaming directly to REST API.")
            producer = None

    start_time = time.time()
    events_sent = 0
    client = httpx.AsyncClient(timeout=5.0)

    try:
        while True:
            batch_start = time.perf_counter()

            # Generate a mini-batch matching 1 second interval
            df = generator.generate_dataset(num_records=tps, fraud_ratio=fraud_ratio)

            for _, row in df.iterrows():
                payload = {
                    "transaction_id": row["transaction_id"],
                    "customer_id": row["customer_id"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "amount": float(row["amount"]),
                    "currency": "USD",
                    "merchant_id": row["merchant_id"],
                    "merchant_category": row["merchant_category"],
                    "payment_channel": row["payment_channel"],
                    "device_id": f"dev_{random.randint(1000, 9999)}",
                }

                if producer:
                    try:
                        key = payload["customer_id"].encode("utf-8")
                        val = json.dumps(payload).encode("utf-8")
                        await producer.send(settings.KAFKA_RAW_TOPIC, val, key=key)
                        events_sent += 1
                    except Exception as k_err:
                        logger.error(f"Kafka send error: {k_err}")
                else:
                    # Stream to API endpoint
                    try:
                        resp = await client.post(api_endpoint, json=payload)
                        if resp.status_code == 200:
                            events_sent += 1
                    except Exception as http_err:
                        # Log throttled
                        if events_sent % 50 == 0:
                            logger.warning(f"API delivery warning: {http_err}")

            elapsed = time.perf_counter() - batch_start
            sleep_duration = max(0.0, 1.0 - elapsed)
            await asyncio.sleep(sleep_duration)

            if events_sent % (tps * 5) == 0:
                logger.info(f"Generated and delivered {events_sent} transactions.")

            if duration_sec and (time.time() - start_time) >= duration_sec:
                logger.info(f"Duration {duration_sec}s reached. Sent {events_sent} events.")
                break

    finally:
        await client.aclose()
        if producer:
            await producer.stop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kestrel Transaction Generator")
    parser.add_argument("--tps", type=int, default=15, help="Transactions per second")
    parser.add_argument("--fraud-ratio", type=float, default=0.025, help="Proportion of fraudulent transactions")
    parser.add_argument("--duration", type=int, default=None, help="Duration in seconds (default: infinite)")
    parser.add_argument("--api-url", type=str, default=None, help="Direct HTTP ingress endpoint")
    parser.add_argument("--kafka", type=str, default=None, help="Kafka bootstrap broker")
    parser.add_argument("--standalone", action="store_true", help="Run standalone without Kafka")
    args = parser.parse_args()

    asyncio.run(
        run_generator(
            tps=args.tps,
            fraud_ratio=args.fraud_ratio,
            duration_sec=args.duration,
            api_url=args.api_url,
            kafka_broker=args.kafka if not args.standalone else None,
        )
    )
