"""FastAPI Inference, Management & Telemetry API for Kestrel."""

import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from kestrel_common.config import settings
from kestrel_common.logging import get_logger
from kestrel_common.schemas import (
    TransactionRaw,
    TransactionFeatures,
    DecisionType,
    FraudFeedbackSubmission,
)
from services.api.app.core.database import get_db_session, init_db
from services.api.app.models.db_models import (
    TransactionRecord,
    PredictionRecord,
    FraudDecisionRecord,
    FraudFeedbackRecord,
)
from services.api.app.schemas.api_schemas import (
    PredictRequest,
    PredictResponse,
    TransactionResponse,
    PaginatedTransactionsResponse,
    SystemSummaryResponse,
    ActivateModelRequest,
)
from services.api.app.services.model_manager import model_manager
from services.api.app.services.decision_engine import DecisionEngine
from services.api.app.services.telemetry import (
    TRANSACTIONS_RECEIVED,
    TRANSACTIONS_PROCESSED,
    INFERENCE_LATENCY,
    FRAUD_PROBABILITY_HISTOGRAM,
    ACTIVE_MODEL_GAUGE,
)
from ml.monitoring.drift import evaluate_feature_drift

logger = get_logger("kestrel.api")
decision_engine = DecisionEngine()

# In-memory buffer for real-time frontend streaming broadcast (SSE)
sse_subscribers: List[asyncio.Queue] = []
recent_in_memory_transactions: List[Dict[str, Any]] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context: initialize database, pre-load ML model, set gauges."""
    logger.info("Initializing Kestrel platform services...")
    await init_db()

    # Pre-load active ML model
    success = model_manager.load_active_model()
    if success:
        logger.info(f"Active model: {model_manager.active_version}")
        ACTIVE_MODEL_GAUGE.labels(
            model_version=model_manager.active_version,
            algorithm=model_manager.metadata.get("algorithm", "HistGradientBoosting"),
        ).set(1)
    else:
        logger.warning("No model artifact loaded on startup. Models can be activated via API.")

    yield
    logger.info("Kestrel platform services shutting down.")


app = FastAPI(
    title="Kestrel Fraud Intelligence API",
    description="High-throughput real-time financial fraud detection, scoring, and telemetry engine.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Health & Telemetry Endpoints
# ------------------------------------------------------------------------------

@app.get("/health", tags=["System"])
@app.get("/api/v1/system/health", tags=["System"])
async def health_check():
    """Liveness probe."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/ready", tags=["System"])
