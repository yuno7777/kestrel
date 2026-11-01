# ADR-002: Kafka Topic Partitioning by Entity Identifier

## Status
Accepted

## Context
When calculating rolling velocity features (such as transactions in the last minute or hourly spending sums), strict chronological order for a single customer is required. If a customer's transactions are distributed randomly across different partitions, parallel consumers could process them out of order, causing race conditions in Redis feature calculations.

## Decision
We mandate entity-based partitioning for all Kafka topics:
- All events published to `transactions.raw` and `transactions.scored` use `customer_id` as the message partition key.
- Kafka hashes the `customer_id` to route all events for a given customer to the exact same partition.
- Each partition is assigned to a single consumer worker within the consumer group, guaranteeing ordered processing per entity.

## Consequences
### Positive
- Strict chronological event ordering per cardholder is preserved.
- Eliminates race conditions in customer-specific state hydration.

### Negative
- Potential partition skew if a single customer generates an extreme volume of transactions (mitigated in practice because individual payment accounts have physical or rate limits).
