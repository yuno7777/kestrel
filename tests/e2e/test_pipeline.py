"""End-to-end integration and pipeline verification test for Kestrel."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from services.api.app.main import app
from services.api.app.core.database import init_db
from services.api.app.services.model_manager import model_manager
from services.stream_processor.app.processor import StreamProcessor
from services.stream_processor.app.redis_store import RedisFeatureStore


@pytest_asyncio.fixture(autouse=True)
async def setup_pipeline():
    await init_db()
    model_manager.load_active_model()


@pytest.mark.asyncio
async def test_full_pipeline_flow():
    """Verify raw event -> validation -> velocity hydration -> ML inference -> decision -> DB persistence."""
    redis_store = RedisFeatureStore()
    processor = StreamProcessor(redis_store=redis_store)
    await processor.initialize()

    # Raw transaction with nocturnal burst scenario
    raw_event = {
        "transaction_id": "e2e_txn_block_001",
        "customer_id": "cust_e2e_99",
        "timestamp": "2026-11-02T03:15:00Z",
        "amount": 4200.00,
        "currency": "USD",
        "merchant_id": "merch_crypto_888",
        "merchant_category": "crypto",
        "payment_channel": "online",
        "device_id": "dev_test_99",
    }

    # Process through stream processor
    scored, dlq = await processor.process_raw_event(raw_event)

    assert dlq is None, f"Unexpected DLQ event: {dlq}"
    assert scored is not None
    assert scored.transaction_id == "e2e_txn_block_001"
    assert scored.features.amount == 4200.00
    assert scored.features.is_high_risk_category == 1
    assert scored.features.is_night == 1
    assert scored.fraud_probability >= 0.0
    assert scored.decision.value in ["APPROVE", "REVIEW", "BLOCK"]
    assert scored.model_version is not None

    # Now verify HTTP API ingestion and persistence
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Ingest
        resp = await client.post("/api/v1/transactions", json=raw_event)
        assert resp.status_code == 200
        saved = resp.json()
        assert saved["transaction_id"] == "e2e_txn_block_001"

        # Query via detail endpoint
        detail = await client.get("/api/v1/transactions/e2e_txn_block_001")
        assert detail.status_code == 200
        detail_data = detail.json()
        assert detail_data["transaction_id"] == "e2e_txn_block_001"
        assert detail_data["amount"] == 4200.00
        assert detail_data["merchant_category"] == "crypto"

        # Submit analyst ground truth feedback
        fb = await client.post(
            "/api/v1/fraud/e2e_txn_block_001/feedback",
            json={"actual_label": 1, "reported_by": "lead_investigator", "notes": "Confirmed stolen card testing"},
        )
        assert fb.status_code == 200
        assert fb.json()["label"] == 1
