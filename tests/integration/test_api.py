"""Integration tests for Kestrel FastAPI service."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from services.api.app.main import app
from services.api.app.core.database import init_db
from services.api.app.services.model_manager import model_manager


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    """Ensure database and model are initialized before running integration tests."""
    await init_db()
    model_manager.load_active_model()


@pytest.mark.asyncio
async def test_health_and_ready():
    """Test health and readiness endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        health_resp = await client.get("/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "ok"

        ready_resp = await client.get("/ready")
        assert ready_resp.status_code == 200
        assert ready_resp.json()["ready"] is True


@pytest.mark.asyncio
async def test_predict_endpoint():
    """Test inference prediction endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "transaction_id": "test_txn_999",
            "customer_id": "cust_1001",
            "amount": 2500.0,
            "currency": "USD",
            "merchant_category": "crypto",
            "payment_channel": "online",
            "features": {
                "amount": 2500.0,
                "log_amount": 7.824,
                "hour_of_day": 3,
                "day_of_week": 1,
                "is_weekend": 0,
                "is_night": 1,
                "txns_last_1m": 4,
                "txns_last_5m": 7,
                "txns_last_1h": 12,
                "amount_sum_1h": 6200.0,
                "amount_avg_1h": 516.67,
                "amount_to_avg_ratio": 4.84,
                "time_since_last_txn_sec": 12.0,
                "distinct_merchants_1h": 4,
                "is_high_risk_category": 1,
            },
        }
        resp = await client.post("/api/v1/predict", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["transaction_id"] == "test_txn_999"
        assert 0.0 <= data["fraud_probability"] <= 1.0
        assert data["decision"] in ["APPROVE", "REVIEW", "BLOCK"]
        assert isinstance(data["reason_codes"], list)
        assert data["inference_latency_ms"] >= 0.0


@pytest.mark.asyncio
async def test_ingest_and_query_transaction():
    """Test full transaction ingestion, storage, and retrieval."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        import uuid
        txn_id = f"test_ingest_uuid_{uuid.uuid4().hex[:8]}"
        payload = {
            "transaction_id": txn_id,
            "customer_id": "cust_555",
            "timestamp": "2026-11-02T03:30:00Z",
            "amount": 120.50,
            "currency": "USD",
            "merchant_id": "merch_dining_12",
            "merchant_category": "dining",
            "payment_channel": "pos_chip",
        }
        ingest_resp = await client.post("/api/v1/transactions", json=payload)
        assert ingest_resp.status_code == 200
        assert ingest_resp.json()["transaction_id"] == txn_id

        # Query detail
        detail_resp = await client.get(f"/api/v1/transactions/{txn_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["transaction_id"] == txn_id
        assert detail["amount"] == 120.50
        assert detail["decision"] in ["APPROVE", "REVIEW", "BLOCK"]

        # Submit feedback
        fb_payload = {
            "actual_label": 0,
            "reported_by": "analyst_bob",
            "notes": "Verified genuine dining charge",
        }
        fb_resp = await client.post(f"/api/v1/fraud/{txn_id}/feedback", json=fb_payload)
        assert fb_resp.status_code == 200
        assert fb_resp.json()["status"] == "ACCEPTED"


@pytest.mark.asyncio
async def test_models_and_metrics_endpoints():
    """Test model listing and prometheus metrics scraping."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        models_resp = await client.get("/api/v1/models")
        assert models_resp.status_code == 200
        models_data = models_resp.json()
        assert len(models_data) > 0

        metrics_resp = await client.get("/metrics")
        assert metrics_resp.status_code == 200
        assert "fraud_transactions_processed_total" in metrics_resp.text
