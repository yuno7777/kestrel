# ADR-003: Redis Sorted Sets for Low-Latency Sliding Window Velocity State

## Status
Accepted

## Context
Velocity features (e.g. number of transactions in the last 1 minute, 5 minutes, or 1 hour) are the most predictive indicators of automated card testing and unauthorized account takeover attacks. Querying a relational database for `COUNT(*) WHERE timestamp >= NOW() - INTERVAL '5 minutes'` introduces tens of milliseconds of latency and places prohibitive read load on PostgreSQL under high throughput.

## Decision
We utilize Redis Sorted Sets (`ZSET`) to maintain lightweight, self-pruning sliding window transaction history per customer:
- `ZREMRANGEBYSCORE` removes entries older than 1 hour.
- `ZADD` appends the current transaction with event timestamp as score.
- `ZCOUNT` retrieves rolling window counts for 1 minute and 5 minutes in $O(\log N)$ time.
- All operations are batched using Redis pipelines to execute in a single sub-millisecond network round trip.

## Consequences
### Positive
- Sub-millisecond velocity feature hydration.
- Automatic memory capping through TTLs and window pruning.
- Completely shields PostgreSQL from high-frequency analytical queries.

### Negative
- Redis is an in-memory cache, not the permanent source of truth; if Redis restarts without persistence, temporary cold-start defaults are used until the window warms up.
