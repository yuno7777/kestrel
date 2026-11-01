"""Kestrel Central Platform Configuration Management."""

from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class KestrelSettings(BaseSettings):
    """Central configuration for Kestrel platform services."""

    # Environment
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = False

    # Kafka Broker
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_RAW_TOPIC: str = "transactions.raw"
    KAFKA_SCORED_TOPIC: str = "transactions.scored"
    KAFKA_FRAUD_TOPIC: str = "transactions.fraud"
    KAFKA_REVIEW_TOPIC: str = "transactions.review"
    KAFKA_DLQ_TOPIC: str = "transactions.dlq"
    KAFKA_CONSUMER_GROUP: str = "kestrel-stream-processor-cg"
    KAFKA_PERSISTENCE_GROUP: str = "kestrel-persistence-worker-cg"

    # Redis Feature Store
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_TIMEOUT_SECONDS: float = 2.0

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./kestrel.db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # API & Inference Service
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_WORKERS: int = 1
    INFERENCE_URL: str = "http://localhost:8000/api/v1/predict"

    # Machine Learning Models
    ACTIVE_MODEL_VERSION: str = "kestrel-hgb-v1.0.0"
    MODEL_ARTIFACTS_DIR: str = "./ml/artifacts"

    # Decision Engine Thresholds
    THRESHOLD_APPROVE_MAX: float = 0.30
    THRESHOLD_BLOCK_MIN: float = 0.75

    # Transaction Generator Settings
    GENERATOR_DEFAULT_TPS: int = 15
    GENERATOR_FRAUD_RATIO: float = 0.02
    GENERATOR_SEED: int = 42

    # Monitoring & Prometheus
    PROMETHEUS_METRICS_ENABLED: bool = True
    PROMETHEUS_PORT: int = 9090

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Singleton instance
settings = KestrelSettings()