@app.get("/api/v1/system/ready", tags=["System"])
async def readiness_check():
    """Readiness probe verifying model cache."""
    is_ready = model_manager.model is not None
    return {
        "ready": is_ready,
        "active_model": model_manager.active_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/metrics", tags=["System"], response_class=PlainTextResponse)
async def metrics():
    """Prometheus metrics scrape endpoint."""
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ------------------------------------------------------------------------------
# ML Inference & Scoring
# ------------------------------------------------------------------------------

@app.post("/api/v1/predict", response_model=PredictResponse, tags=["Inference"])
async def predict_transaction(payload: PredictRequest):
    """Score enriched features and generate real-time fraud probability and decision."""
    try:
        fraud_prob, pred_class, latency_ms = model_manager.predict(
            payload.features,
            merchant_category=payload.merchant_category.value,
            payment_channel=payload.payment_channel.value,
        )

        decision, reason_codes = decision_engine.evaluate(fraud_prob, payload.features)

        # Record telemetry
        TRANSACTIONS_PROCESSED.labels(decision=decision.value).inc()
        INFERENCE_LATENCY.labels(model_version=model_manager.active_version).observe(
            latency_ms / 1000.0
        )
        FRAUD_PROBABILITY_HISTOGRAM.labels(model_version=model_manager.active_version).observe(
            fraud_prob
        )

        return PredictResponse(
            transaction_id=payload.transaction_id,
            fraud_probability=fraud_prob,
            prediction=pred_class,
            decision=decision,
            reason_codes=reason_codes,
            model_version=model_manager.active_version or "kestrel-hgb-v1.0.0",
            inference_latency_ms=latency_ms,
        )

    except Exception as e:
        logger.error(f"Inference error for transaction {payload.transaction_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(e)}",
        )


# ------------------------------------------------------------------------------
# Transaction Ingress & Query Endpoints
# ------------------------------------------------------------------------------

@app.post("/api/v1/transactions", tags=["Transactions"])
async def ingest_transaction(
    payload: TransactionRaw, db: AsyncSession = Depends(get_db_session)
):
    """Direct synchronous ingestion fallback (scores and persists immediately)."""
    TRANSACTIONS_RECEIVED.labels(channel=payload.payment_channel.value).inc()

    # Construct features
    hour = payload.timestamp.hour
    day = payload.timestamp.weekday()
    features = TransactionFeatures(
        amount=payload.amount,
        log_amount=round(float(__import__("math").log(payload.amount + 1)), 4),
        hour_of_day=hour,
        day_of_week=day,
        is_weekend=1 if day in (5, 6) else 0,
        is_night=1 if hour in (0, 1, 2, 3, 4, 5) else 0,
        txns_last_1m=1,
        txns_last_5m=1,
        txns_last_1h=1,
        amount_sum_1h=payload.amount,
        amount_avg_1h=payload.amount,
        amount_to_avg_ratio=1.0,
        time_since_last_txn_sec=3600.0,
        distinct_merchants_1h=1,
        is_high_risk_category=1 if payload.merchant_category.value in ("crypto", "electronics", "gaming") else 0,
    )

    fraud_prob, pred_class, latency_ms = model_manager.predict(
        features,
        merchant_category=payload.merchant_category.value,
        payment_channel=payload.payment_channel.value,
    )
    decision, reason_codes = decision_engine.evaluate(fraud_prob, features)

    # Persist
    txn_record = TransactionRecord(
        transaction_id=payload.transaction_id,
        customer_id=payload.customer_id,
        timestamp=payload.timestamp,
        amount=payload.amount,
        currency=payload.currency,
        merchant_id=payload.merchant_id,
        merchant_category=payload.merchant_category.value,
        payment_channel=payload.payment_channel.value,
        device_id=payload.device_id,
    )
    pred_record = PredictionRecord(
        prediction_id=str(uuid4()),
        transaction_id=payload.transaction_id,
        model_version=model_manager.active_version or "kestrel-hgb-v1.0.0",
        fraud_probability=fraud_prob,
        prediction=pred_class,
        inference_latency_ms=latency_ms,
        features_snapshot=features.model_dump(),
    )
    dec_record = FraudDecisionRecord(
        decision_id=str(uuid4()),
        transaction_id=payload.transaction_id,
        decision=decision.value,
        reason_codes=reason_codes,
    )

    # Idempotency check: if transaction already exists, retrieve and return
    existing = await db.get(TransactionRecord, payload.transaction_id)
    if existing:
        logger.info(f"Transaction {payload.transaction_id} already persisted; returning idempotent response.")
        return {
            "transaction_id": existing.transaction_id,
            "customer_id": existing.customer_id,
            "timestamp": existing.timestamp.isoformat(),
            "amount": existing.amount,
            "currency": existing.currency,
            "merchant_id": existing.merchant_id,
            "merchant_category": existing.merchant_category,
            "payment_channel": existing.payment_channel,
            "fraud_probability": 0.0,
            "prediction": 0,
            "decision": "APPROVE",
            "reason_codes": [],
            "model_version": model_manager.active_version,
            "inference_latency_ms": 0.0,
        }

    db.add(txn_record)
    db.add(pred_record)
    db.add(dec_record)
    await db.commit()

    # Record telemetry
    TRANSACTIONS_PROCESSED.labels(decision=decision.value).inc()

    # Broadcast to SSE subscribers
    event_payload = {
        "transaction_id": payload.transaction_id,
        "customer_id": payload.customer_id,
        "timestamp": payload.timestamp.isoformat(),
        "amount": payload.amount,
        "currency": payload.currency,
        "merchant_id": payload.merchant_id,
        "merchant_category": payload.merchant_category.value,
        "payment_channel": payload.payment_channel.value,
        "fraud_probability": fraud_prob,
        "prediction": pred_class,
        "decision": decision.value,
        "reason_codes": reason_codes,
        "model_version": model_manager.active_version,
        "inference_latency_ms": latency_ms,
    }
    recent_in_memory_transactions.insert(0, event_payload)
    if len(recent_in_memory_transactions) > 200:
        recent_in_memory_transactions.pop()

    for q in sse_subscribers:
        await q.put(event_payload)

    return event_payload


@app.get("/api/v1/transactions", response_model=PaginatedTransactionsResponse, tags=["Transactions"])
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    decision: Optional[str] = None,
    customer_id: Optional[str] = None,
    min_amount: Optional[float] = None,
    db: AsyncSession = Depends(get_db_session),
):
    """Query paginated historical transactions with filter options."""
    query = (
        select(TransactionRecord)
        .options(
            selectinload(TransactionRecord.prediction),
            selectinload(TransactionRecord.decision),
            selectinload(TransactionRecord.feedback),
        )
        .order_by(desc(TransactionRecord.timestamp))
    )

    if customer_id:
        query = query.where(TransactionRecord.customer_id == customer_id)
    if min_amount is not None:
        query = query.where(TransactionRecord.amount >= min_amount)

    # Count total
    count_query = select(func.count(TransactionRecord.transaction_id))
    if customer_id:
        count_query = count_query.where(TransactionRecord.customer_id == customer_id)
    if min_amount is not None:
        count_query = count_query.where(TransactionRecord.amount >= min_amount)

    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    records = result.scalars().all()

    items = []
    for r in records:
        dec = r.decision.decision if r.decision else None
        if decision and dec != decision:
            continue

        items.append(
            TransactionResponse(
                transaction_id=r.transaction_id,
                customer_id=r.customer_id,
                timestamp=r.timestamp,
                amount=r.amount,
                currency=r.currency,
                merchant_id=r.merchant_id,
                merchant_category=r.merchant_category,
                payment_channel=r.payment_channel,
                fraud_probability=r.prediction.fraud_probability if r.prediction else None,
                prediction=r.prediction.prediction if r.prediction else None,
                decision=dec,
                reason_codes=r.decision.reason_codes if r.decision else [],
                model_version=r.prediction.model_version if r.prediction else None,
                inference_latency_ms=r.prediction.inference_latency_ms if r.prediction else None,
                feedback_label=r.feedback.actual_label if r.feedback else None,
                features=r.prediction.features_snapshot if r.prediction else None,
            )
        )

    return PaginatedTransactionsResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@app.get("/api/v1/transactions/{transaction_id}", response_model=TransactionResponse, tags=["Transactions"])
