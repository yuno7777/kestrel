# Kestrel: Changelog

All notable changes to the Kestrel Fraud Detection and Monitoring Platform are documented in this file in reverse chronological order.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning.

---

## [Unreleased] - 2026-11-02

### Added
- **Naming & Identity:** Established platform identity as **Kestrel: Real-Time Fraud Intelligence & Streaming Platform**.
- **Phase 0 Reconnaissance:** Completed full audit of host hardware (10-core i7-13620H, 16GB RAM), Python 3.13.15, Node v24.19.0, Docker CLI v29.9.1, and Git 2.55.0.
- **Documentation Suite (Phase 1):**
  - `docs/DOCUMENTING.md`: Central engineering journal and milestone tracking checklist.
  - `docs/ARCHITECTURE.md`: High-level system architecture and latency budgets.
  - `docs/SYSTEM_DESIGN.md`: Streaming reliability, Redis velocity state, and failure modes.
  - `docs/IMPLEMENTATION_PLAN.md`: 10-phase execution roadmap.
  - `docs/EVENT_SCHEMA.md`: Canonical Pydantic and JSON event schema definitions.
  - `docs/KAFKA_DESIGN.md`: KRaft topic configurations and partition key strategies.
  - `docs/FEATURE_ENGINEERING.md`: Velocity calculations and behavioral feature specs.
  - `docs/ML_MODEL.md`: Imbalance handling, algorithms, and evaluation metrics.
  - `docs/DATABASE_SCHEMA.md`: PostgreSQL ER diagram and index optimization.
  - `docs/API_SPECIFICATION.md`: REST API OpenAPI 3.1 endpoints and schemas.
  - `docs/MONITORING.md`: Prometheus custom metrics and statistical drift detection.
  - `docs/LOAD_TESTING.md`: Load benchmark scenarios and measurement criteria.
  - `docs/SECURITY.md`: Zero-trust tokenization and data protection policies.
  - `docs/TESTING_STRATEGY.md`: Unit, integration, and end-to-end testing standards.
  - `docs/DEPLOYMENT.md`: Docker Compose and standalone local runbook.
  - Architecture Decision Records (ADR-001 through ADR-006).
  - Root `README.md` and `.env.example`.
- **Git & Environment:** Initialized Git repository, added `.gitignore`, created dedicated Python virtual environment `.venv`.
