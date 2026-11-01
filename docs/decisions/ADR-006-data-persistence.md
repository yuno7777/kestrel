# ADR-006: Asynchronous Persistence Worker with Idempotent Upserts

## Status
Accepted

## Context
High-velocity transaction streaming requires durable storage in PostgreSQL for audit compliance, reporting, and model feedback. Performing synchronous database inserts within the stream processor blocks event consumption during database connection pool saturation or lock contention.

## Decision
We decouple persistence from stream processing:
1. The stream processor writes scored transactions exclusively to Kafka (`transactions.scored`).
2. An independent background worker (`services/persistence-worker`) consumes batches of scored events from `transactions.scored`.
3. The worker performs batch upserts using PostgreSQL `ON CONFLICT (transaction_id) DO NOTHING`.
4. Kafka consumer offsets are committed only after the database transaction successfully commits.

## Consequences
### Positive
- Stream processing throughput is completely immune to database latency spikes.
- Guarantees idempotent writes even if Kafka re-delivers messages after worker restart.
- Enables efficient batch database insertion (`executemany` / `insert().values([...])`).

### Negative
- Introduces eventual consistency between the stream processor emitting a decision and the transaction appearing in PostgreSQL historical queries (typically < 100ms delay).
