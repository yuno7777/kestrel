# Kestrel: Security & Data Privacy Architecture

## 1. Zero Trust Principles & Sensitive Data Isolation

The Kestrel platform processes financial telemetry. To prevent exposure of personally identifiable information (PII) or payment card details, the architecture adheres to strict isolation rules:

### 1.1 Prohibited Data
The platform **never** receives, parses, logs, or persists:
- Primary Account Numbers (PAN / 16-digit credit card numbers).
- Card Verification Values (CVV / CVC).
- Cardholder PINs or banking portal credentials.
- Plaintext billing street addresses.

### 1.2 Tokenization & Pseudonymization
- Customers are referenced exclusively through opaque, cryptographically random surrogate keys: `customer_id` (e.g. `cust_a79f012b`).
- Devices are identified using irreversible one-way SHA-256 hashes of client fingerprint headers: `device_id`.
- Transactions utilize Version 4 UUIDs generated at origin.

---

## 2. Secrets Management & Configuration

- **Zero Hardcoded Secrets:** All credentials, database connection strings, Kafka broker addresses, and Redis passwords are read exclusively from environment variables or `.env` files via Pydantic Settings.
- **Example Template:** A sanitized `.env.example` file is version-controlled, while `.env` is strictly ignored by `.gitignore`.

---

## 3. API & Infrastructure Security

- **Pydantic v2 Schema Enforcement:** Every inbound request is validated for type safety, length bounds, and valid range constraints before entering application logic.
- **Payload Limits:** Maximum JSON payload size is enforced at the reverse proxy and FastAPI middleware (100 KB limit for single scoring requests).
- **SQL Injection Prevention:** All persistence queries utilize parameterized SQLAlchemy ORM statements. No raw string interpolation is permitted.
- **Safe Model Deserialization:** Serialized model artifacts (`.joblib`) are signed and loaded exclusively from a secured internal artifacts directory (`ml/artifacts/`) with restricted write permissions.