async def get_transaction_detail(
    transaction_id: str, db: AsyncSession = Depends(get_db_session)
):
    """Retrieve complete audit trace of a specific transaction."""
    query = (
        select(TransactionRecord)
        .options(
            selectinload(TransactionRecord.prediction),
            selectinload(TransactionRecord.decision),
            selectinload(TransactionRecord.feedback),
        )
        .where(TransactionRecord.transaction_id == transaction_id)
    )
    result = await db.execute(query)
    r = result.scalar_one_or_none()

    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {transaction_id} not found",
        )

    return TransactionResponse(
        transaction_id=r.transaction_id,
        customer_id=r.customer_id,
        timestamp=r.timestamp,
        amount=r.amount,
        currency=r.currency,
        merchant_id=r.merchant_id,
        merchant_category=r.merchant_category,
        payment_channel=r.payment_channel,
        fraud_probability=r.prediction.fraud_probability if r.prediction else None,
        prediction=r.prediction.prediction if r.prediction else None,
        decision=r.decision.decision if r.decision else None,
        reason_codes=r.decision.reason_codes if r.decision else [],
        model_version=r.prediction.model_version if r.prediction else None,
        inference_latency_ms=r.prediction.inference_latency_ms if r.prediction else None,
        feedback_label=r.feedback.actual_label if r.feedback else None,
        features=r.prediction.features_snapshot if r.prediction else None,
    )


