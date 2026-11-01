"""Redis-backed real-time velocity feature store with in-memory fallback."""

import asyncio
import math
import time
from typing import Dict, Any, Tuple, Optional, List
import redis.asyncio as aioredis

from kestrel_common.config import settings
from kestrel_common.logging import get_logger
from kestrel_common.schemas import TransactionFeatures

logger = get_logger("kestrel.redis_store")


class RedisFeatureStore:
    """Manages customer velocity sliding windows in Redis with local fallback."""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        db: Optional[int] = None,
    ):
        self.host = host or settings.REDIS_HOST
        self.port = port or settings.REDIS_PORT
        self.db = db if db is not None else settings.REDIS_DB
        self.client: Optional[aioredis.Redis] = None
        self.is_connected = False

        # In-memory fallback structures
        # customer_id -> list of (epoch_sec, amount, merchant_id)
        self._memory_velocity: Dict[str, List[Tuple[float, float, str]]] = {}
        self._seen_txns: set = set()
        self._lock = asyncio.Lock()

    async def connect(self):
        """Establish async Redis connection with timeout."""
        try:
            self.client = aioredis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                socket_timeout=settings.REDIS_TIMEOUT_SECONDS,
                decode_responses=True,
            )
            await asyncio.wait_for(self.client.ping(), timeout=1.0)
            self.is_connected = True
            logger.info(f"Connected to Redis feature store at {self.host}:{self.port}")
        except Exception as e:
            self.is_connected = False
            logger.warning(
                f"Redis unavailable ({e}). Using in-memory sliding-window fallback."
            )

    async def close(self):
        """Close connection if open."""
        if self.client:
            await self.client.aclose()
            self.is_connected = False

    async def check_duplicate(self, transaction_id: str) -> bool:
        """Check if transaction ID has already been seen."""
        if self.is_connected and self.client:
            try:
                key = f"kestrel:dedup:{transaction_id}"
                # SET with NX returns True if set, None if already existed
                was_set = await self.client.set(key, "1", ex=86400, nx=True)
                return was_set is None
            except Exception:
                pass

        async with self._lock:
            if transaction_id in self._seen_txns:
                return True
            self._seen_txns.add(transaction_id)
            if len(self._seen_txns) > 50000:
                self._seen_txns.pop()
            return False

    async def hydrate_and_update(
        self,
        customer_id: str,
        transaction_id: str,
        amount: float,
        merchant_id: str,
        timestamp_epoch_sec: float,
        hour: int,
        day: int,
        is_high_risk: int,
    ) -> TransactionFeatures:
        """Hydrate sliding window velocity features and append current event."""
        now_sec = timestamp_epoch_sec
        one_min_ago = now_sec - 60.0
        five_min_ago = now_sec - 300.0
        one_hour_ago = now_sec - 3600.0

        if self.is_connected and self.client:
            try:
                key = f"kestrel:velocity:{customer_id}"
                member = f"{transaction_id}:{amount}:{merchant_id}"

                async with self.client.pipeline(transaction=True) as pipe:
                    # 1. Prune entries older than 1 hour
                    pipe.zremrangebyscore(key, "-inf", one_hour_ago)
                    # 2. Add current transaction
                    pipe.zadd(key, {member: now_sec})
                    # 3. Refresh TTL
                    pipe.expire(key, 86400)
                    # 4. Count last 1m
                    pipe.zcount(key, one_min_ago, now_sec)
                    # 5. Count last 5m
                    pipe.zcount(key, five_min_ago, now_sec)
                    # 6. Retrieve all entries in last 1 hour
                    pipe.zrangebyscore(key, one_hour_ago, now_sec)
                    res = await pipe.execute()

                txns_1m = int(res[3])
                txns_5m = int(res[4])
                records_1h = res[5]
                txns_1h = len(records_1h)

                # Parse amounts and merchants
                amounts_1h = []
                merchants_1h = set()
                for rec in records_1h:
                    parts = rec.split(":")
                    if len(parts) >= 2:
                        try:
                            amounts_1h.append(float(parts[1]))
                        except ValueError:
                            pass
                    if len(parts) >= 3:
                        merchants_1h.add(parts[2])

                sum_1h = sum(amounts_1h)
                avg_1h = sum_1h / max(txns_1h, 1)
                amount_to_avg = amount / max(avg_1h, 1.0)
                distinct_merchants = len(merchants_1h) or 1
                time_since_last = 3600.0

                return TransactionFeatures(
                    amount=amount,
                    log_amount=round(float(math.log(amount + 1)), 4),
                    hour_of_day=hour,
                    day_of_week=day,
                    is_weekend=1 if day in (5, 6) else 0,
                    is_night=1 if hour in (0, 1, 2, 3, 4, 5) else 0,
                    txns_last_1m=txns_1m,
                    txns_last_5m=txns_5m,
                    txns_last_1h=txns_1h,
                    amount_sum_1h=round(sum_1h, 2),
                    amount_avg_1h=round(avg_1h, 2),
                    amount_to_avg_ratio=round(amount_to_avg, 2),
                    time_since_last_txn_sec=time_since_last,
                    distinct_merchants_1h=distinct_merchants,
                    is_high_risk_category=is_high_risk,
                )
            except Exception as e:
                logger.warning(f"Redis pipeline error: {e}. Falling back to in-memory.")

        # In-memory sliding window fallback
        async with self._lock:
            history = self._memory_velocity.setdefault(customer_id, [])

            # Prune older than 1 hour
            history = [h for h in history if h[0] >= one_hour_ago]

            recent_1m = [h for h in history if h[0] >= one_min_ago]
            recent_5m = [h for h in history if h[0] >= five_min_ago]

            txns_1m = len(recent_1m) + 1
            txns_5m = len(recent_5m) + 1
            txns_1h = len(history) + 1

            past_amounts = [h[1] for h in history]
            sum_1h = sum(past_amounts) + amount
            avg_1h = sum_1h / max(txns_1h, 1)
            amount_to_avg = amount / max(
                (sum(past_amounts) / len(past_amounts)) if past_amounts else amount,
                1.0,
            )

            time_since_last = (
                (now_sec - history[-1][0]) if history else 3600.0
            )
            distinct_merchants = len(set([h[2] for h in history] + [merchant_id]))

            history.append((now_sec, amount, merchant_id))
            self._memory_velocity[customer_id] = history

            return TransactionFeatures(
                amount=amount,
                log_amount=round(float(math.log(amount + 1)), 4),
                hour_of_day=hour,
                day_of_week=day,
                is_weekend=1 if day in (5, 6) else 0,
                is_night=1 if hour in (0, 1, 2, 3, 4, 5) else 0,
                txns_last_1m=txns_1m,
                txns_last_5m=txns_5m,
                txns_last_1h=txns_1h,
                amount_sum_1h=round(sum_1h, 2),
                amount_avg_1h=round(avg_1h, 2),
                amount_to_avg_ratio=round(amount_to_avg, 2),
                time_since_last_txn_sec=round(time_since_last, 1),
                distinct_merchants_1h=distinct_merchants,
                is_high_risk_category=is_high_risk,
            )
