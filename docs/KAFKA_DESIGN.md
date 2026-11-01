# Kestrel: Kafka Topic Architecture & Streaming Strategy

## 1. Broker Infrastructure

Kestrel leverages Apache Kafka operating in **KRaft** (Kafka Raft Metadata) mode, eliminating ZooKeeper dependencies. This reduces operational footprint, accelerates broker failover, and simplifies local development and test automation.

---

## 2. Topic Architecture & Configurations

| Topic Name | Partitions | Replication Factor | Cleanup Policy | Retention Period | Max Message Size | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `transactions.raw` | 6 | 1 (Local) / 3 (Prod) | `delete` | 7 days (604800000 ms) | 1 MB | Ingress topic for all raw transaction events. |
| `transactions.scored` | 6 | 1 (Local) / 3 (Prod) | `delete` | 14 days | 1 MB | Primary stream of enriched, scored transactions. |
| `transactions.fraud` | 3 | 1 (Local) / 3 (Prod) | `delete` | 30 days | 1 MB | High-priority stream for transactions with `BLOCK` decision. |
| `transactions.review` | 3 | 1 (Local) / 3 (Prod) | `delete` | 30 days | 1 MB | Scored events requiring human manual review (`REVIEW` decision). |
| `transactions.dlq` | 2 | 1 (Local) / 3 (Prod) | `delete` | 30 days | 2 MB | Dead-letter queue containing malformed or corrupted events. |

---

## 3. Partitioning Strategy

### 3.1 Entity-Based Key Selection
Strict event ordering is essential for accurate velocity calculation and balance tracking. To guarantee that transactions from the same customer or cardholder are processed strictly in chronological order by the same partition consumer:

- **Partition Key:** `customer_id` (UTF-8 bytes).
- **Hashing Function:** Kafka's default `murmur2` hash guarantees that all events with identical `customer_id` hash to the exact same partition.
- **Consumer Group Assignment:** Consumers in the stream processor group (`kestrel-stream-processor-cg`) are assigned distinct partitions. Even under horizontal autoscaling, a customer's event sequence is never split across concurrent consumer workers.

---

## 4. Consumer Groups & Offset Management

| Consumer Group ID | Subscribed Topics | Processing Semantic | Concurrency |
| :--- | :--- | :--- | :--- |
| `kestrel-stream-processor-cg` | `transactions.raw` | At-least-once with manual asynchronous offset commit (`commit_async`) after successful enrichment and downstream publishing. | 6 workers (1 per partition). |
| `kestrel-persistence-worker-cg` | `transactions.scored` | At-least-once batch consumption (`max_poll_records=100`) with synchronous commit (`commit_sync`) following successful PostgreSQL transaction commit. | 3 workers. |
| `kestrel-alerts-worker-cg` | `transactions.fraud` | Real-time notification dispatch (Webhooks, email, Slack alerts). | 2 workers. |

---

## 5. Backpressure & Consumer Lag Handling

When transaction velocity exceeds downstream scoring or persistence capacity:
1. Consumer group lag is monitored via Prometheus metric `kafka_consumer_lag{topic, partition, consumergroup}`.
2. The consumer loop respects `max_poll_records` (default: 50 for stream processor, 200 for persistence worker) to prevent heap overflow.
3. If consumer lag surpasses a critical threshold (e.g. 10,000 unread messages), an alert fires and auto-scaler triggers additional consumer instances up to the partition count ceiling (6).
