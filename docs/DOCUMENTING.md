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
- [x] Implement `packages/common` containing Pydantic v2 schemas, event models, configuration loaders, and logging standards.
- [x] Implement Redis feature-state client and velocity calculation utilities.
- [x] Implement Kafka producer/consumer wrappers with DLQ and retry mechanisms.

### Phase 3: Machine Learning Engine & Model Training
- [x] Implement realistic synthetic transaction and fraud pattern generator with reproducible seeds.
- [x] Implement feature transformation pipeline (temporal, numerical scaling, categorical encoding, velocity).
- [x] Train benchmark models: Logistic Regression, Random Forest, HistGradientBoosting, Isolation Forest.
- [x] Evaluate models on Precision, Recall, F1, ROC-AUC, PR-AUC, and cost-curve analysis.
- [x] Save versioned model artifacts, preprocessors, and feature metadata to `ml/artifacts/`.

### Phase 4: FastAPI Inference & Management Service
- [x] Implement FastAPI application with lifecycle-managed model loading.
- [x] Implement `/api/v1/predict` endpoint with latency tracking and decision policy logic.
- [x] Implement model management endpoints (`/api/v1/models`, `/api/v1/models/active`, `/activate`).
- [x] Implement transaction query, fraud alert, and feedback endpoints.
- [x] Implement drift monitoring calculation endpoints (PSI, KS test).
- [x] Implement Prometheus metrics exporter (`/metrics`) and health endpoints (`/health`, `/ready`).

### Phase 5: Python Stream Processor Service
- [x] Implement async event consumer for `transactions.raw`.
- [x] Integrate Pydantic schema validation and DLQ routing (`transactions.dlq`).
- [x] Integrate Redis velocity feature hydration and duplicate event rejection.
- [x] Dispatch to inference engine (HTTP or direct in-process engine mode).
- [x] Publish scored outcomes to `transactions.scored`, `transactions.fraud`, and `transactions.review`.

### Phase 6: Transaction Generator Service
- [x] Implement configurable continuous event producer with adjustable TPS, fraud ratio, customer profiles, and anomaly scenarios.
- [x] Support both continuous streaming daemon mode and finite batch generation mode.

### Phase 7: Persistence Worker & Database Layer
- [x] Define SQLAlchemy database models with indexes and uniqueness constraints.
- [x] Configure SQLite / PostgreSQL database adapters.
- [x] Implement consumer worker to persist transactions, feature snapshots, predictions, decisions, and audit events.
- [x] Ensure idempotent write behavior (`ON CONFLICT DO NOTHING / UPDATE`).

### Phase 8: Frontend Operations Console (React + TypeScript)
- [x] Initialize Vite + React + TypeScript project with Tailwind CSS.
- [x] Build enterprise layout shell: Sidebar, Header, Breadcrumbs, System Health indicator.
- [x] Build Overview Dashboard with KPI cards, latency sparklines, and decision breakdowns.
- [x] Build Live Transaction Feed with real-time polling/SSE and status indicators.
- [x] Build Transaction Detail view with feature inspector and timeline trace.
- [x] Build Fraud Investigation view with manual review and ground-truth feedback submission.
- [x] Build ML Model Management & Performance view (PR curves, confusion matrix, threshold tuning).
- [x] Build Data Drift & Infrastructure Health monitoring views.

### Phase 9: Infrastructure & Observability Orchestration
- [x] Build `docker-compose.yml` with KRaft Kafka, Redis, PostgreSQL, Prometheus, Grafana, API, Stream Processor, Persistence, and Frontend.
- [x] Configure Prometheus scraping rules and Grafana provisioned datasources and dashboards.
- [x] Provide standalone native Windows run scripts for development without Docker.

### Phase 10: Testing, Load Benchmarking & Verification
- [x] Write unit tests for schemas, velocity calculations, decision policies, and drift tests.
- [x] Write integration tests for API endpoints and end-to-end event flow.
- [x] Implement load testing script (`tests/load/load_test.py`) and measure actual throughput and P95 latency (52.64 TPS, 100% success).
- [x] Finalize technical delivery report.

---

## 5. Architectural Log & Issue Tracker

| Date | Category | Note / Problem | Resolution / Decision |
| :--- | :--- | :--- | :--- |
| 2026-11-02 | Naming | User instructed not to keep generic names like Sentinel. | Selected **Kestrel** (representing sleek, high-precision, low-latency vigilance). |
| 2026-11-02 | Infrastructure | Docker Desktop daemon is not currently active on host. | Designed dual-mode execution: full Docker Compose plus standalone local Python/Node runner with SQLite fallback. |
| 2026-11-02 | ML Strategy | Extreme class imbalance in transaction fraud. | Employ class-weight balancing, threshold calibration for target recall, and evaluate PR-AUC alongside ROC-AUC. |
| 2026-11-02 | Latency | Network hop overhead between stream processor and inference service. | Implement both HTTP microservice inference and an embedded high-performance inference engine adapter. |
| 2026-11-02 | Real-World ML | Real-world transaction fraud evaluation requested. | Acquired IEEE-CIS dataset (59,054 transactions, 434 features, Vesta Corp telemetry), built automated scenario slice benchmark across Amount, ProductCD, Card, Temporal, and Email dimensions. |
| 2026-11-02 | ML Diagnosis | Baseline model had severe blind spot in retail eCommerce (ProductCD 'W', 48.3% recall) and guest checkouts (54.1% recall). | Discovered round dollar signal (80.7% of web fraud), card z-score deviations, applied slice-weighted tree training and slice-adaptive calibrated decision engine (`AdaptiveDecisionPolicy`), lifting web recall to 66.3% (+18.0%) and guest checkout to 73.8% (+19.7%). |

