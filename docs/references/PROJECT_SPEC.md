# PROJECT: Real-Time Fraud Detection and Monitoring Platform

## ROLE AND EXPECTATIONS

You are acting as a Senior Software Engineer, Machine Learning Engineer, Backend Architect, Distributed Systems Engineer, MLOps Engineer, and Frontend Engineer.

Your task is to independently architect, implement, test, document, and deliver a production-oriented Real-Time Fraud Detection Platform.

This platform must ingest financial transaction events, process them through a streaming architecture, generate meaningful features, perform machine learning inference, calculate fraud probabilities, produce fraud decisions, persist transaction records, and monitor the performance and reliability of the entire system.

This is not a basic fraud classification notebook with a dashboard.

It is an engineering project demonstrating how to build a real-time machine learning system that operates on continuously arriving data.

Think of it as a lightweight internal fraud detection infrastructure used by a fintech company or payment processing service.

The platform should demonstrate genuine understanding of:

- Event-driven architecture.
- Streaming data processing.
- Kafka producers and consumers.
- Feature engineering.
- Machine learning inference.
- Low-latency systems.
- Distributed processing.
- Transaction persistence.
- Model evaluation.
- Data and model monitoring.
- Infrastructure observability.
- Load testing.
- MLOps.

The finished system must be functional, modular, observable, reproducible, and professionally designed.

---

# 1. ENGINEERING PRINCIPLES

Follow these principles throughout development.

1. Never start coding without inspecting the existing repository and environment.
2. Plan the architecture before implementation.
3. Build modular services with clear responsibilities.
4. Separate data ingestion, stream processing, feature generation, inference, persistence, and monitoring.
5. Treat Kafka as an actual event streaming system, not merely a message queue demonstration.
6. Implement real ML inference using trained model artifacts.
7. Never use hardcoded transaction data or fake metrics to simulate a functioning system.
8. Do not claim functionality is complete until it has been implemented and tested.
9. Use asynchronous processing wherever appropriate.
10. Use proper validation, structured logging, type hints, exception handling, and configuration management.
11. Prioritize correctness and reliability over unnecessary architectural complexity.
12. Design for local development using Docker Compose.
13. Make AWS integration optional.
14. Never expose credentials or sensitive transaction information.
15. Document architectural decisions and implementation trade-offs.

Build this as a system that another engineering team could understand, run, and extend.

Avoid implementing unnecessary distributed infrastructure merely to make the architecture look impressive.

---

# 2. DOCUMENTATION-FIRST DEVELOPMENT

Before implementing application features, create the following documentation structure.

```text
docs/
├── DOCUMENTING.md
├── ARCHITECTURE.md
├── IMPLEMENTATION_PLAN.md
├── SYSTEM_DESIGN.md
├── EVENT_SCHEMA.md
├── KAFKA_DESIGN.md
├── FEATURE_ENGINEERING.md
├── ML_MODEL.md
├── DATABASE_SCHEMA.md
├── API_SPECIFICATION.md
├── MONITORING.md
├── LOAD_TESTING.md
├── SECURITY.md
├── TESTING_STRATEGY.md
├── DEPLOYMENT.md
├── CHANGELOG.md
└── decisions/
    ├── ADR-001-system-architecture.md
    ├── ADR-002-kafka-topic-design.md
    ├── ADR-003-feature-engineering.md
    ├── ADR-004-model-selection.md
    ├── ADR-005-inference-architecture.md
    └── ADR-006-data-persistence.md
```

Also create a comprehensive root README.md.

## DOCUMENTING.md: Engineering Journal

This is the central project documentation file.

Treat it as an engineering journal maintained throughout development.

Document:

- Project objective.
- Functional requirements.
- System architecture.
- Component responsibilities.
- Technology choices and reasoning.
- Repository structure.
- Development phases.
- Implementation progress.
- Completed features.
- Current work.
- Remaining tasks.
- Important technical decisions.
- Problems encountered.
- Bugs discovered and resolved.
- Performance bottlenecks.
- Testing results.
- Commands used to run and verify services.
- Known limitations.
- Future improvements.

Use actual progress checklists.

Example:

- [x] Kafka infrastructure initialized.
- [x] Transaction producer implemented.
- [x] Raw transaction topic configured.
- [x] Event validation implemented.
- [ ] Redis velocity feature generation completed.
- [ ] ML inference service integrated.
- [ ] Prediction persistence verified.
- [ ] Prometheus metrics exposed.
- [ ] Grafana dashboards completed.

Update DOCUMENTING.md after every significant implementation phase.

Never mark an incomplete feature as completed.

Record actual test outcomes rather than assumed outcomes.

Include timestamps or dates for major engineering milestones.

When an architectural decision is made, explain why it was chosen and which alternatives were considered.

---

# 3. SYSTEM ARCHITECTURE

Implement an event-driven real-time fraud detection architecture.

The conceptual architecture is:

