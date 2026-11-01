"""Entry point for Kestrel Stream Processor."""

import asyncio
import json
import os
import signal
from kestrel_common.config import settings
from kestrel_common.logging import get_logger
from services.stream_processor.app.processor import StreamProcessor

logger = get_logger("kestrel.stream_processor.main")


async def run_processor(standalone: bool = False):
    """Run stream processor worker loop."""
    processor = StreamProcessor()
    await processor.initialize()

    logger.info("Kestrel Stream Processor started.")

    if not standalone:
        try:
            from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

            consumer = AIOKafkaConsumer(
                settings.KAFKA_RAW_TOPIC,
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                group_id=settings.KAFKA_CONSUMER_GROUP,
                auto_offset_reset="latest",
                enable_auto_commit=False,
            )
            producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS
            )

            await consumer.start()
            await producer.start()
            logger.info(f"Subscribed to Kafka topic: {settings.KAFKA_RAW_TOPIC}")

            try:
                async for msg in consumer:
                    try:
                        raw_payload = json.loads(msg.value.decode("utf-8"))
                        scored, dlq = await processor.process_raw_event(raw_payload)

                        if dlq:
                            await producer.send_and_wait(
                                settings.KAFKA_DLQ_TOPIC,
                                json.dumps(dlq.model_dump()).encode("utf-8"),
                            )
                        elif scored:
                            scored_bytes = json.dumps(scored.model_dump(), default=str).encode("utf-8")
                            # Route to scored topic
                            await producer.send(settings.KAFKA_SCORED_TOPIC, scored_bytes, key=scored.customer_id.encode("utf-8"))

                            # Route to high risk topics if appropriate
                            if scored.decision.value == "BLOCK":
                                await producer.send(settings.KAFKA_FRAUD_TOPIC, scored_bytes, key=scored.customer_id.encode("utf-8"))
                            elif scored.decision.value == "REVIEW":
                                await producer.send(settings.KAFKA_REVIEW_TOPIC, scored_bytes, key=scored.customer_id.encode("utf-8"))

                        await consumer.commit()
                    except Exception as loop_err:
                        logger.error(f"Error processing record: {loop_err}", exc_info=True)

            finally:
                await consumer.stop()
                await producer.stop()

        except Exception as kafka_err:
            logger.warning(
                f"Kafka unreachable ({kafka_err}). Stream processor running in standby local mode."
            )
            while True:
                await asyncio.sleep(5)
    else:
        logger.info("Running in standalone demo mode.")
        while True:
            await asyncio.sleep(1)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--standalone", action="store_true")
    args = parser.parse_args()

    asyncio.run(run_processor(standalone=args.standalone))