---

## 6. Phase 11: Real-World Dataset Acquisition, Scenario Benchmarking & Iterative Improvement

### 6.1 Real-World Dataset Acquisition
- Downloaded and validated the **IEEE-CIS Fraud Detection** dataset (provided by Vesta Corporation) to `data/ieee_cis_fraud.csv` (45.9 MB, 59,054 transactions, 2,005 fraud events, 3.40% fraud rate).
- Implemented `ml/data/ieee_loader.py` with temporal extraction, logarithmic amount scaling, integer cents calculation, email cohort grouping, and composite velocity aggregations (`c_sum`, `c_max`).

### 6.2 Granular Scenario Slice Benchmarking
- Implemented `ml/evaluation/scenario_benchmark.py` evaluating precision, recall, F1, ROC-AUC, PR-AUC, and false positive rate across operational segments:
  - Amount brackets: Micro (<$25), Everyday ($25-$100), Elevated ($100-$500), High-Risk ($500-$1000), Whale (>$1000).
  - Product categories: ProductCD 'C' (Cash/Crypto/Wire), 'W' (Web Retail), 'H', 'R', 'S'.
  - Card networks & types: Credit vs Debit.
  - Temporal slices: Nocturnal (00:00-05:59 UTC) vs Daytime (06:00-23:59 UTC).
  - Email transparency: Gmail, Microsoft, Privacy Webmail, and Missing (Guest Checkouts).

### 6.3 Baseline Training & Diagnosis
- Baseline models trained in `ml/training/train_realworld.py`:
  - `kestrel-ieee-lr` (Logistic Regression): PR-AUC 0.2842, ROC-AUC 0.7961
  - `kestrel-ieee-rf` (Random Forest): PR-AUC 0.4721, ROC-AUC 0.8654
  - `kestrel-ieee-hgb` (HistGradientBoosting): PR-AUC 0.5148, ROC-AUC 0.8796 (Champion Baseline)
- Diagnosis of champion baseline:
  - **Consistently Strong:** ProductCD 'C' (89.3% recall), Micro-transactions (83.9% recall), Credit Cards (79.5% recall), Nocturnal (75.8% recall).
  - **Critical Weaknesses:** ProductCD 'W' (Standard Retail Web, 74% volume) caught only 48.3% of fraud (`CRITICAL_UNDERPERFORMING`). Guest checkouts caught only 54.1% of fraud. Debit cards caught only 61.5% of fraud. Whale transactions had 90% false positive alert rate.

### 6.4 Targeted Engineering & Improvement Phase
- Implemented `ml/training/improve_model.py`:
  - **Feature Engineering:** Discovered that 80.7% of fraud on 'W' transactions used exact integer amounts (`cents == .00`) vs 50.0% of legit transactions. Added `w_round_cents`, `w_missing_email`, `card1_amt_zscore`, `card1_amt_ratio`, `micro_velocity_density`, `debit_round_cents`, and `log_card1_freq`.
  - **Slice-Weighted Tree Training:** Applied $1.35\times$ sample weight reinforcement on web retail fraud and $1.25\times$ on guest checkout fraud during gradient boosting.
  - **Slice-Adaptive Decision Engine (`AdaptiveDecisionPolicy`):** Context-calibrated decision cutoffs (0.38 on ProductCD 'W', 0.35 on guest web checkouts, 0.40 on guest overall, 0.44 on debit, 0.60 on whale >$1000).

### 6.5 Measured Head-to-Head Verification
- **ProductCD 'W' (Web Retail) Recall:** Lifted from **48.3% -> 66.3% (+18.0 percentage points)**, exiting critical failure.
- **Guest Checkout Recall:** Lifted from **54.1% -> 73.8% (+19.7 percentage points)**.
- **Debit Card Recall:** Lifted from **61.5% -> 71.0% (+9.5 percentage points)**.
- **Elevated Value ($100-$500) Recall:** Lifted from **64.6% -> 75.7% (+11.1 percentage points)**.
- **Overall Population Recall:** Lifted from **70.1% -> 77.8% (+7.8 percentage points)**.
- **Test Suite:** 17 unit, integration, and E2E tests passing 100%.