Transaction Generator → Kafka → Python Stream Processor → Feature Engineering → FastAPI ML Inference Service → Kafka Prediction Topic → PostgreSQL

Supporting infrastructure:

- Redis: Real-time feature state, velocity tracking, and idempotency.
- Prometheus: Metrics collection.
- Grafana: Operational dashboards.
- Docker: Containerization.
- AWS: Optional cloud infrastructure and object storage.

## Service responsibilities

### A. Transaction Generator

Responsible for generating continuous transaction events.

It must support:

- Configurable transaction generation rate.
- Normal and fraudulent transaction scenarios.
- Configurable fraud ratio.
- Multiple customer profiles.
- Multiple merchants.
- Different transaction amounts.
- Different geographical locations.
- Different payment channels.
- Controllable event timing.
- Reproducible random seeds.

It should publish transactions to Kafka.

The generator must support both continuous streaming and finite test batches.

### B. Kafka Event Ingestion

Use Apache Kafka with KRaft mode for local infrastructure.

Create a well-defined topic architecture.

Suggested topics:

```text
transactions.raw
transactions.validated
transactions.scored
transactions.fraud
transactions.review
transactions.dlq
```

Responsibilities:

- Transaction event ingestion.
- Message serialization.
- Consumer group management.
- Partitioning strategy.
- Retry handling.
- Dead-letter handling.
- Consumer offset management.
- Event ordering.

Design partitions using a suitable entity key, such as a tokenized account or customer identifier, so events belonging to the same entity can preserve their ordering within a partition.

Use consumer groups appropriately.

Document the topic configuration, retention strategy, partitioning, and key selection.

Do not create unnecessary topics simply to increase architectural complexity.

### C. Python Stream Processor

Implement a dedicated Python streaming service.

Its responsibilities:

1. Consume raw transaction events.
2. Validate the event schema.
3. Reject malformed or invalid events.
4. Normalize transaction fields.
5. Perform feature generation.
6. Retrieve historical feature state from Redis.
7. Detect duplicate transaction events.
8. Forward valid enriched events for inference.
9. Handle processing failures.
10. Publish results to the correct Kafka topics.

Use clear separation between event consumption, validation, feature engineering, and inference orchestration.

The processor must not lose transactions silently.

Implement retry limits, error logging, and dead-letter routing.

Use at-least-once delivery semantics with idempotent processing and persistence. Do not claim exactly-once behavior across Kafka, Redis, and PostgreSQL unless it is genuinely implemented and verified.

### D. Redis Feature State

Use Redis for low-latency feature state.

Implement transaction velocity features such as:

- Number of transactions in the last 1 minute.
- Number of transactions in the last 5 minutes.
- Number of transactions in the last hour.
- Total transaction amount in recent windows.
- Average transaction amount.
- Time since previous transaction.
- Number of distinct merchants visited recently.
- Number of distinct locations used recently.

Additional features may include:

- Failed transaction frequency.
- Unusual transaction frequency.
- Recent payment channel changes.

Use appropriate TTLs and atomic Redis operations where necessary.

Ensure feature updates are concurrency-safe.

Design for event-time versus processing-time differences and document how delayed or out-of-order events are handled.

Redis should be treated as a fast feature-state store, not the permanent source of truth.

Implement a safe fallback strategy if Redis becomes temporarily unavailable.

### E. FastAPI ML Inference Service

Implement a dedicated FastAPI service responsible for model inference.

Responsibilities:

- Load trained model artifacts.
- Accept enriched transaction features.
- Perform schema validation.
- Generate fraud probability.
- Generate the prediction result.
- Apply configurable decision thresholds.
- Return an inference response.
- Record inference latency.
- Handle model loading and prediction failures.

Example endpoint:

POST /api/v1/predict

Input:

```json
{
  "transaction_id": "txn_10001",
  "customer_id": "customer_104",
  "features": {
    "amount": 12500.0,
    "hour_of_day": 2,
    "transactions_last_5m": 5,
    "average_amount_24h": 1800.0,
    "time_since_last_transaction": 30
  }
}
```

Example response:

```json
{
  "transaction_id": "txn_10001",
  "fraud_probability": 0.93,
  "prediction": 1,
  "decision": "BLOCK",
  "model_version": "fraud-model-v1",
  "inference_latency_ms": 4.8
}
```

The values above are illustrative response formats, not predefined model results.

Do not load the model from disk for every request.

Use a managed model-loading strategy with caching and graceful startup validation.

The Kafka processor should communicate with the inference service using a clearly defined internal contract.

For latency-sensitive inference, evaluate an embedded model execution mode as an alternative to an HTTP hop. Document the selected architecture and its latency implications.

### F. Prediction Event Publishing

After inference:

1. Construct a prediction event.
2. Include transaction identifiers.
3. Include fraud probability.
4. Include the resulting decision.
5. Include model version.
6. Include processing timestamps.
7. Include relevant feature metadata.
8. Publish the event to Kafka.

