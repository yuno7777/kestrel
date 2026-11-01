# Kestrel: Database Schema & Entity Relationships

## 1. Storage Architecture

Kestrel utilizes **PostgreSQL 16** (with SQLite dual-compatibility for lightweight standalone local execution). The schema is managed via SQLAlchemy 2.0 ORM models and Alembic database migrations.

---

## 2. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    TRANSACTIONS ||--o| PREDICTIONS : "scored as"
    TRANSACTIONS ||--o| TRANSACTION_FEATURES : "enriched with"
    PREDICTIONS ||--o| FRAUD_DECISIONS : "yields"
    TRANSACTIONS ||--o| FRAUD_FEEDBACK : "receives ground-truth"
    MODELS ||--o{ PREDICTIONS : "generates"
    MODELS ||--o{ DRIFT_REPORTS : "monitored by"

    TRANSACTIONS {
        uuid transaction_id PK
        string customer_id
        timestamp timestamp
        numeric amount
        string currency
        string merchant_id
        string merchant_category
        string payment_channel
        string device_id
        timestamp created_at
    }

    TRANSACTION_FEATURES {
        uuid transaction_id PK, FK
        integer txns_last_1m
        integer txns_last_5m
        integer txns_last_1h
        numeric amount_sum_1h
        numeric amount_avg_1h
        numeric amount_to_avg_ratio
        numeric time_since_last_txn_sec
        integer distinct_merchants_1h
        integer hour_of_day
        integer day_of_week
        jsonb raw_feature_snapshot
    }

    PREDICTIONS {
        uuid prediction_id PK
        uuid transaction_id FK
        string model_version FK
        numeric fraud_probability
        integer prediction_class
        numeric inference_latency_ms
        timestamp scored_at
    }

    FRAUD_DECISIONS {
        uuid decision_id PK
        uuid transaction_id FK
        string decision
        jsonb reason_codes
        string overridden_by
        timestamp decided_at
    }

    FRAUD_FEEDBACK {
        uuid feedback_id PK
        uuid transaction_id FK
        integer actual_label
        string reported_by
        string notes
        timestamp submitted_at
    }

    MODELS {
        string model_version PK
        string algorithm
        jsonb hyperparameters
        numeric test_roc_auc
        numeric test_pr_auc
        numeric test_f1
        boolean is_active
        timestamp trained_at
    }

    DRIFT_REPORTS {
        uuid report_id PK
        string model_version FK
        string feature_name
        numeric psi_score
        numeric ks_statistic
        numeric ks_p_value
        string drift_status
        timestamp generated_at
    }
```

---

## 3. Indexing & Query Optimization Strategy

1. **Transaction ID Unique Lookup:**
   - `CREATE UNIQUE INDEX idx_transactions_txn_id ON transactions (transaction_id);`
   - Guarantees idempotent writes and $O(1)$ lookups.
2. **Customer Timeline Queries:**
   - `CREATE INDEX idx_transactions_customer_timestamp ON transactions (customer_id, timestamp DESC);`
   - Optimizes customer history queries and velocity audits.
3. **Decision & Risk Ingestion:**
   - `CREATE INDEX idx_fraud_decisions_decision ON fraud_decisions (decision, decided_at DESC);`
   - Accelerates analyst queries for the `REVIEW` and `BLOCK` worklists.
4. **Time-Series Partitioning Ready:**
   - The `transactions` and `predictions` tables use UTC `timestamp` fields prepared for monthly `pg_partman` range partitioning in production environments handling > 10M transactions/day.
