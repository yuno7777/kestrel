# Kestrel: Event Schema Specification

This document defines the canonical JSON and Pydantic schemas for all events traversing the Kestrel streaming platform.

---

## 1. Schema Versioning Policy

All events follow semantic schema versioning indicated by the `schema_version` attribute (current: `"1.0.0"`). Any breaking schema change increments the major version and requires dual-publishing or transformation adapters during transition.

---

## 2. Event Types & Schemas

### 2.1 Raw Transaction Event (`TransactionRaw`)
Published by transaction generators or payment ingress gateways to `transactions.raw`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TransactionRaw",
  "type": "object",
  "required": [
    "transaction_id",
    "customer_id",
    "timestamp",
    "amount",
    "currency",
    "merchant_id",
    "merchant_category",
    "payment_channel"
  ],
  "properties": {
    "transaction_id": {
      "type": "string",
      "format": "uuid",
      "description": "Globally unique identifier for the transaction"
    },
    "customer_id": {
      "type": "string",
      "description": "Pseudonymized customer token identifier"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of transaction creation"
    },
    "amount": {
      "type": "number",
      "minimum": 0.01,
      "description": "Transaction monetary amount in currency units"
    },
    "currency": {
      "type": "string",
      "minLength": 3,
      "maxLength": 3,
      "default": "USD"
    },
    "merchant_id": {
      "type": "string",
      "description": "Identifier of the recipient merchant"
    },
    "merchant_category": {
      "type": "string",
      "enum": [
        "retail",
        "grocery",
        "electronics",
        "travel",
        "dining",
        "entertainment",
        "gaming",
        "crypto",
        "utilities"
      ]
    },
    "payment_channel": {
      "type": "string",
      "enum": ["online", "pos_chip", "pos_contactless", "atm", "mobile_app"]
    },
    "location": {
      "type": "object",
      "properties": {
        "country": { "type": "string", "maxLength": 2 },
        "city": { "type": "string" },
        "latitude": { "type": "number", "minimum": -90, "maximum": 90 },
        "longitude": { "type": "number", "minimum": -180, "maximum": 180 }
      }
    },
    "device_id": {
      "type": "string",
      "description": "Hashed device fingerprint"
    },
    "schema_version": {
      "type": "string",
      "default": "1.0.0"
    }
  }
}
```

---

### 2.2 Scored Transaction Event (`ScoredTransaction`)
Produced by the Stream Processor and published to `transactions.scored`, `transactions.fraud`, and `transactions.review`.

```json
{
  "transaction_id": "4a7b4f2c-e2f1-468e-90f7-d2c67bfa3980",
  "customer_id": "cust_90214a",
  "timestamp": "2026-11-02T03:30:15.120Z",
  "processed_at": "2026-11-02T03:30:15.132Z",
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
  },
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
  "schema_version": "1.0.0"
}
```

---

### 2.3 Dead-Letter Queue Event (`DeadLetterEvent`)
Published to `transactions.dlq` for non-conforming or corrupted payloads.

```json
{
  "dlq_id": "dlq_e71b29cc-0354-469b-81f1-325d9c22b912",
  "failed_at": "2026-11-02T03:30:16.002Z",
  "source_topic": "transactions.raw",
  "partition": 2,
  "offset": 104231,
  "error_type": "ValidationError",
  "error_message": "amount must be greater than 0; received -50.0",
  "raw_payload": "{\"transaction_id\":\"123\",\"amount\":-50.0}",
  "schema_version": "1.0.0"
}
```