Route results into appropriate topics.

Examples:

- transactions.scored: All successfully scored transactions.
- transactions.fraud: Transactions classified for blocking or investigation.
- transactions.review: Transactions requiring additional review.

Keep the original transaction event available for traceability without unnecessarily duplicating sensitive information.

### G. PostgreSQL Persistence

Use PostgreSQL for durable storage.

Persist:

- Transaction metadata.
- Prediction results.
- Fraud probabilities.
- Fraud decisions.
- Model versions.
- Feature snapshots where appropriate.
- Event timestamps.
- Processing timestamps.
- Inference latency.
- Feedback and ground-truth labels.
- System audit events.

Implement an independent persistence consumer where appropriate.

The database should not be directly coupled to the ML inference execution path.

Use:

- SQLAlchemy.
- Alembic migrations.
- Proper indexing.
- Foreign keys.
- Unique transaction identifiers.
- Efficient batch inserts where useful.
- Pagination for API queries.

Enforce idempotent writes using unique constraints and appropriate conflict handling.

Never store real card numbers, CVVs, passwords, or unnecessary payment credentials.

---

# 4. MACHINE LEARNING ENGINE

This is one of the most important components.

Build an actual fraud detection ML pipeline.

Do not rely on a dummy model returning random fraud probabilities.

## Dataset strategy

Support two modes:

1. A reproducible synthetic transaction dataset.
2. An optional public fraud detection dataset with appropriate licensing.

Potential public benchmark:

The European credit card fraud detection dataset.

Document the source, limitations, licensing considerations, schema, and preprocessing requirements before using any external dataset.

Synthetic data must be realistic enough to exercise the complete event pipeline.

Generate identifiable normal and fraudulent transaction patterns.

For example:

Normal activity:
- Transactions generally follow customer spending patterns.
- Transaction frequency is reasonably consistent.
- Merchant and location choices have some continuity.
- Spending amounts follow customer-specific distributions.

Suspicious activity:
- Unusually large transaction amounts.
- Rapid consecutive transactions.
- Multiple geographically distant transactions within a short interval.
- Unusual transaction hours.
- Rapid merchant changes.
- Abnormal spending patterns.

Do not make fraud detection trivially easy by assigning obviously fraudulent values that directly reveal the label.

The generated dataset must support reproducible training and evaluation.

Clearly distinguish synthetic benchmark results from results on real-world datasets.

## Feature engineering

Implement reusable feature engineering.

Potential features:

Transaction features:
- Amount.
- Hour of day.
- Day of week.
- Merchant category.
- Payment channel.
- Transaction type.
- Currency.

Velocity features:
- Transactions in last minute.
- Transactions in last five minutes.
- Transactions in last hour.
- Amount spent in recent windows.
- Average recent transaction amount.

Behavioral features:
- Deviation from average spending.
- Time since previous transaction.
- Merchant diversity.
- Location changes.
- Transaction frequency.

Geographical features:
- Distance from previous transaction, when legitimate location information exists.
- Geographic inconsistency indicators.

Categorical features must be encoded appropriately.

Numerical features must be scaled or transformed when appropriate.

Avoid data leakage.

Features must only use information that would actually be available at prediction time.

Do not use ground-truth fraud labels or future transaction information when constructing inference features.

Document training/serving feature consistency.

## Algorithms

Implement a sensible baseline collection.

Supervised models:

- Logistic Regression.
- Random Forest.
- Gradient Boosting.
- HistGradientBoosting.
- Optional XGBoost or LightGBM integration if justified.

Unsupervised or anomaly detection:

- Isolation Forest.
- Local Outlier Factor where appropriate for offline analysis.

Keep the initial model collection manageable.

## Class imbalance

Fraud detection is an extremely imbalanced classification problem.

Explicitly account for this.

Evaluate:

- Class distribution.
- Class weights.
- Stratified sampling where appropriate.
- Threshold tuning.
- Precision-recall trade-offs.
- Optional resampling techniques such as SMOTE.

Do not blindly optimize for accuracy.

A model that predicts every transaction as legitimate can achieve misleading accuracy on an imbalanced dataset.

## Model evaluation

Report:

- Precision.
- Recall.
- F1-score.
- ROC-AUC.
- PR-AUC.
- Confusion matrix.
- False positive rate.
- False negative rate.
- Precision at selected recall levels.
- Recall at selected false positive rates.

Include probability calibration where appropriate.

Include threshold analysis.

Allow comparison between models.

Include a simple configurable business cost analysis that accounts for:

- False positive costs.
- False negative costs.
- Investigation costs.
- Potential fraud losses.

Make all cost assumptions explicit and configurable.

Do not present theoretical cost estimates as actual financial savings.

## Model artifacts

Save:

- Model artifact.
- Preprocessing pipeline.
- Feature schema.
- Model version.
- Training configuration.
- Evaluation metrics.
- Dataset metadata.
- Training timestamp.

