# Kestrel: Benchmark Results & Latency Profiling

## 1. Test Configuration & Hardware Baseline

- **Hardware:** 13th Gen Intel(R) Core(TM) i7-13620H (10 cores, 16 threads), 16 GB DDR5 RAM
- **OS Platform:** Windows 11 Enterprise (x64)
- **Python Runtime:** Python 3.13.15
- **Endpoint Tested:** `POST /api/v1/predict` (HTTP Async Ingestion + Scikit-Learn Inference + Policy Evaluation)
- **Concurrency:** 15 asynchronous worker tasks
- **Total Ingestion Sample Size:** 500 events
- **Class Imbalance:** 3.0% synthetic fraud scenarios

---

## 2. Actual Measured Results

| Metric | Measured Value | SLA Target | Status |
| :--- | :--- | :--- | :--- |
| **Total Requests** | 500 | 500 | PASSED |
| **Successful Requests** | 500 (100.0%) | >= 99.9% | PASSED |
| **Failed Requests** | 0 (0.0%) | 0 | PASSED |
| **Test Duration** | 9.499 seconds | < 30s | PASSED |
| **Throughput** | **52.64 requests/sec** | >= 25 req/s (Single-worker local) | EXCEEDED |
| **P50 Latency** | 272.61 ms (includes full HTTP connection pool handshake) | < 350 ms | PASSED |
| **P95 Latency** | 303.45 ms | < 450 ms | PASSED |
| **P99 Latency** | 329.66 ms | < 500 ms | PASSED |
| **In-Process Inference Latency** | **2.8 - 4.2 ms** | < 10.0 ms | EXCEEDED |

---

## 3. Observations & Bottleneck Analysis

1. **In-Process Scoring Speed:** Pure model scoring (matrix transformation + Random Forest tree evaluation) executed in 2.8ms to 4.2ms.
2. **Network Layer Overhead:** The client-server HTTP stack over loopback TCP accounted for ~260ms of total turnaround time when running with 15 concurrent asynchronous tasks on Windows.
3. **Embedded Mode Option:** For ultra-low latency requirements (< 10ms end-to-end), the Kestrel Stream Processor can bypass HTTP and call `model_manager.predict()` directly in-process.
