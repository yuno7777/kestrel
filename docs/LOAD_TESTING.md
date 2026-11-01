# Kestrel: Load Testing & Performance Benchmarking

## 1. Objectives & Testing Principles

To substantiate system throughput, backpressure handling, and latency guarantees without fabricated or assumed metrics, Kestrel includes an automated asynchronous benchmarking suite (`tests/load/load_test.py`).

### Key Performance Indicators (KPIs)
- **Target Ingress Throughput:** Minimum 500 events/sec local sustained streaming.
- **Latency Guarantee:** End-to-end P95 processing latency under 35 ms.
- **Inference Service P99:** Under 12 ms per scoring evaluation.
- **Consumer Lag Recovery:** Return to near-zero lag within 60 seconds following a 3x traffic burst.

---

## 2. Test Scenarios

| Scenario ID | Name | Duration | Target Load | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `SCN-01` | Baseline Steady-State | 5 minutes | 100 TPS | Establish baseline resource utilization and P50/P95 latencies under calm traffic. |
| `SCN-02` | High Throughput Sustained | 10 minutes | 500 - 1,000 TPS | Stress consumer group partition throughput, Redis pipeline velocity, and DB batch writes. |
| `SCN-03` | Traffic Surge / Flash Mob | 3 minutes | Step from 100 to 2,000 TPS | Evaluate backpressure buffering in Kafka and downstream consumer lag recovery. |
| `SCN-04` | Chaos & Dependency Outage | 5 minutes | 200 TPS | Inject temporary Redis interruption (5s disconnect) to verify graceful fallback without data loss. |

---

## 3. Load Generation Methodology

Load tests are orchestrated via an asynchronous Python runner using `asyncio` and `aiohttp` / `aiokafka`:
```bash
# Run local standalone benchmark suite
python tests/load/load_test.py --tps 250 --duration 60 --concurrency 10
```

The load tester captures microsecond-precision timestamps at:
1. Event dispatch ($T_0$)
2. Ingress acceptance ($T_1$)
3. Scored response return ($T_2$)
4. Persistence commit ($T_3$)

Results are recorded to `docs/BENCHMARKS.md` upon test execution.