Use versioned model artifacts.

Load the selected model into the inference service.

Provide the ability to change the active model version through a controlled configuration mechanism.

---

# 5. FRAUD DECISION ENGINE

Do not equate a fraud probability with an automatic decision without a defined policy.

Implement a configurable decision engine.

Example policy:

```text
Fraud probability < 0.30
    → APPROVE

0.30 <= Fraud probability < 0.75
    → REVIEW

Fraud probability >= 0.75
    → BLOCK
```

These are initial illustrative thresholds. They must be configurable and tuned using evaluation results.

Support:

- Approval thresholds.
- Manual review thresholds.
- Blocking thresholds.
- Model version tracking.
- Decision reason codes.
- Decision overrides for authorized users.

Store both the original model probability and the final business decision.

This separation allows the model and the decision policy to evolve independently.

---

# 6. FRONTEND: ENTERPRISE-GRADE FRAUD MONITORING DASHBOARD

The frontend must look like a real fraud operations and infrastructure monitoring product.

Do not create a generic AI SaaS interface.

Visual references:

- Linear.
- Stripe Dashboard.
- Vercel.
- Grafana.
- Modern fintech operations platforms.
- Professional observability products.

Do not directly copy any existing product.

## Design philosophy

The interface should feel:

- Technical.
- Information-dense.
- Precise.
- Professional.
- Responsive.
- Operationally focused.

Use:

- Restrained neutral colors.
- Carefully selected status colors.
- Strong typography hierarchy.
- Precise spacing.
- Subtle borders.
- High-quality charts.
- Useful tables.
- Consistent controls.
- Thoughtful empty states.
- Clear loading and error states.

Avoid:

- Excessive gradients.
- Purple-pink AI aesthetics.
- Unnecessary glassmorphism.
- Random floating cards.
- Huge meaningless statistics.
- Decorative charts.
- Excessively rounded components.
- Emoji navigation.
- Unnecessary animations.
- Generic AI-generated dashboard patterns.

Use Lucide icons instead of emoji.

Build a consistent component and design system.

Recommended frontend stack:

- React.
- Vite.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Recharts.
- Lucide icons.

Dark mode should be the primary visual theme.

Implement light mode if feasible.

## Main application layout

Create a persistent application shell.

Sidebar:

1. Overview.
2. Live Transactions.
3. Fraud Detection.
4. Transaction Explorer.
5. ML Models.
6. Model Performance.
7. Drift Monitoring.
8. Event Streaming.
9. Infrastructure.
10. Settings.

Top navigation:

- Workspace selector.
- Breadcrumbs.
- System health indicator.
- Notification center.
- User menu.

## Overview dashboard

Display real information from backend services.

Metrics:

- Total transactions processed.
- Transactions per second.
- Fraudulent transactions detected.
- Fraud probability distribution.
- Approval rate.
- Review rate.
- Block rate.
- Average inference latency.
- P95 inference latency.
- Kafka consumer lag.
- Active model version.

Visualizations:

- Transaction volume over time.
- Fraud detection frequency.
- Fraud probability distribution.
- Decision distribution.
- Inference latency over time.
- Model performance trends.
- Event processing throughput.

All information must come from actual backend endpoints or monitoring integrations.

Never hardcode charts or pretend the system is processing transactions.

When the platform has not received data, show professionally designed empty states.

## Live Transactions

Create a real-time transaction feed.

Display:

- Transaction ID.
- Customer token.
- Amount.
- Merchant category.
- Transaction timestamp.
- Fraud probability.
- Decision.
- Model version.
- Processing latency.

Features:

- Live updates using WebSockets or Server-Sent Events.
- Search.
- Filtering.
- Sorting.
- Pagination.
- Decision filters.
- Transaction detail view.

The interface should communicate when its connection to the backend is interrupted.

Do not simulate live updates using random frontend timers.

## Transaction Detail Page

Display:

- Original transaction metadata.
- Engineered features.
- Fraud probability.
- Final decision.
- Decision threshold.
- Model version.
- Processing timeline.
- Relevant prediction metadata.
- Available feedback and override history.

Make transaction processing traceable.

## Fraud Detection

Display:

- Fraud alerts.
- High-risk transactions.
- Transactions requiring manual review.
- Decision breakdown.
- False positive and false negative feedback when labels are available.

Implement an investigation-oriented view.

Allow authorized users to mark reviewed transactions and submit ground-truth feedback.

## ML Models

Display:

- Model name.
- Model version.
- Algorithm.
- Dataset.
- Training date.
- Evaluation metrics.
- Active deployment status.

Support model comparison and controlled model activation.

## Model Performance

Display:

- Precision.
- Recall.
- F1-score.
- PR-AUC.
- ROC-AUC.
- Confusion matrix.
- Threshold analysis.
- Performance over time.

