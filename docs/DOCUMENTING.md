# Kestrel: Engineering Journal & Technical Record

**Platform Name:** Kestrel (Real-Time Fraud Intelligence & Streaming Observability Platform)  
**Repository:** `fraud-detec-monitor-platform`  
**Initial Baseline Date:** 2026-11-02  
**Status:** In Active Development (Phase 0 & 1 Complete, Transitioning to Implementation)

---

## 1. Project Objective & Scope

Kestrel is an enterprise-grade, event-driven real-time fraud detection and monitoring infrastructure platform. Designed with fintech and payment processing standards in mind, Kestrel ingests high-frequency transaction events, computes streaming velocity and behavioral features in real time using Redis state, scores transactions against trained machine learning models via low-latency inference, applies dynamic multi-tier decision policies (APPROVE, REVIEW, BLOCK), and provides complete end-to-end observability with Prometheus, Grafana, and an enterprise React/TypeScript operations console.

### Key Capabilities
- **Continuous Event Streaming:** Apache Kafka (KRaft mode) with partitioned ingestion, consumer group failover, and dead-letter queue (DLQ) isolation.
- **Low-Latency Feature Engineering:** Real-time sliding window velocity counters (1m, 5m, 1h), spending deviation z-scores, merchant diversity indices, and geographical anomaly heuristics backed by atomic Redis operations.
- **Production ML Inference:** Versioned machine learning inference pipeline (HistGradientBoosting / Random Forest / Logistic Regression / Isolation Forest) handling acute class imbalance, probability calibration, and sub-10ms response latency.
- **Multi-Threshold Decision Engine:** Decoupled risk decisioning (APPROVE, REVIEW, BLOCK) with granular reason codes, analyst manual override audit trails, and ground-truth feedback loops.
- **Operational & ML Monitoring:** Real-time metrics collection with Prometheus, operational Grafana dashboards, statistical data drift detection (Population Stability Index and Kolmogorov-Smirnov tests), and prediction distribution monitoring.
- **Resilience & Storage:** PostgreSQL persistence with Alembic migrations, idempotency enforcement on transaction UUIDs, bounded exponential backoff retries, and local standalone fallback modes for development without Docker.

---

## 2. Phase 0: Development Environment & Reconnaissance

A rigorous hardware, runtime, and infrastructure audit was performed on the host machine prior to architecture specification.

### Environment Audit Findings (2026-11-02)
- **Host OS:** Windows 11 Enterprise / Pro
- **Processor:** 13th Gen Intel(R) Core(TM) i7-13620H (10 cores, 16 logical threads)
- **Host Memory:** 16.56 GB Total Physical RAM (~4.02 GB Free at audit time)
- **Python Runtime:** Python 3.13.15 (64-bit)
- **Node.js Runtime:** v24.19.0
- **Package Manager:** npm 11.17.0
- **Docker Engine:** Docker CLI v29.9.1, Docker Compose v5.6.0
  - *Observation:* Docker Desktop is installed, but the daemon is not running currently (`//./pipe/dockerDesktopLinuxEngine` unreachable).
  - *Architectural Implication:* All services must be fully containerized with `docker-compose.yml`, while also providing direct local execution capability (virtual environment + Node/Vite) and graceful fallbacks (e.g. SQLite storage adapter / in-memory or embedded streaming simulator) so local unit, integration, and UI testing can proceed seamlessly when Docker daemon is stopped.
- **Git:** git version 2.55.0.windows.3 (Repository initialized with comprehensive `.gitignore`).

---

## 3. Technology Choices & Justification

| Layer | Component | Choice | Justification |
| :--- | :--- | :--- | :--- |
| **Streaming Broker** | Event Backbone | Apache Kafka (KRaft) | High-throughput distributed partition ordering, consumer group scaling, and standard fintech protocol. KRaft eliminates ZooKeeper overhead. |
| **Real-Time State** | Velocity Store | Redis 7 | Sub-millisecond atomic hash/sorted-set operations for sliding time windows (`ZREMRANGEBYSCORE`, `ZADD`, `ZCARD`, pipeline batches) and deduplication TTLs. |
| **Stream Processor** | Pipeline Service | Python 3.13 (`aiokafka` / `kafka-python-ng`) | Async I/O architecture combining schema validation, Redis state retrieval, and decoupled inference dispatch with dead-letter routing. |
| **Inference Service** | ML Serving | FastAPI + Uvicorn | High-performance asynchronous REST API with OpenAPI contracts, Pydantic v2 validation, preloaded model cache, and Prometheus instrumentation. |
| **ML Engine** | Model Training | Scikit-Learn / HistGradientBoosting / Imbalanced-Learn | Native handling of missing values, rapid inference execution (<5ms), calibrated probabilities, and robust performance under extreme class imbalance (~0.1-0.5% fraud). |
| **Persistence** | Durable Store | PostgreSQL 16 + SQLAlchemy + Alembic | ACID compliance, unique idempotency constraints on transaction IDs, JSONB feature snapshots, and relational foreign keys for feedback audit trails. |
| **Metrics & Viz** | Observability | Prometheus + Grafana | Industry-standard timeseries metrics scraping and provisioned operational dashboards for consumer lag, throughput, and P95/P99 latency. |
| **Frontend Console** | Operator UI | React 19 + TypeScript + Vite + Tailwind CSS + Lucide | Fast, dense, dark-mode fintech command center with live transaction feeds, alert management, threshold configuration, and drift reporting. |

---

## 4. Engineering Milestones & Implementation Checklist

### Phase 0: Repository & Environment Reconnaissance
- [x] Inspect existing repository and environment tools.
- [x] Check Python (3.13.15), Node (v24.19.0), npm (11.17.0), Docker, and Git.
- [x] Initialize Git repository with comprehensive `.gitignore`.
- [x] Document environment specifications and hardware constraints.