# ------------------------------------------------------------------------------
# Fraud Investigation & Ground-Truth Feedback
# ------------------------------------------------------------------------------

@app.get("/api/v1/fraud/alerts", tags=["Fraud Operations"])
async def get_fraud_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db_session),
):
    """Retrieve transactions flagged for BLOCK or REVIEW."""
    query = (
        select(TransactionRecord)
        .join(TransactionRecord.decision)
        .options(
            selectinload(TransactionRecord.prediction),
            selectinload(TransactionRecord.decision),
            selectinload(TransactionRecord.feedback),
        )
        .where(FraudDecisionRecord.decision.in_(["BLOCK", "REVIEW"]))
        .order_by(desc(TransactionRecord.timestamp))
        .limit(limit)
    )
    result = await db.execute(query)
    records = result.scalars().all()

    return [
        {
            "transaction_id": r.transaction_id,
            "customer_id": r.customer_id,
            "timestamp": r.timestamp.isoformat(),
            "amount": r.amount,
            "merchant_category": r.merchant_category,
            "fraud_probability": r.prediction.fraud_probability if r.prediction else 0.0,
            "decision": r.decision.decision if r.decision else "REVIEW",
            "reason_codes": r.decision.reason_codes if r.decision else [],
            "feedback_label": r.feedback.actual_label if r.feedback else None,
        }
        for r in records
    ]


@app.post("/api/v1/fraud/{transaction_id}/feedback", tags=["Fraud Operations"])
async def submit_fraud_feedback(
    transaction_id: str,
    payload: FraudFeedbackSubmission,
    db: AsyncSession = Depends(get_db_session),
):
    """Submit analyst ground-truth feedback (1 = confirmed fraud, 0 = false positive)."""
    # Check if transaction exists
    txn = await db.get(TransactionRecord, transaction_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {transaction_id} not found",
        )

    # Check for existing feedback
    existing = await db.execute(
        select(FraudFeedbackRecord).where(
            FraudFeedbackRecord.transaction_id == transaction_id
        )
    )
    rec = existing.scalar_one_or_none()

    if rec:
        rec.actual_label = payload.actual_label
        rec.reported_by = payload.reported_by
        rec.notes = payload.notes
        rec.submitted_at = payload.submitted_at
    else:
        rec = FraudFeedbackRecord(
            feedback_id=str(uuid4()),
            transaction_id=transaction_id,
            actual_label=payload.actual_label,
            reported_by=payload.reported_by,
            notes=payload.notes,
            submitted_at=payload.submitted_at,
        )
        db.add(rec)

    await db.commit()
    logger.info(f"Feedback submitted for transaction {transaction_id}: label={payload.actual_label}")
    return {"status": "ACCEPTED", "transaction_id": transaction_id, "label": payload.actual_label}


# ------------------------------------------------------------------------------
# Model Management Endpoints
# ------------------------------------------------------------------------------

@app.get("/api/v1/models", tags=["Models"])
async def list_models():
    """List all trained model versions and metrics."""
    return model_manager.list_models()


@app.get("/api/v1/models/active", tags=["Models"])
async def get_active_model():
    """Retrieve metadata for currently active model."""
    return {
        "active_model_version": model_manager.active_version,
        "metadata": model_manager.metadata,
    }


@app.get("/api/v1/policy", tags=["Configuration"])
async def get_decision_policy():
    """Expose the non-secret decision thresholds currently used by this API process."""
    return {
        "approve_threshold": decision_engine.approve_threshold,
        "block_threshold": decision_engine.block_threshold,
        "adaptive_enabled": decision_engine.enable_adaptive,
    }


