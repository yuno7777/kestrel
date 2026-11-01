# Kestrel: Real-Time Feature Engineering & Velocity State

## 1. Feature Engineering Philosophy & Leakage Prevention

Real-time fraud detection requires features that reflect instantaneous behavioral anomalies and historical customer spending context while strictly preventing temporal data leakage:
- **No Future Information:** Features computed at event time `T` utilize strictly information occurring prior to or exactly at `T`.
- **Label Independence:** No ground-truth fraud labels or downstream chargeback metadata are ever incorporated into inference-time features.
- **Training/Serving Parity:** Feature definitions, mathematical formulas, and numerical scaling transformations are implemented in a single unified Python module shared across offline training and online streaming inference.

---

## 2. Feature Definitions & Formulas

The Kestrel model operates on an enriched feature vector combining raw transaction signals, temporal indicators, sliding-window velocity counters, and behavioral deviations:

### 2.1 Raw & Temporal Signals
- `amount`: Raw monetary value in standard currency units.
- `log_amount`: `ln(amount + 1)` to normalize the right-skewed monetary distribution.
- `hour_of_day`: Integer `[0, 23]` extracted from transaction UTC timestamp.
- `day_of_week`: Integer `[0, 6]` (0 = Monday, 6 = Sunday).
- `is_weekend`: Binary flag (`1` if Saturday or Sunday, else `0`).
- `is_night`: Binary flag (`1` if hour is between 00:00 and 05:00 UTC).

### 2.2 Redis-Backed Real-Time Velocity Features
Using Redis Sorted Sets (`ZSET`) keyed by `customer_id`:

| Feature Name | Description | Window | Mathematical Definition / Logic |
| :--- | :--- | :--- | :--- |
| `txns_last_1m` | Transaction velocity (rapid bursts) | 60 sec | `COUNT(t) WHERE t >= T - 60s` |
| `txns_last_5m` | Short-term transaction frequency | 300 sec | `COUNT(t) WHERE t >= T - 300s` |
| `txns_last_1h` | Medium-term transaction frequency | 3600 sec | `COUNT(t) WHERE t >= T - 3600s` |
| `amount_sum_1h` | Cumulative spending in last hour | 3600 sec | `SUM(amount) WHERE t >= T - 3600s` |
| `amount_avg_1h` | Mean transaction amount in last hour | 3600 sec | `amount_sum_1h / max(txns_last_1h, 1)` |
| `amount_to_avg_ratio` | Current amount relative to hourly average | Instant | `amount / max(amount_avg_1h, 1.0)` |
| `time_since_last_txn_sec`| Elapsed time since preceding event | Delta | `(T - T_prev) / 1000.0` (seconds) |
| `distinct_merchants_1h`| Number of unique merchants visited | 3600 sec | Set cardinality of `merchant_id` across window |

### 2.3 Categorical & Behavioral Risk Signals
- `merchant_category_encoded`: Target/frequency encoding of merchant category (crypto and luxury electronics map to elevated base risk).
- `payment_channel_encoded`: Ordinal encoding (`online`, `pos_chip`, `pos_contactless`, `atm`, `mobile_app`).
- `is_high_risk_category`: Binary flag for high-risk verticals (`crypto`, `electronics`, `gaming`).

---

## 3. Online Redis State Management

### 3.1 Data Structures in Redis
1. **Transaction Velocity ZSET:**
   - Key: `kestrel:velocity:<customer_id>`
   - Score: Event timestamp in epoch milliseconds.
   - Member: `<txn_id>:<amount>:<merchant_id>`
   - TTL: 86400 seconds (24 hours).
2. **Last Transaction String:**
   - Key: `kestrel:last_seen:<customer_id>`
   - Value: `<epoch_ms>:<amount>:<merchant_id>`
   - TTL: 604800 seconds (7 days).

### 3.2 Resilience & Graceful Degradation
If Redis connectivity drops or query latency exceeds 15ms:
- The stream processor falls back to neutral fallback defaults (`txns_last_1m = 1`, `amount_to_avg_ratio = 1.0`, `time_since_last_txn_sec = 3600.0`).
- The feature metadata records `"redis_degraded": true`.
- The transaction continues to score without throwing an uncaught 500 or stalling the pipeline.
