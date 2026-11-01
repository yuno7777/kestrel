# ADR-001: Event-Driven Microservices Architecture with Stream Processing

## Status
Accepted

## Context
Kestrel requires ingesting financial transactions at high frequency, enriching them with sub-millisecond historical context, evaluating machine learning models, persisting audit trails, and feeding live operator dashboards. Coupling ingestion, ML inference, and database persistence synchronously in a single monolithic API creates latency cascades, backpressure vulnerability, and single-point failures.

## Decision
We adopt an asynchronous, event-driven streaming architecture centered on Apache Kafka (KRaft mode).
- **Ingestion & Processing Decoupling:** Ingestion produces events to Kafka (`transactions.raw`). A dedicated stream processing service consumes and enriches events independently.
- **Fast State Access:** Real-time sliding window counters are maintained in Redis rather than querying the relational database on every transaction.
- **Persistence Offloading:** Database writes to PostgreSQL are executed asynchronously by an independent persistence worker consuming from `transactions.scored`.

## Consequences
### Positive
- Ingestion response times remain ultra-low (< 5ms) regardless of database or ML inference load.
- Services scale horizontally and independently based on their bottleneck (I/O, CPU, or DB writes).
- Failure in the persistence worker or database does not halt real-time transaction scoring.

### Negative
- Increases local development and operational orchestration complexity.
- Requires dual-mode fallback (standalone in-process simulator) to allow smooth developer testing when Kafka or Docker are inactive.
