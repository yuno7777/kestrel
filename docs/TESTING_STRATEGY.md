# Kestrel: Testing Strategy & Verification Standards

## 1. Multi-Tier Testing Pyramid

Reliability in financial systems requires rigorous testing at every architectural tier:

```text
       /\
      /  \       End-to-End Tests (Full pipeline: Generator -> Stream -> Inference -> DB -> API)
     /----\      
    /      \     Integration Tests (Kafka consumer/producer, Redis atomic sliding window, DB upserts)
   /--------\    
  /          \   Unit Tests (Pydantic validation, velocity algorithms, decision policies, drift math)
 /------------\  
```

---

## 2. Unit Testing Scope (`tests/unit/`)
- **Event Schemas:** Verify acceptance of compliant transactions and rejection of malformed events (negative amounts, invalid ISO timestamps).
- **Feature Math:** Verify rolling window velocity calculations, zero-division protections, and time delta computations.
- **Decision Engine:** Verify strict boundary testing for `APPROVE`, `REVIEW`, and `BLOCK` decision cutoffs.
- **Drift Calculations:** Test Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) test implementations against known synthetic distribution pairs.

---

## 3. Integration Testing Scope (`tests/integration/`)
- **Redis Feature Store:** Test sliding window key creation, member pruning, and TTL expiration.
- **Inference Service:** Verify FastAPI `/api/v1/predict` endpoint status codes, error handling, and latency response headers.
- **Persistence Layer:** Test idempotent upsert behavior on duplicate `transaction_id`.

---

## 4. End-to-End Testing (`tests/e2e/`)
Validates the complete vertical slice:
1. Producer emits a high-risk raw transaction (e.g. nocturnal large amount with velocity burst).
2. Stream processor consumes, validates, and hydrates Redis features.
3. Inference engine computes fraud probability > 0.75.
4. Decision engine assigns `BLOCK` with appropriate reason codes.
5. Scored event is written to `transactions.scored` and `transactions.fraud`.
6. Persistence worker stores record in database.
7. API retrieves transaction via `GET /api/v1/transactions/{id}`.
8. Verification completes within 100ms.