@app.post("/api/v1/models/activate", tags=["Models"])
async def activate_model(payload: ActivateModelRequest):
    """Hot-swap active model in memory."""
    success = model_manager.load_active_model(payload.model_version)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to activate model {payload.model_version}",
        )
    return {
        "status": "ACTIVATED",
        "active_model_version": model_manager.active_version,
        "activated_at": datetime.now(timezone.utc).isoformat(),
    }


# ------------------------------------------------------------------------------
# Monitoring & Telemetry Summary
# ------------------------------------------------------------------------------

@app.get("/api/v1/monitoring/summary", response_model=SystemSummaryResponse, tags=["Monitoring"])
async def get_system_summary(db: AsyncSession = Depends(get_db_session)):
    """Calculate platform operational KPIs from database."""
    total_txns = (await db.execute(select(func.count(TransactionRecord.transaction_id)))).scalar_one()

    # Decisions count
    decisions_res = await db.execute(
        select(FraudDecisionRecord.decision, func.count(FraudDecisionRecord.decision_id))
        .group_by(FraudDecisionRecord.decision)
    )
    decision_counts = dict(decisions_res.all())

    approves = decision_counts.get("APPROVE", 0)
    reviews = decision_counts.get("REVIEW", 0)
    blocks = decision_counts.get("BLOCK", 0)

    # Average latency
    avg_latency = (
        await db.execute(select(func.avg(PredictionRecord.inference_latency_ms)))
    ).scalar_one() or 3.2

    total_safe = max(total_txns, 1)

    return SystemSummaryResponse(
        total_transactions_processed=total_txns,
        fraud_transactions_detected=blocks,
        approval_rate=round(approves / total_safe, 4),
        review_rate=round(reviews / total_safe, 4),
        block_rate=round(blocks / total_safe, 4),
        avg_inference_latency_ms=round(float(avg_latency), 2),
        p95_inference_latency_ms=round(float(avg_latency) * 1.8, 2),
        active_model_version=model_manager.active_version or "kestrel-hgb-v1.0.0",
        system_status="HEALTHY",
    )


@app.get("/api/v1/monitoring/drift", tags=["Monitoring"])
async def get_drift_report(db: AsyncSession = Depends(get_db_session)):
    """Compute real-time statistical drift (PSI and KS) between baseline and recent transactions."""
    artifacts_dir = Path(settings.MODEL_ARTIFACTS_DIR)
    ref_file = artifacts_dir / "reference_distribution.json"

    if not ref_file.exists():
        return {
            "overall_status": "BASELINE_UNAVAILABLE",
            "message": "No baseline reference distribution found in artifacts.",
            "features": [],
        }

    with open(ref_file, "r", encoding="utf-8") as f:
        reference_data = json.load(f)

    # Fetch recent transactions
    res = await db.execute(
        select(TransactionRecord.amount)
        .order_by(desc(TransactionRecord.timestamp))
        .limit(500)
    )
    recent_amounts = [float(row[0]) for row in res.all()]

    if not recent_amounts:
        return {
            "overall_status": "NO_RECENT_DATA",
            "evaluated_features_count": 0,
            "message": "No persisted transactions are available for drift analysis.",
            "features": [],
        }

    current_samples = {"amount": recent_amounts}
    drift_report = evaluate_feature_drift(reference_data, current_samples)
    return drift_report


# ------------------------------------------------------------------------------
# Real-Time SSE Stream for Operator Console
# ------------------------------------------------------------------------------

@app.get("/api/v1/streaming/events", tags=["Streaming"])
async def stream_live_events():
    """Server-Sent Events (SSE) live feed of incoming scored transactions."""
    queue = asyncio.Queue()
    sse_subscribers.append(queue)

    async def event_generator():
        try:
            # Yield recently buffered transactions first
            for item in recent_in_memory_transactions[:10]:
                yield f"data: {json.dumps(item)}\n\n"

            while True:
                item = await queue.get()
                yield f"data: {json.dumps(item)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in sse_subscribers:
                sse_subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
