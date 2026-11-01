"""Model lifecycle manager, artifact caching, and inference execution."""

import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import joblib
import numpy as np

from kestrel_common.config import settings
from kestrel_common.logging import get_logger
from kestrel_common.schemas import TransactionFeatures

logger = get_logger("kestrel.model_manager")


class ModelManager:
    """Manages active ML model artifacts, hot-swapping, and scoring execution."""

    def __init__(self, artifacts_dir: Optional[str] = None):
        self.artifacts_dir = Path(artifacts_dir or settings.MODEL_ARTIFACTS_DIR)
        self.active_version: Optional[str] = None
        self.model: Optional[Any] = None
        self.pipeline: Optional[Any] = None
        self.metadata: Dict[str, Any] = {}
        self.available_models: List[str] = []

    def load_active_model(self, version: Optional[str] = None) -> bool:
        """Load specified or default active model into memory."""
        try:
            if version is None:
                manifest_path = self.artifacts_dir / "active_model.json"
                if manifest_path.exists():
                    with open(manifest_path, "r", encoding="utf-8") as f:
                        manifest = json.load(f)
                        version = manifest.get("active_model_version")

            if not version:
                version = settings.ACTIVE_MODEL_VERSION

            model_dir = self.artifacts_dir / version
            model_path = model_dir / "model.joblib"
            pipeline_path = model_dir / "pipeline.joblib"

            if not model_path.exists() or not pipeline_path.exists():
                logger.warning(f"Model artifact not found at {model_dir}. Falling back to discovery.")
                # Discover first available directory in artifacts
                candidates = [
                    d.name
                    for d in self.artifacts_dir.iterdir()
                    if d.is_dir() and (d / "model.joblib").exists()
                ]
                if candidates:
                    version = candidates[0]
                    model_dir = self.artifacts_dir / version
                    model_path = model_dir / "model.joblib"
                    pipeline_path = model_dir / "pipeline.joblib"
                else:
                    logger.error("No model artifacts found in artifacts directory.")
                    return False

            logger.info(f"Loading model artifact: {version} from {model_dir}")
            self.model = joblib.load(model_path)
            self.pipeline = joblib.load(pipeline_path)
            self.active_version = version

            # Load metrics/metadata if available
            metrics_path = model_dir / "metrics.json"
            if metrics_path.exists():
                with open(metrics_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)

            # Discover all available versions
            self.available_models = [
                d.name
                for d in self.artifacts_dir.iterdir()
                if d.is_dir() and (d / "model.joblib").exists()
            ]

            logger.info(f"Model {version} successfully loaded and validated.")
            return True

        except Exception as e:
            logger.error(f"Failed to load model {version}: {e}", exc_info=True)
            return False

    def predict(
        self,
        features: TransactionFeatures,
        merchant_category: str = "retail",
        payment_channel: str = "online",
    ) -> Tuple[float, int, float]:
        """Execute single-sample inference and return (fraud_probability, prediction_class, latency_ms)."""
        if self.model is None or self.pipeline is None:
            raise RuntimeError("No active ML model loaded.")

        start_time = time.perf_counter()

        # Build feature dict
        feat_dict = features.model_dump()
        feat_dict["merchant_category"] = merchant_category
        feat_dict["payment_channel"] = payment_channel

        # Transform vector
        X_trans = self.pipeline.transform(feat_dict)

        # Scikit-learn inference
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X_trans)[0]
            # Fraud probability is class index 1
            fraud_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            pred_class = 1 if fraud_prob >= 0.5 else 0
        elif hasattr(self.model, "score_samples"):
            # Isolation forest anomaly score mapping
            score = -float(self.model.score_samples(X_trans)[0])
            fraud_prob = float(1.0 / (1.0 + np.exp(-score * 5.0)))
            pred_class = 1 if fraud_prob >= 0.5 else 0
        else:
            pred_class = int(self.model.predict(X_trans)[0])
            fraud_prob = float(pred_class)

        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 3)
        return round(fraud_prob, 4), pred_class, latency_ms

    def list_models(self) -> List[Dict[str, Any]]:
        """List all discovered model versions with metrics."""
        models_info = []
        for name in self.available_models:
            model_dir = self.artifacts_dir / name
            metrics_path = model_dir / "metrics.json"
            info = {
                "model_id": name,
                "is_active": (name == self.active_version),
            }
            if metrics_path.exists():
                try:
                    with open(metrics_path, "r", encoding="utf-8") as f:
                        info.update(json.load(f))
                except Exception:
                    pass
            models_info.append(info)
        return models_info


# Singleton manager
model_manager = ModelManager()