Clearly distinguish evaluation metrics on historical test data from metrics calculated using actual production feedback.

## Drift Monitoring

Display:

- Feature drift.
- Transaction amount distribution changes.
- Velocity feature changes.
- Prediction distribution changes.
- Detection history.
- Severity.
- Monitoring timestamps.

Show which features triggered alerts.

Provide a detailed drift report.

## Event Streaming

Display:

- Kafka topics.
- Message throughput.
- Consumer group health.
- Consumer lag.
- Failed messages.
- Retry counts.
- Dead-letter queue activity.

Use genuine Kafka metrics or backend-derived metrics.

## Infrastructure

Display service health for:

- Kafka.
- Redis.
- PostgreSQL.
- FastAPI.
- Python stream processor.
- Prometheus.
- Grafana.

Show:

- Service availability.
- Resource utilization where available.
- Error rates.
- Latency.
- Recent incidents.

Do not invent service health.

---

# 7. STREAMING RELIABILITY

Reliability is a fundamental requirement.

Implement the following:

## Event validation

Use Pydantic schemas.

Validate:

- Transaction ID.
- Customer identifier.
- Timestamp.
- Transaction amount.
- Merchant category.
- Currency.
- Payment channel.
- Required event metadata.

Support event schema versioning.

Invalid messages should be routed to a dead-letter topic with sufficient diagnostic metadata.

## Idempotency

A transaction must not be processed or persisted multiple times merely because Kafka redelivers an event.

Implement:

- Unique transaction identifiers.
- Duplicate detection.
- Redis-assisted deduplication where appropriate.
- Database-level uniqueness constraints.
- Idempotent persistence.
- Safe retry behavior.

## Retry strategy

Handle:

- Redis failures.
- Inference service failures.
- Kafka connectivity failures.
- Database failures.
- Malformed messages.
- Model loading errors.

Implement bounded retries with appropriate backoff.

Avoid infinite retry loops.

Route unrecoverable messages to the dead-letter queue.

## Event ordering

Use appropriate Kafka partition keys.

Document how ordering is maintained and what happens when events arrive late or out of order.

## Backpressure

The system must not collapse when transaction generation exceeds consumer processing capacity.

Monitor Kafka lag.

Configure consumer concurrency carefully.

Implement appropriate resource limits and failure behavior.

---

# 8. MODEL AND DATA MONITORING

Monitoring is not optional.

Implement genuine monitoring.

## Operational monitoring

Track:

- Transactions received per second.
- Transactions processed per second.
- Inference latency.
- P50 latency.
- P95 latency.
- P99 latency.
- API errors.
- Failed events.
- Kafka consumer lag.
- Redis response latency.
- Database write latency.
- Dead-letter queue volume.

## Data monitoring

Track distributions of:

- Transaction amount.
- Transaction frequency.
- Merchant category.
- Transaction hour.
- Geographic features where available.
- Velocity features.
- Fraud probability.

## Data drift

Implement statistical drift detection.

Use methods such as:

- Population Stability Index.
- Kolmogorov-Smirnov test.
- Distribution comparisons.

Allow configurable drift thresholds.

Record:

- Feature name.
- Reference distribution.
- Current distribution.
- Drift score.
- Detection timestamp.
- Severity.

## Prediction drift

Monitor changes in:

- Fraud probability distribution.
- Prediction class distribution.
- Approval/block/review rates.

## Model performance monitoring

Provide the ability to ingest ground-truth labels after predictions have been made.

Track:

- Precision.
- Recall.
- F1-score.
- PR-AUC where valid.
- False positive rate.
- False negative rate.

Account for label availability delays.

Do not calculate real-world model accuracy using generated predictions without genuine ground-truth labels.

Distinguish:

- Feature drift.
- Prediction drift.
- Concept drift.

Do not claim to establish concept drift merely because input distributions changed. Actual outcome labels are required to assess changes in the relationship between inputs and fraud outcomes.

---

# 9. PROMETHEUS AND GRAFANA

Integrate Prometheus and Grafana properly.

## Prometheus

Expose useful application metrics.

Examples:

- fraud_transactions_received_total
- fraud_transactions_processed_total
- fraud_transactions_flagged_total
- fraud_inference_requests_total
- fraud_inference_latency_seconds
- fraud_prediction_errors_total
- kafka_consumer_lag
- fraud_dlq_messages_total

Use appropriate metric types.

Avoid high-cardinality metric labels.

Do not use transaction IDs or customer IDs as Prometheus labels.

Provide a prometheus.yml configuration.

Configure appropriate exporters where useful for:

- Kafka.
- PostgreSQL.
- Redis.
- Host or container metrics.

## Grafana

Create provisioned dashboards.

Suggested dashboards:

1. System Overview.
2. Transaction Throughput.
3. Model Inference Performance.
4. Kafka Consumer Health.
5. Fraud Detection Metrics.
6. Infrastructure Resource Utilization.

