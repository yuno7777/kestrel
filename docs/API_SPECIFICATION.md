# Kestrel: REST API Specification

The Kestrel platform exposes versioned, high-throughput REST APIs implemented with FastAPI, compliant with OpenAPI 3.1 standards.

---

## 1. Core Endpoints Summary

| Method | Endpoint | Description | Auth Scope |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/predict` | Score an enriched transaction and generate fraud decision | Service |
| `POST` | `/api/v1/transactions` | Ingest a raw transaction synchronously (fallback/direct path) | Public/Client |
| `GET` | `/api/v1/transactions` | Query paginated historical transactions with filtering | Analyst |
| `GET` | `/api/v1/transactions/{id}` | Detailed trace of a specific transaction with features & decision | Analyst |
| `GET` | `/api/v1/fraud/alerts` | Retrieve pending `REVIEW` and `BLOCK` alert queue | Analyst |
| `POST` | `/api/v1/fraud/{id}/feedback` | Submit ground-truth outcome label (fraud / non-fraud) | Analyst |
| `GET` | `/api/v1/models` | List all trained model artifacts and evaluation metrics | Admin |
| `GET` | `/api/v1/models/active` | Get metadata for currently active production model | Service/Admin |
| `POST` | `/api/v1/models/{id}/activate` | Hot-swap active production model | Admin |
| `GET` | `/api/v1/monitoring/summary` | Real-time platform throughput, latency, and decision ratios | Operator |
| `GET` | `/api/v1/monitoring/drift` | Feature drift report (PSI and KS tests) | ML Engineer |
| `GET` | `/health` | Basic liveness probe | Orchestrator |
| `GET` | `/ready` | Readiness probe (verifies DB, Redis, and model loaded) | Orchestrator |
| `GET` | `/metrics` | Prometheus metrics scrape endpoint | Prometheus |

---

## 2. Key Endpoint Contracts

### 2.1 Inference Scoring (`POST /api/v1/predict`)
**Request Body:**
```json
{
  "transaction_id": "4a7b4f2c-e2f1-468e-90f7-d2c67bfa3980",
  "customer_id": "cust_90214a",
  "amount": 2450.00,
  "currency": "USD",
  "merchant_category": "electronics",
  "payment_channel": "online",
  "features": {
    "amount": 2450.00,
    "hour_of_day": 3,
    "day_of_week": 0,
    "is_weekend": 1,
    "txns_last_1m": 4,
    "txns_last_5m": 7,
    "txns_last_1h": 11,
    "amount_sum_1h": 6120.00,
    "amount_avg_1h": 556.36,
    "amount_to_avg_ratio": 4.40,
    "time_since_last_txn_sec": 18.4,
    "distinct_merchants_1h": 5,
    "is_high_risk_category": 1
  }
}
```

**Response Body (200 OK):**
```json
{
  "transaction_id": "4a7b4f2c-e2f1-468e-90f7-d2c67bfa3980",
  "fraud_probability": 0.884,
  "prediction": 1,
  "decision": "BLOCK",
  "reason_codes": [
    "HIGH_VELOCITY_SPIKE",
    "UNUSUAL_AMOUNT_DEVIATION",
    "NOCTURNAL_HIGH_RISK_CATEGORY"
  ],
  "model_version": "kestrel-hgb-v1.0.0",
  "inference_latency_ms": 3.42,
  "evaluated_at": "2026-11-02T03:30:15.132Z"
}
```

---

### 2.2 Ground-Truth Feedback (`POST /api/v1/fraud/{transaction_id}/feedback`)
**Request Body:**
```json
{
  "actual_label": 1,
  "reported_by": "analyst_alice",
  "notes": "Confirmed stolen card via cardholder chargeback dispute."
}
```

**Response Body (200 OK):**
```json
{
  "feedback_id": "9bc321e0-781a-4632-9c12-07a82b3d8109",
  "transaction_id": "4a7b4f2c-e2f1-468e-90f7-d2c67bfa3980",
  "status": "ACCEPTED",
  "recorded_at": "2026-11-02T03:35:00.000Z"
}
```

---

### 2.3 Drift Monitoring (`GET /api/v1/monitoring/drift`)
**Response Body (200 OK):**
```json
{
  "timestamp": "2026-11-02T03:30:00Z",
  "baseline_window": "2026-10-01 to 2026-10-25",
  "current_window": "2026-11-01 to 2026-11-02",
  "overall_drift_status": "MODERATE_DRIFT",
  "features": [
    {
      "feature_name": "amount",
      "psi_score": 0.042,
      "ks_statistic": 0.031,
      "ks_p_value": 0.42,
      "status": "NO_DRIFT"
    },
    {
      "feature_name": "txns_last_5m",
      "psi_score": 0.231,
      "ks_statistic": 0.185,
      "ks_p_value": 0.001,
      "status": "SIGNIFICANT_DRIFT"
    }
  ]
}
```