### Phase 1: Architecture & System Design Documentation
- [x] Document naming decision (**Kestrel**).
- [x] Create complete `docs/` tree and Architecture Decision Records (ADRs).
- [x] Create root `README.md` and `.env.example`.
- [x] Formalize Event Schemas and Kafka Topic Architecture.
- [x] Formalize Feature Engineering and Redis Velocity Spec.
- [x] Formalize ML Training, Evaluation, and Drift Detection Spec.
- [x] Formalize Database Schema and API Specification.

### Phase 2: Shared Libraries & Core Contracts
- [ ] Implement `packages/common` containing Pydantic v2 schemas, event models, configuration loaders, and logging standards.
- [ ] Implement Redis feature-state client and velocity calculation utilities.
- [ ] Implement Kafka producer/consumer wrappers with DLQ and retry mechanisms.

### Phase 3: Machine Learning Engine & Model Training
- [ ] Implement realistic synthetic transaction and fraud pattern generator with reproducible seeds.
- [ ] Implement feature transformation pipeline (temporal, numerical scaling, categorical encoding, velocity).
- [ ] Train benchmark models: Logistic Regression, Random Forest, HistGradientBoosting, Isolation Forest.
- [ ] Evaluate models on Precision, Recall, F1, ROC-AUC, PR-AUC, and cost-curve analysis.
- [ ] Save versioned model artifacts, preprocessors, and feature metadata to `ml/artifacts/`.

### Phase 4: FastAPI Inference & Management Service
- [ ] Implement FastAPI application with lifecycle-managed model loading.
- [ ] Implement `/api/v1/predict` endpoint with latency tracking and decision policy logic.
- [ ] Implement model management endpoints (`/api/v1/models`, `/api/v1/models/active`, `/activate`).
- [ ] Implement transaction query, fraud alert, and feedback endpoints.
- [ ] Implement drift monitoring calculation endpoints (PSI, KS test).
- [ ] Implement Prometheus metrics exporter (`/metrics`) and health endpoints (`/health`, `/ready`).

### Phase 5: Python Stream Processor Service
- [ ] Implement async event consumer for `transactions.raw`.
- [ ] Integrate Pydantic schema validation and DLQ routing (`transactions.dlq`).
- [ ] Integrate Redis velocity feature hydration and duplicate event rejection.
- [ ] Dispatch to inference engine (HTTP or direct in-process engine mode).
- [ ] Publish scored outcomes to `transactions.scored`, `transactions.fraud`, and `transactions.review`.

### Phase 6: Transaction Generator Service
- [ ] Implement configurable continuous event producer with adjustable TPS, fraud ratio, customer profiles, and anomaly scenarios.
- [ ] Support both continuous streaming daemon mode and finite batch generation mode.

### Phase 7: Persistence Worker & Database Layer
- [ ] Define SQLAlchemy database models with indexes and uniqueness constraints.
- [ ] Configure Alembic migrations.
- [ ] Implement consumer worker to persist transactions, feature snapshots, predictions, decisions, and audit events.
- [ ] Ensure idempotent write behavior (`ON CONFLICT DO NOTHING / UPDATE`).

### Phase 8: Frontend Operations Console (React + TypeScript)
- [ ] Initialize Vite + React + TypeScript project with Tailwind CSS.
- [ ] Build enterprise layout shell: Sidebar, Header, Breadcrumbs, System Health indicator.
- [ ] Build Overview Dashboard with KPI cards, latency sparklines, and decision breakdowns.
- [ ] Build Live Transaction Feed with real-time polling/SSE and status indicators.
- [ ] Build Transaction Detail view with feature inspector and timeline trace.
- [ ] Build Fraud Investigation view with manual review and ground-truth feedback submission.
- [ ] Build ML Model Management & Performance view (PR curves, confusion matrix, threshold tuning).
- [ ] Build Data Drift & Infrastructure Health monitoring views.

### Phase 9: Infrastructure & Observability Orchestration
- [ ] Build `docker-compose.yml` with KRaft Kafka, Redis, PostgreSQL, Prometheus, Grafana, API, Stream Processor, Persistence, and Frontend.
- [ ] Configure Prometheus scraping rules and Grafana provisioned datasources and dashboards.
- [ ] Provide standalone native Windows run scripts for development without Docker.

### Phase 10: Testing, Load Benchmarking & Verification
- [ ] Write unit tests for schemas, velocity calculations, decision policies, and drift tests.
- [ ] Write integration tests for API endpoints and end-to-end event flow.
- [ ] Implement load testing script (Locust/k6/Python asyncio) and measure actual throughput and P95 latency.
- [ ] Finalize technical delivery report.

---

## 5. Architectural Log & Issue Tracker

| Date | Category | Note / Problem | Resolution / Decision |
| :--- | :--- | :--- | :--- |
| 2026-11-02 | Naming | User instructed not to keep generic names like Sentinel. | Selected **Kestrel** (representing sleek, high-precision, low-latency vigilance). |
| 2026-11-02 | Infrastructure | Docker Desktop daemon is not currently active on host. | Designed dual-mode execution: full Docker Compose plus standalone local Python/Node runner with SQLite fallback. |
| 2026-11-02 | ML Strategy | Extreme class imbalance in transaction fraud. | Employ class-weight balancing, threshold calibration for target recall, and evaluate PR-AUC alongside ROC-AUC. |
| 2026-11-02 | Latency | Network hop overhead between stream processor and inference service. | Implement both HTTP microservice inference and an embedded high-performance inference engine adapter. |
