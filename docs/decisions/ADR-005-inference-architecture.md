# ADR-005: Decoupled FastAPI Inference Microservice with Dual-Mode Serving

## Status
Accepted

## Context
The stream processor requires low-latency fraud probabilities. Deploying the model inside an HTTP microservice allows independent horizontal scaling and unified access for non-streaming clients (e.g. ad-hoc scoring requests), but introduces an HTTP network round trip (~5-10ms).

## Decision
We implement a decoupled FastAPI inference service while designing the codebase to support **Dual-Mode Serving**:
1. **Networked Microservice Mode (Default):** Stream processor makes HTTP requests to `POST /api/v1/predict`. This provides service isolation and enables independent canary rollouts of models.
2. **In-Process Engine Adapter (Low-Latency Mode):** The stream processor can import the core `ModelManager` directly to perform in-memory scoring in < 3ms when sub-10ms end-to-end SLAs are mandated.

## Consequences
### Positive
- Flexible deployment architecture matching both microservice best practices and ultra-low-latency edge requirements.
- Standardized OpenAPI 3.1 contracts for all scoring interactions.

### Negative
- Requires maintaining clean separation between API route handlers and model execution logic so the model can run both within FastAPI and in standalone streaming processes.