Dashboards must be connected to real Prometheus data.

Persist Grafana dashboard configuration.

Document how to access Grafana and what each dashboard represents.

---

# 10. API DESIGN

Use FastAPI and versioned REST APIs.

Suggested endpoints:

Transactions:

- POST /api/v1/transactions
- GET /api/v1/transactions
- GET /api/v1/transactions/{transaction_id}

Inference:

- POST /api/v1/predict
- GET /api/v1/models/active

Fraud:

- GET /api/v1/fraud/alerts
- GET /api/v1/fraud/summary
- POST /api/v1/fraud/{transaction_id}/feedback

Models:

- GET /api/v1/models
- GET /api/v1/models/{model_id}
- POST /api/v1/models/{model_id}/activate

Monitoring:

- GET /api/v1/monitoring/summary
- GET /api/v1/monitoring/drift
- GET /api/v1/monitoring/performance

Streaming:

- GET /api/v1/streaming/status
- GET /api/v1/streaming/topics
- GET /api/v1/streaming/consumers

System:

- GET /health
- GET /ready
- GET /metrics

Adjust these endpoints to the final architecture.

Use:

- Pydantic schemas.
- Proper HTTP status codes.
- Pagination.
- Filtering.
- Consistent error responses.
- Input validation.
- Dependency injection.
- OpenAPI documentation.

Keep business logic out of route handlers.

Use WebSockets or Server-Sent Events for real-time frontend updates where beneficial.

---

# 11. DATABASE DESIGN

Create normalized SQLAlchemy models and Alembic migrations.

Suggested entities:

- Transactions.
- TransactionFeatures.
- Predictions.
- FraudDecisions.
- FraudFeedback.
- Models.
- ModelVersions.
- DriftReports.
- ProcessingEvents.
- AuditEvents.

Use:

- Appropriate relationships.
- Foreign keys.
- Unique constraints.
- Indexes.
- Timestamps.
- Transaction status fields.
- Model version references.

Consider partitioning or time-based retention for transaction and prediction tables if justified by expected volume.

Do not prematurely implement complex database partitioning without measuring its necessity.

Document the database structure in DATABASE_SCHEMA.md.

Include an ER diagram.

---

# 12. PROJECT STRUCTURE

Use a modular repository.

A suggested structure:

