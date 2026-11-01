# Kestrel: Monitoring, Observability & Drift Detection

## 1. Metrics Framework (Prometheus)

Kestrel instruments all microservices using the official Prometheus Python client, exposing metrics at `/metrics`.

### 1.1 Custom Platform Metrics

| Metric Name | Type | Labels | Description |
| :--- | :--- | :--- | :--- |
| `fraud_transactions_received_total` | Counter | `source, channel` | Total raw transaction events received at ingress. |
| `fraud_transactions_processed_total`| Counter | `decision, status` | Total transactions scored and routed (APPROVE, REVIEW, BLOCK). |
| `fraud_transactions_flagged_total`  | Counter | `risk_tier` | Total transactions flagged as high or review risk. |
| `fraud_inference_latency_seconds`   | Histogram | `model_version` | Model scoring latency (buckets: 0.001, 0.002, 0.005, 0.010, 0.025, 0.050, 0.100). |
| `fraud_redis_latency_seconds`       | Histogram | `operation` | Feature store query latency (buckets: 0.0005, 0.001, 0.002, 0.005, 0.010). |
| `fraud_dlq_messages_total`          | Counter | `reason` | Total unparseable or rejected messages sent to DLQ. |
| `kafka_consumer_lag`                | Gauge | `topic, partition` | Unprocessed message count across consumer groups. |
| `fraud_probability_distribution`    | Histogram | `model_version` | Scored probability histogram across transactions (buckets: 0.1, 0.2, ..., 1.0). |

---

## 2. Statistical Data & Concept Drift Monitoring

Real-time fraud patterns evolve rapidly as fraudsters adapt. Kestrel executes statistical drift detection across sliding production inference batches compared against baseline training distributions.

### 2.1 Population Stability Index (PSI)
Used for continuous numerical features (`amount`, `txns_last_5m`, `amount_to_avg_ratio`):
$$\text{PSI} = \sum_{i=1}^{k} \left( \text{Actual}_i - \text{Expected}_i \right) \times \ln\left( \frac{\text{Actual}_i}{\text{Expected}_i} \right)$$

- **PSI < 0.10:** No significant shift. Baseline distribution remains representative.
- **0.10 <= PSI < 0.20:** Moderate shift. Alert triggers for ML engineer inspection.
- **PSI >= 0.20:** Severe distribution drift. Automated alert triggers retraining workflow recommendation.

### 2.2 Kolmogorov-Smirnov (KS) Test
Non-parametric test comparing the cumulative distribution functions $F_{\text{ref}}(x)$ and $F_{\text{curr}}(x)$:
$$D = \sup_x |F_{\text{ref}}(x) - F_{\text{curr}}(x)|$$
A p-value below $\alpha = 0.01$ flags statistically significant distribution discrepancy.

---

## 3. Grafana Dashboards

Six provisioned Grafana dashboards are supplied under `infrastructure/grafana/dashboards/`:
1. **Executive Overview:** Global TPS, Fraud Detection Rate, Approval/Review/Block proportions, and active model versions.
2. **Streaming Throughput & Ingestion:** Kafka ingress rates, consumer partition lag, and DLQ error rates.
3. **ML Inference Latency:** P50, P95, and P99 scoring latency percentiles alongside batch execution durations.
4. **Feature Store Health (Redis):** Pipeline command latencies, connection pool saturation, and ZSET pruning execution times.
5. **Drift & Distribution Monitor:** Real-time PSI curves, probability distribution drift, and hourly feature quantiles.
6. **Infrastructure Resources:** CPU, Memory, and Network I/O across Docker container services.
