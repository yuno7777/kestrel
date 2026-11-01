"""Training and evaluation pipeline for Kestrel fraud detection models."""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier, IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
)
from sklearn.model_selection import train_test_split

from ml.data.generator import SyntheticTransactionGenerator
from ml.features.pipeline import KestrelFeaturePipeline, ALL_FEATURE_COLUMNS


def train_and_evaluate(
    num_records: int = 25000,
    fraud_ratio: float = 0.025,
    seed: int = 42,
    artifacts_dir: str = "ml/artifacts",
) -> Dict[str, Any]:
    """Train portfolio of models, evaluate performance, and serialize champion model."""
    print(f"[*] Generating {num_records} synthetic transactions (fraud ratio: {fraud_ratio:.1%})...")
    gen = SyntheticTransactionGenerator(seed=seed)
    df = gen.generate_dataset(num_records=num_records, fraud_ratio=fraud_ratio)

    fraud_count = int(df["is_fraud"].sum())
    legit_count = len(df) - fraud_count
    print(f"[*] Dataset generated: {len(df)} total ({legit_count} legit, {fraud_count} fraud - {fraud_count/len(df):.2%})")

    # Split train and test (stratified)
    X = df[ALL_FEATURE_COLUMNS]
    y = df["is_fraud"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=seed, stratify=y
    )

    print(f"[*] Training feature pipeline...")
    pipeline = KestrelFeaturePipeline()
    X_train_trans = pipeline.fit_transform(X_train)
    X_test_trans = pipeline.transform(X_test)

    # Models to benchmark
    models = {
        "kestrel-hgb-v1.0.0": HistGradientBoostingClassifier(
            class_weight="balanced",
            max_iter=150,
            learning_rate=0.08,
            max_depth=7,
            random_state=seed,
        ),
        "kestrel-rf-v1.0.0": RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            class_weight="balanced",
            n_jobs=-1,
            random_state=seed,
        ),
        "kestrel-lr-v1.0.0": LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            random_state=seed,
        ),
    }

    results = {}
    best_pr_auc = -1.0
    champion_id = "kestrel-hgb-v1.0.0"

    os.makedirs(artifacts_dir, exist_ok=True)

    for model_id, model in models.items():
        print(f"[*] Training {model_id}...")
        model.fit(X_train_trans, y_train)

        # Predict probabilities
        y_prob = model.predict_proba(X_test_trans)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        roc_auc = float(roc_auc_score(y_test, y_prob))
        pr_auc = float(average_precision_score(y_test, y_prob))
        precision = float(precision_score(y_test, y_pred, zero_division=0))
        recall = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist()

        # Threshold curve analysis
        precisions, recalls, thresholds = precision_recall_curve(y_test, y_prob)
        threshold_analysis = []
        for t in [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.85]:
            t_pred = (y_prob >= t).astype(int)
            threshold_analysis.append(
                {
                    "threshold": t,
                    "precision": round(float(precision_score(y_test, t_pred, zero_division=0)), 4),
                    "recall": round(float(recall_score(y_test, t_pred, zero_division=0)), 4),
                    "f1": round(float(f1_score(y_test, t_pred, zero_division=0)), 4),
                }
            )

        metrics = {
            "model_id": model_id,
            "algorithm": type(model).__name__,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "test_roc_auc": round(roc_auc, 4),
            "test_pr_auc": round(pr_auc, 4),
            "test_precision": round(precision, 4),
            "test_recall": round(recall, 4),
            "test_f1": round(f1, 4),
            "confusion_matrix": cm,
            "threshold_analysis": threshold_analysis,
        }

        results[model_id] = metrics
        print(f"    -> PR-AUC: {pr_auc:.4f} | ROC-AUC: {roc_auc:.4f} | F1: {f1:.4f} | Recall: {recall:.4f}")

        # Save artifact directory
        model_dir = Path(artifacts_dir) / model_id
        model_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, model_dir / "model.joblib")
        joblib.dump(pipeline, model_dir / "pipeline.joblib")

        with open(model_dir / "metrics.json", "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=2)

        if pr_auc > best_pr_auc:
            best_pr_auc = pr_auc
            champion_id = model_id

    # Train Unsupervised Isolation Forest for anomaly comparison
    print(f"[*] Training unsupervised Isolation Forest...")
    iso = IsolationForest(contamination=fraud_ratio, random_state=seed, n_jobs=-1)
    # Fit only on legitimate samples in training set to simulate normal profile learning
    legit_X_train = X_train_trans[y_train == 0]
    iso.fit(legit_X_train)
    iso_scores = -iso.score_samples(X_test_trans)  # higher = more anomalous
    iso_roc = float(roc_auc_score(y_test, iso_scores))
    iso_pr = float(average_precision_score(y_test, iso_scores))
    iso_metrics = {
        "model_id": "kestrel-isolation-forest-v1.0.0",
        "algorithm": "IsolationForest",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "test_roc_auc": round(iso_roc, 4),
        "test_pr_auc": round(iso_pr, 4),
    }
    results["kestrel-isolation-forest-v1.0.0"] = iso_metrics
    iso_dir = Path(artifacts_dir) / "kestrel-isolation-forest-v1.0.0"
    iso_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(iso, iso_dir / "model.joblib")
    joblib.dump(pipeline, iso_dir / "pipeline.joblib")
    with open(iso_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(iso_metrics, f, indent=2)

    # Save active model pointer
    active_manifest = {
        "active_model_version": champion_id,
        "activated_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": results[champion_id]["algorithm"],
        "pr_auc": results[champion_id]["test_pr_auc"],
        "roc_auc": results[champion_id]["test_roc_auc"],
    }
    with open(Path(artifacts_dir) / "active_model.json", "w", encoding="utf-8") as f:
        json.dump(active_manifest, f, indent=2)

    # Save reference distribution for drift monitoring baseline
    reference_data = {
        "baseline_generated_at": datetime.now(timezone.utc).isoformat(),
        "sample_count": len(X_train),
        "numerical_means": X_train.select_dtypes(include=[np.number]).mean().to_dict(),
        "numerical_stds": X_train.select_dtypes(include=[np.number]).std().to_dict(),
        "quantiles": {
            col: X_train[col].quantile([0.1, 0.25, 0.5, 0.75, 0.9]).to_dict()
            for col in X_train.select_dtypes(include=[np.number]).columns
        },
    }
    with open(Path(artifacts_dir) / "reference_distribution.json", "w", encoding="utf-8") as f:
        json.dump(reference_data, f, indent=2)

    print(f"\n[+] Training complete! Champion model selected: {champion_id} (PR-AUC: {best_pr_auc:.4f})")
    print(f"[+] All versioned artifacts and reference distributions saved to: {artifacts_dir}")
    return results


if __name__ == "__main__":
    train_and_evaluate()