```text
fraud-detection-platform/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── charts/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── services/
│   ├── api/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   ├── core/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── db/
│   │   └── tests/
│   │
│   ├── stream-processor/
│   │   ├── app/
│   │   │   ├── consumer.py
│   │   │   ├── processor.py
│   │   │   ├── validation.py
│   │   │   ├── feature_engineering.py
│   │   │   └── publisher.py
│   │   ├── tests/
│   │   └── Dockerfile
│   │
│   ├── transaction-generator/
│   │   ├── app/
│   │   ├── tests/
│   │   └── Dockerfile
│   │
│   └── persistence-worker/
│       ├── app/
│       ├── tests/
│       └── Dockerfile
│
├── ml/
│   ├── data/
│   ├── features/
│   ├── training/
│   ├── evaluation/
│   ├── inference/
│   ├── monitoring/
│   └── artifacts/
│
├── infrastructure/
│   ├── kafka/
│   ├── postgres/
│   ├── redis/
│   ├── prometheus/
│   ├── grafana/
│   │   └── dashboards/
│   └── docker/
│
├── tests/
│   ├── integration/
│   ├── end_to_end/
│   └── load/
│
├── docs/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

This is a starting structure. Modify it based on justified architectural decisions.

Avoid unnecessary code duplication between services.

Share common schemas, contracts, and feature definitions through a properly structured shared Python package where appropriate.

---

# 13. DOCKER AND INFRASTRUCTURE

Containerize all required services.

Docker Compose should include:

- Frontend.
- FastAPI inference/API service.
- Python stream processor.
- Transaction generator.
- Persistence worker.
- Kafka in KRaft mode.
- PostgreSQL.
- Redis.
- Prometheus.
- Grafana.

Optional:

- ML training service.
- Kafka exporter.
- PostgreSQL exporter.
- Redis exporter.
- Node exporter.

Requirements:

- Persistent volumes.
- Health checks.
- Environment variables.
- Internal networks.
- Restart policies.
- Service dependencies.
- Container resource considerations.
- Graceful shutdown.
- Useful service logs.

Use Docker Compose profiles where helpful so development, testing, and monitoring services can be started independently.

The complete local system must be runnable through documented commands.

Do not require AWS credentials to run the local platform.

---

# 14. AWS INTEGRATION

Keep cloud integration modular and optional.

Design for future AWS deployment.

Potential services:

- EC2 for application hosting.
- S3 for datasets and model artifacts.
- MSK as a managed Kafka alternative.
- RDS for PostgreSQL.
- ElastiCache for Redis.
- CloudWatch for operational logs and metrics.

Do not attempt to implement every AWS service in the first version.

Use environment-driven configurations.

Do not hardcode cloud credentials.

Document the difference between local infrastructure and an optional AWS deployment.

---

# 15. LOAD TESTING AND PERFORMANCE ENGINEERING

This project must demonstrate that the system can process continuous transaction events under load.

Implement load testing using Locust, k6, or an equivalent suitable tool.

## Test scenarios

1. Low-volume transaction streaming.
2. Moderate transaction streaming.
3. High-volume transaction streaming.
4. Sudden traffic spikes.
5. Sustained high throughput.
6. Kafka consumer interruption.
7. Redis interruption.
8. Inference service interruption.
9. Database slowdown.
10. Recovery after failures.

## Performance measurements

Measure:

- Transactions generated per second.
- Transactions consumed per second.
- End-to-end processing latency.
- Inference latency.
- P50 latency.
- P95 latency.
- P99 latency.
- Kafka consumer lag.
- Message failure rate.
- Duplicate event rate.
- Database write throughput.
- CPU and memory consumption.

Report actual measured values.

Do not invent throughput numbers.

Document:

- Hardware configuration.
- Docker resource limits.
- Test duration.
- Number of producers.
- Kafka partition configuration.
- Consumer concurrency.
- Dataset characteristics.
- Bottlenecks.
- Optimizations performed.

Clearly distinguish local benchmark performance from production-scale performance.

The goal is to measure the system, identify bottlenecks, and improve it through evidence.

---

# 16. SECURITY AND DATA PRIVACY

Implement basic security best practices.

Requirements:

- Environment-based configuration.
- No secrets in source code.
- Request validation.
- Upload and payload size limits.
- Proper authentication for administrative functions.
- Role-based authorization where appropriate.
- Rate limiting for public endpoints.
- Secure error responses.
- Audit logging for manual fraud decisions.
- Protection against SQL injection.
- Safe handling of serialized model artifacts.
- Restrict internal service communication.
- Avoid sensitive information in logs.

Use synthetic or appropriately licensed and anonymized data.

Never use actual payment credentials.

Do not store:

- CVV values.
- Raw card numbers.
- Banking passwords.
- Unnecessary personal information.

Use tokenized identifiers in the demo architecture.

Document security assumptions and limitations.

Do not claim PCI DSS compliance or production financial-system certification.

---

# 17. AUTOMATED TESTING

Testing is mandatory.

## Unit tests

Test:

- Event validation.
- Feature generation.
- Redis velocity calculations.
- Fraud decision logic.
- Model inference.
- Threshold configuration.
- Data drift detection.
- Event serialization.
- Idempotency behavior.

## Integration tests

Test:

- Kafka producer and consumer.
- Redis integration.
- FastAPI inference.
- PostgreSQL persistence.
- Prediction event publishing.
- Dead-letter routing.
- Retry mechanisms.

Use isolated test infrastructure or test containers where appropriate.

## End-to-end test

Verify this complete workflow:

1. Start the infrastructure.
2. Generate a transaction.
3. Publish it to Kafka.
4. Consume the transaction.
5. Validate the event.
6. Generate real-time features.
7. Send features to the inference service.
8. Receive the fraud probability.
9. Apply the fraud decision policy.
10. Publish the prediction event.
11. Persist the prediction in PostgreSQL.
12. Expose the transaction through the API.
13. Display it in the frontend.
14. Verify the corresponding monitoring metrics.

Also test failure and recovery scenarios.

## CI pipeline

Use GitHub Actions.

Include:

- Python linting.
- Python formatting.
- Backend tests.
- ML tests.
- Frontend linting.
- TypeScript checks.
- Frontend build.
- Docker build validation.

Use Ruff, Pytest, ESLint, and TypeScript.

Keep deployment workflows separate from CI validation.

---

# 18. DEVELOPMENT PHASES

Implement this project incrementally.

Do not attempt to implement every component simultaneously.

PHASE 0: Repository reconnaissance

- Inspect the repository.
- Identify existing code.
- Inspect Python and Node versions.
- Inspect installed dependencies.
- Check Docker availability.
- Inspect available hardware.
- Identify potential infrastructure limitations.
- Document findings.

PHASE 1: System design

- Finalize architecture.
- Create documentation.
- Design event schemas.
- Define Kafka topics.
- Define database entities.
- Define feature contracts.
- Design API interfaces.
- Define failure handling.
- Create implementation milestones.

PHASE 2: Infrastructure foundation

- Initialize Docker Compose.
- Configure Kafka.
- Configure PostgreSQL.
- Configure Redis.
- Verify service connectivity.
- Implement health checks.

PHASE 3: Transaction generation

- Implement synthetic transaction generation.
- Add normal and fraudulent scenarios.
- Create Kafka producer.
- Publish continuous transaction events.
- Verify message delivery.

PHASE 4: Event processing

- Implement Kafka consumer.
- Add event validation.
- Implement schema versioning.
- Add retry handling.
- Add dead-letter queues.
- Add deduplication.

PHASE 5: Feature engineering

- Implement transaction features.
- Implement velocity features.
- Integrate Redis.
- Test concurrency behavior.
- Verify feature correctness.

PHASE 6: ML pipeline

- Prepare training data.
- Implement preprocessing.
- Handle class imbalance.
- Train multiple algorithms.
- Compare models.
- Tune thresholds.
- Evaluate models.
- Save model artifacts.

PHASE 7: Inference service

- Implement FastAPI model loading.
- Implement prediction endpoint.
- Implement fraud probability calculation.
- Implement decision policy.
- Track latency.
- Verify model inference.

PHASE 8: Prediction processing and persistence

- Publish scored events.
- Route fraud and review events.
- Implement persistence worker.
- Store transaction records.
- Store predictions.
- Verify idempotency.

PHASE 9: Monitoring infrastructure

- Add Prometheus metrics.
- Configure Prometheus.
- Configure Grafana.
- Add operational dashboards.
- Add model monitoring.
- Add drift detection.

PHASE 10: Frontend

- Build the design system.
- Implement the application shell.
- Build overview dashboard.
- Build live transaction feed.
- Build transaction details.
- Build fraud investigation views.
- Build model monitoring.
- Build drift monitoring.
- Build infrastructure pages.

PHASE 11: Performance and reliability

- Implement load testing.
- Run throughput benchmarks.
- Test failure scenarios.
- Analyze consumer lag.
- Investigate bottlenecks.
- Optimize where justified.

PHASE 12: Testing and hardening

- Run unit tests.
- Run integration tests.
- Run end-to-end tests.
- Verify failure handling.
- Review security.
- Verify clean Docker deployment.

PHASE 13: Documentation and delivery

- Complete README.
- Complete DOCUMENTING.md.
- Update architectural diagrams.
- Document API usage.
- Document infrastructure.
- Document test results.
- Document benchmark results.
- Provide reproducible execution instructions.

---

# 19. DEFINITION OF DONE

The project is not complete merely because the dashboard displays transaction data.

The project is complete only when the following workflow works:

A user starts the platform using Docker Compose.

The transaction generator continuously produces realistic events.

Transactions are published to Kafka.

The Python processor consumes and validates events.

The processor generates features using transaction metadata and Redis-backed velocity state.

Features are forwarded to the FastAPI inference service.

The service loads a real trained fraud detection model.

The model generates a fraud probability.

The decision engine determines whether the transaction should be approved, reviewed, or blocked.

The resulting prediction is published to Kafka.

A persistence consumer stores the transaction and prediction in PostgreSQL.

The frontend displays the transaction in a live transaction feed.

Prometheus collects real system and application metrics.

Grafana displays actual streaming and inference performance.

Drift monitoring detects meaningful distribution changes.

Ground-truth feedback can be submitted and used to evaluate model performance when available.

A load-testing tool can generate traffic and report actual system throughput and latency.

Failure scenarios can be tested, and the system recovers without silently losing or duplicating persisted transactions.

The entire system can be reproduced using documented instructions.

---

# 20. AGENT OPERATING INSTRUCTIONS

Operate autonomously and follow a documentation-first engineering workflow.

At the beginning:

1. Inspect the existing repository.
2. Inspect the local development environment.
3. Identify installed runtimes and dependencies.
4. Inspect Docker and hardware availability.
5. Create the documentation structure.
6. Document initial architectural decisions.
7. Produce an implementation plan.

Then start implementation.

After every major phase:

1. Run the relevant tests.
2. Inspect the actual implementation.
3. Fix identified issues.
4. Verify integration with dependent services.
5. Update DOCUMENTING.md.
6. Update CHANGELOG.md.
7. Record architectural changes.
8. Update the remaining task checklist.

Do not silently skip requirements.

Do not create unnecessary placeholder functions.

Do not leave buttons without working behavior.

Do not fabricate monitoring metrics, model evaluation results, test outcomes, or performance benchmarks.

Do not mark synthetic benchmark performance as evidence of real-world fraud detection effectiveness.

If a requirement cannot be implemented reliably, document the issue and implement a sensible alternative.

If the full system is too large for one development session, prioritize a complete end-to-end vertical slice before extending secondary functionality.

A working system with a smaller feature set is preferable to a large application filled with unfinished integrations.

At the end, provide a technical delivery report containing:

- Architecture summary.
- Implemented services.
- Implemented ML algorithms.
- Model evaluation results.
- Kafka topic configuration.
- Database schema.
- API documentation.
- Monitoring capabilities.
- Load testing methodology and actual results.
- Docker execution instructions.
- Test results.
- Known limitations.
- Remaining engineering work.
- Recommended improvements.

Your objective is to deliver a technically credible real-time ML infrastructure platform.

Build it like an engineering team would build an internal fintech system, not like a college demonstration project.