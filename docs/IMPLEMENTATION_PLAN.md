# Kestrel: Implementation Plan & Execution Roadmap

This roadmap outlines the systematic execution phases for engineering the Kestrel Fraud Detection & Monitoring Platform.

---

## Phase Breakdown & Work Packages

### Phase 0: Environment Reconnaissance & Base Setup [COMPLETED]
- [x] Hardware, memory, and runtime audit (Intel i7-13620H, 16GB RAM, Python 3.13.15, Node v24.19.0).
- [x] Docker CLI and daemon status analysis (Docker installed; standalone fallback execution required).
- [x] Git repository initialization and `.gitignore` configuration.
- [x] Establish project naming: **Kestrel**.

### Phase 1: Comprehensive System Documentation [IN PROGRESS]
- [x] `docs/DOCUMENTING.md` - Technical engineering journal and milestone tracker.
- [x] `docs/ARCHITECTURE.md` - Architecture diagrams, component interactions, and latency budget.
- [x] `docs/SYSTEM_DESIGN.md` - In-depth design on reliability, Redis velocity, and failure modes.
- [x] `docs/IMPLEMENTATION_PLAN.md` - Execution roadmap (this file).
- [ ] `docs/EVENT_SCHEMA.md` - Complete Pydantic & JSON event schemas.
- [ ] `docs/KAFKA_DESIGN.md` - Topic configurations, partitioning keys, and retention policies.
- [ ] `docs/FEATURE_ENGINEERING.md` - Velocity algorithms, behavioral mathematics, and scaling.
- [ ] `docs/ML_MODEL.md` - Training methodology, class imbalance management, and evaluation metrics.
- [ ] `docs/DATABASE_SCHEMA.md` - PostgreSQL ER diagram, indexes, and Alembic migration plan.
- [ ] `docs/API_SPECIFICATION.md` - REST API OpenAPI endpoints and schemas.
- [ ] `docs/MONITORING.md` - Prometheus metric definitions, scraping configs, and Grafana specs.
- [ ] `docs/LOAD_TESTING.md` - Benchmark scenarios, Locust/asyncio plan, and metrics.
- [ ] `docs/SECURITY.md` - Data tokenization, sanitization, and security best practices.
- [ ] `docs/TESTING_STRATEGY.md` - Unit, integration, and E2E testing framework.
- [ ] `docs/DEPLOYMENT.md` - Docker Compose and standalone execution instructions.
- [ ] `docs/CHANGELOG.md` - Chronological change log.
- [ ] `docs/decisions/` - Architecture Decision Records (ADR-001 through ADR-006).
- [ ] Root `README.md` and `.env.example`.

### Phase 2: Common Library (`packages/common`)
- Data classes and Pydantic schemas: `TransactionRaw`, `TransactionEnriched`, `ScoredTransaction`, `FraudDecision`, `DeadLetterEvent`.
- Shared configuration loader supporting environment variables and `.env` files.
- Structured JSON logging setup with correlation IDs.

### Phase 3: Machine Learning Engine (`ml/`)
- Realistic transaction and fraud pattern dataset generator (`ml/data/generator.py`).
- Feature preprocessing and encoding pipeline (`ml/features/pipeline.py`).
- Supervised & Unsupervised Model Training (`ml/training/train.py`):
  - Logistic Regression (baseline).
  - Random Forest Classifier.
  - HistGradientBoostingClassifier (primary production model).
  - Isolation Forest (anomaly detection).
- Comprehensive evaluation harness (`ml/evaluation/evaluate.py`):
  - Precision, Recall, F1, ROC-AUC, PR-AUC, Confusion Matrix, and Cost-Curve Analysis.
- Model serialization and metadata export to `ml/artifacts/`.

### Phase 4: FastAPI Inference & Management Service (`services/api`)
- FastAPI application with lifespan model manager and caching.
- Endpoints:
  - `POST /api/v1/predict`: Low-latency fraud scoring.
  - `GET /api/v1/models` & `POST /api/v1/models/{id}/activate`: Model versioning and activation.
  - `GET /api/v1/transactions`: Paginated historical transactions.
  - `GET /api/v1/fraud/alerts` & `POST /api/v1/fraud/{id}/feedback`: Analyst review and ground-truth feedback.
  - `GET /api/v1/monitoring/drift`: Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) drift reports.
  - `GET /health`, `GET /ready`, `GET /metrics` (Prometheus exporter).

### Phase 5: Python Stream Processor (`services/stream-processor`)
- Async Kafka consumer reading from `transactions.raw`.
- Redis velocity feature enrichment (1m, 5m, 1h transaction counts, sums, averages, time deltas).
- Idempotency check and DLQ routing (`transactions.dlq`).
- Scoring integration and routing to `transactions.scored`, `transactions.fraud`, and `transactions.review`.
- Standalone local stream loop mode for running without active Kafka/Redis.

### Phase 6: Transaction Generator Service (`services/transaction-generator`)
- Synthetic streaming producer simulating realistic user behavior and fraud patterns.
- Configurable transaction rate (TPS), fraud ratio (e.g. 0.5% to 5%), geographic shifts, and velocity spikes.

### Phase 7: Persistence Worker & Database Layer (`services/persistence-worker`)
- SQLAlchemy ORM models and SQLite/PostgreSQL database adapters.
- Async worker consuming scored transactions and performing idempotent upserts.

### Phase 8: Frontend Operations Console (`frontend/`)
- Vite + React + TypeScript + Tailwind CSS application.
- Modern dark-theme operations dashboard with dense, professional styling:
  - **Overview:** Real-time KPI counters, throughput graphs, decision distribution.
  - **Live Transactions:** Streaming event feed with live search, filtering, and detail drawer.
  - **Fraud Alerts & Investigation:** Review queue with ground-truth feedback submission.
  - **ML Performance & Drift:** Precision-recall curves, confusion matrices, PSI feature drift reports.
  - **System & Streaming:** Kafka topic throughput, consumer lag, and Redis/DB health status.

### Phase 9: Infrastructure & Deployment
- `docker-compose.yml` for multi-container orchestration.
- Standalone PowerShell/Bash local run scripts for running full platform natively.
- Prometheus configuration (`infrastructure/prometheus/prometheus.yml`) and Grafana dashboard templates.

### Phase 10: Testing, Load Testing & Verification
- Unit test suite (`tests/unit/`).
- End-to-end pipeline test (`tests/e2e/`).
- Load test suite (`tests/load/`) measuring actual throughput and latency.
- Final documentation updates and delivery report.
