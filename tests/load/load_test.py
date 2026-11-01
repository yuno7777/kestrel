"""Asynchronous high-throughput load testing and benchmarking tool for Kestrel."""

import argparse
import asyncio
import json
import random
import statistics
import time
from datetime import datetime, timezone
from typing import List, Dict, Any
import httpx

from ml.data.generator import SyntheticTransactionGenerator


async def worker(
    queue: asyncio.Queue,
    client: httpx.AsyncClient,
    api_url: str,
    latencies: List[float],
    status_counts: Dict[int, int],
):
    """Worker task sending scoring requests concurrently."""
    while True:
        try:
            payload = await queue.get()
        except asyncio.CancelledError:
            break

        start = time.perf_counter()
        try:
            resp = await client.post(api_url, json=payload)
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            latencies.append(elapsed_ms)
            status_counts[resp.status_code] = status_counts.get(resp.status_code, 0) + 1
        except Exception:
            status_counts[500] = status_counts.get(500, 0) + 1
        finally:
            queue.task_done()


async def run_benchmark(
    api_url: str = "http://127.0.0.1:8000/api/v1/predict",
    total_requests: int = 500,
    concurrency: int = 15,
) -> Dict[str, Any]:
    """Execute concurrent load test against Kestrel inference endpoint."""
    print(f"\n========================================================")
    print(f"  KESTREL PERFORMANCE BENCHMARK SUITE")
    print(f"========================================================")
    print(f"Target Endpoint:  {api_url}")
    print(f"Total Requests:   {total_requests}")
    print(f"Concurrency:      {concurrency} concurrent workers")
    print(f"--------------------------------------------------------")

    gen = SyntheticTransactionGenerator(seed=123)
    df = gen.generate_dataset(num_records=total_requests, fraud_ratio=0.03)

    queue = asyncio.Queue()
    latencies: List[float] = []
    status_counts: Dict[int, int] = {}

    # Populate queue with real payload features
    for _, row in df.iterrows():
        payload = {
            "transaction_id": row["transaction_id"],
            "customer_id": row["customer_id"],
            "amount": float(row["amount"]),
            "currency": "USD",
            "merchant_category": row["merchant_category"],
            "payment_channel": row["payment_channel"],
            "features": {
                "amount": float(row["amount"]),
                "log_amount": float(row["log_amount"]),
                "hour_of_day": int(row["hour_of_day"]),
                "day_of_week": int(row["day_of_week"]),
                "is_weekend": int(row["is_weekend"]),
                "is_night": int(row["is_night"]),
                "txns_last_1m": int(row["txns_last_1m"]),
                "txns_last_5m": int(row["txns_last_5m"]),
                "txns_last_1h": int(row["txns_last_1h"]),
                "amount_sum_1h": float(row["amount_sum_1h"]),
                "amount_avg_1h": float(row["amount_avg_1h"]),
                "amount_to_avg_ratio": float(row["amount_to_avg_ratio"]),
                "time_since_last_txn_sec": float(row["time_since_last_txn_sec"]),
                "distinct_merchants_1h": int(row["distinct_merchants_1h"]),
                "is_high_risk_category": int(row["is_high_risk_category"]),
            },
        }
        queue.put_nowait(payload)

    limits = httpx.Limits(max_connections=concurrency * 2, max_keepalive_connections=concurrency)
    timeout = httpx.Timeout(10.0, connect=3.0)

    start_bench = time.perf_counter()

    async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
        # Spawn workers
        tasks = [
            asyncio.create_task(
                worker(queue, client, api_url, latencies, status_counts)
            )
            for _ in range(concurrency)
        ]

        # Wait for all requests to finish
        await queue.join()

        # Cancel workers
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    total_time_sec = time.perf_counter() - start_bench
    throughput_rps = round(len(latencies) / total_time_sec, 2)

    latencies.sort()
    p50 = round(statistics.median(latencies), 2)
    p90 = round(latencies[int(len(latencies) * 0.90)], 2)
    p95 = round(latencies[int(len(latencies) * 0.95)], 2)
    p99 = round(latencies[int(len(latencies) * 0.99)], 2)
    avg_lat = round(statistics.mean(latencies), 2)
    success_count = status_counts.get(200, 0)
    failed_count = sum(c for code, c in status_counts.items() if code != 200)

    report = {
        "benchmark_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_requests": len(latencies),
        "successful_requests": success_count,
        "failed_requests": failed_count,
        "duration_seconds": round(total_time_sec, 3),
        "throughput_requests_per_sec": throughput_rps,
        "latency_ms": {
            "mean": avg_lat,
            "min": round(min(latencies), 2),
            "p50": p50,
            "p90": p90,
            "p95": p95,
            "p99": p99,
            "max": round(max(latencies), 2),
        },
        "http_status_distribution": status_counts,
    }

    print(f"Results Summary:")
    print(f"  Duration:         {report['duration_seconds']} sec")
    print(f"  Throughput:       {throughput_rps} req/sec")
    print(f"  Success Rate:     {(success_count / max(len(latencies), 1)):.1%}")
    print(f"  Mean Latency:     {avg_lat} ms")
    print(f"  P50 Latency:      {p50} ms")
    print(f"  P95 Latency:      {p95} ms")
    print(f"  P99 Latency:      {p99} ms")
    print(f"========================================================\n")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000/api/v1/predict")
    parser.add_argument("--requests", type=int, default=500)
    parser.add_argument("--concurrency", type=int, default=15)
    args = parser.parse_args()

    asyncio.run(
        run_benchmark(
            api_url=args.url,
            total_requests=args.requests,
            concurrency=args.concurrency,
        )
    )
