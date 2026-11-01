"""Prometheus telemetry and instrumentation for Kestrel."""

from prometheus_client import Counter, Histogram, Gauge

# Counters
TRANSACTIONS_RECEIVED = Counter(
    "fraud_transactions_received_total",
    "Total raw financial transaction events ingested",
    ["channel"],
)

TRANSACTIONS_PROCESSED = Counter(
    "fraud_transactions_processed_total",
    "Total transactions scored and routed",
    ["decision"],
)

DLQ_MESSAGES = Counter(
    "fraud_dlq_messages_total",
    "Total malformed messages routed to Dead Letter Queue",
    ["reason"],
)

# Histograms
INFERENCE_LATENCY = Histogram(
    "fraud_inference_latency_seconds",
    "Model inference latency in seconds",
    ["model_version"],
    buckets=(0.001, 0.002, 0.005, 0.010, 0.025, 0.050, 0.100),
)

FRAUD_PROBABILITY_HISTOGRAM = Histogram(
    "fraud_probability_distribution",
    "Distribution of scored fraud probabilities",
    ["model_version"],
    buckets=(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.85, 0.95, 1.0),
)

# Gauges
CONSUMER_LAG = Gauge(
    "kafka_consumer_lag",
    "Unread messages remaining in Kafka partition",
    ["topic", "partition"],
)

ACTIVE_MODEL_GAUGE = Gauge(
    "kestrel_active_model_info",
    "Information on current production model version",
    ["model_version", "algorithm"],
)
