"""GPU-accelerated training pipeline for Kestrel fraud models using NVIDIA CUDA.

Hardware Target: NVIDIA GeForce RTX 4060 Laptop GPU (8GB VRAM)
Frameworks:
- XGBoost 3.4.1 (tree_method='hist', device='cuda')
- CatBoost 1.2.10 (task_type='GPU')
"""

import json
import os
import time
from pathlib import Path
from typing import Dict, Any
import catboost as cb
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import xgboost as xgb

from ml.data.ieee_loader import IEEECISDataLoader
from ml.evaluation.scenario_benchmark import run_comprehensive_scenario_benchmark


class GPUAdaptiveDecisionPolicy:
    """Computes slice-adaptive decision thresholds calibrated for GPU XGBoost score distribution."""

    def __init__(
        self,
        base_threshold: float = 0.22,
        web_retail_threshold: float = 0.15,
        web_guest_threshold: float = 0.12,
        guest_checkout_threshold: float = 0.14,
        debit_threshold: float = 0.18,
        whale_threshold: float = 0.40,
    ):
        self.base_threshold = base_threshold
        self.web_retail_threshold = web_retail_threshold
        self.web_guest_threshold = web_guest_threshold
        self.guest_checkout_threshold = guest_checkout_threshold
        self.debit_threshold = debit_threshold
        self.whale_threshold = whale_threshold

    def compute_thresholds(self, df: pd.DataFrame) -> np.ndarray:
        """Compute optimal decision cutoff for each individual transaction."""
        thresholds = np.full(len(df), self.base_threshold, dtype=float)

        amt = df["TransactionAmt"].values if "TransactionAmt" in df.columns else np.zeros(len(df))
        prod = df["ProductCD"].values if "ProductCD" in df.columns else np.empty(len(df), dtype=object)
        email = df["p_email_group"].values if "p_email_group" in df.columns else np.empty(len(df), dtype=object)
        card = df["card6"].values if "card6" in df.columns else np.empty(len(df), dtype=object)

        for i in range(len(df)):
            t = self.base_threshold
            p = prod[i]
            em = email[i]
            c = card[i]
            a = amt[i]

            if p == "W":
                if em == "missing":
                    t = self.web_guest_threshold
                else:
                    t = self.web_retail_threshold
            elif em == "missing":
                t = self.guest_checkout_threshold
            elif c == "debit":
                t = self.debit_threshold

            if a > 1000:
                t = self.whale_threshold

            thresholds[i] = t

        return thresholds


def train_gpu_models(
    data_path: str = "data/ieee_cis_fraud.csv",
    artifacts_dir: str = "ml/artifacts/kestrel-gpu-v1.0.0",
    seed: int = 42,
) -> Dict[str, Any]:
    print("=" * 80)
    print("  KESTREL FRAUD PLATFORM - GPU-ACCELERATED MODEL TRAINING & BENCHMARK")
    print("  HARDWARE TARGET: NVIDIA GeForce RTX 4060 Laptop GPU (CUDA)")
    print("=" * 80)

    # 1. Load data with full engineered signals
    loader = IEEECISDataLoader(data_path=data_path)
    X, y, num_cols, cat_cols = loader.load_and_preprocess(engineer_weak_signals=True)

    # Stratified Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=seed, stratify=y
    )
    print(f"[*] Train set: {len(X_train)} | Test set: {len(X_test)}")

    # 2. Slice-Focused Sample Weighting
    pos_weight = float((y_train == 0).sum() / max((y_train == 1).sum(), 1))
    train_weights = np.ones(len(y_train), dtype=float)
    train_weights[y_train == 1] = pos_weight
    # Reinforce historically weak slices
    w_fraud_mask = (X_train["ProductCD"] == "W") & (y_train == 1)
    train_weights[w_fraud_mask] *= 1.35
    guest_fraud_mask = (X_train["p_email_group"] == "missing") & (y_train == 1)
    train_weights[guest_fraud_mask] *= 1.25

    # 3. Preprocessing
    print("[*] Preprocessing features for GPU ingestion...")
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ],
        remainder="drop",
    )
    X_train_trans = preprocessor.fit_transform(X_train).astype(np.float32)
    X_test_trans = preprocessor.transform(X_test).astype(np.float32)
    print(f"[+] Feature matrix shape: {X_train_trans.shape} (float32 optimized for CUDA)")

    # 4. GPU Model Suite Definition
    gpu_models = {
        "kestrel-gpu-xgboost": xgb.XGBClassifier(
            n_estimators=300,
            max_depth=9,
            learning_rate=0.06,
            subsample=0.85,
            colsample_bytree=0.85,
            tree_method="hist",
            device="cuda",
            random_state=seed,
            eval_metric="aucpr",
        ),
        "kestrel-gpu-catboost": cb.CatBoostClassifier(
            iterations=350,
            depth=8,
            learning_rate=0.06,
            task_type="GPU",
            random_seed=seed,
            verbose=0,
            eval_metric="PRAUC",
        ),
    }

    results = {}
    best_pr_auc = -1.0
    champion_id = "kestrel-gpu-xgboost"
    champion_model = None

    os.makedirs(artifacts_dir, exist_ok=True)

    for model_id, model in gpu_models.items():
        print(f"\n[*] Training {model_id} on NVIDIA CUDA GPU...")
        start_time = time.perf_counter()

        if isinstance(model, xgb.XGBClassifier):
            model.fit(X_train_trans, y_train, sample_weight=train_weights)
        elif isinstance(model, cb.CatBoostClassifier):
            model.fit(X_train_trans, y_train, sample_weight=train_weights)

        train_time = round(time.perf_counter() - start_time, 2)
        print(f"[+] GPU Training completed in {train_time}s")

        # Evaluate on test set
        y_prob = model.predict_proba(X_test_trans)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        roc_auc = float(roc_auc_score(y_test, y_prob))
        pr_auc = float(average_precision_score(y_test, y_prob))
        precision = float(precision_score(y_test, y_pred, zero_division=0))
        recall = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))

        print(f"    Train Time: {train_time}s (GPU accelerated)")
        print(f"    PR-AUC:     {pr_auc:.4f}")
        print(f"    ROC-AUC:    {roc_auc:.4f}")
        print(f"    Precision:  {precision:.4f} | Recall: {recall:.4f} | F1: {f1:.4f}")

        results[model_id] = {
            "model_id": model_id,
            "device": "NVIDIA GeForce RTX 4060 Laptop GPU (CUDA)",
            "train_time_sec": train_time,
            "test_pr_auc": round(pr_auc, 4),
            "test_roc_auc": round(roc_auc, 4),
            "test_precision": round(precision, 4),
            "test_recall": round(recall, 4),
            "test_f1": round(f1, 4),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        }

        if pr_auc > best_pr_auc:
            best_pr_auc = pr_auc
            champion_id = model_id
            champion_model = model

    print(f"\n[+] Champion GPU Model Selected: {champion_id} (PR-AUC: {best_pr_auc:.4f})")

    # 5. Apply Slice-Adaptive Decision Policy to GPU Champion
    policy = GPUAdaptiveDecisionPolicy()
    adaptive_thresholds = policy.compute_thresholds(X_test)

    champion_probs = champion_model.predict_proba(X_test_trans)[:, 1]

    # Benchmark: Standard 0.50 Threshold
    bench_std = run_comprehensive_scenario_benchmark(
        df_test=X_test,
        y_test=y_test.values,
        y_prob=champion_probs,
        threshold=0.50,
    )

    # Benchmark: Adaptive Calibrated Policy
    bench_adaptive = run_comprehensive_scenario_benchmark(
        df_test=X_test,
        y_test=y_test.values,
        y_prob=champion_probs,
        threshold=adaptive_thresholds,
    )

    # Print summary table
    print("\n" + "=" * 90)
    print(f"  GPU CHAMPION ({champion_id}) ADAPTIVE SCENARIO BENCHMARK RESULTS")
    print("=" * 90)
    print(f"{'Scenario Slice':<35} | {'Count':<6} | {'Fraud%':<6} | {'Recall':<7} | {'Prec':<7} | {'F1':<7} | {'Status'}")
    print("-" * 90)
    for slice_key, sc in bench_adaptive.items():
        print(f"{sc['slice_name']:<35} | {sc['total_count']:<6} | {sc['fraud_rate']*100:>5.1f}% | {sc['recall']*100:>6.1f}% | {sc['precision']*100:>6.1f}% | {sc['f1']*100:>6.1f}% | {sc['status']}")
    print("=" * 90)

    # 6. Save Artifacts
    joblib.dump(champion_model, os.path.join(artifacts_dir, "model.joblib"))
    joblib.dump(preprocessor, os.path.join(artifacts_dir, "pipeline.joblib"))

    with open(os.path.join(artifacts_dir, "models_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    with open(os.path.join(artifacts_dir, "scenario_benchmark_adaptive.json"), "w", encoding="utf-8") as f:
        json.dump(bench_adaptive, f, indent=2)

    with open(os.path.join(artifacts_dir, "scenario_benchmark_standard.json"), "w", encoding="utf-8") as f:
        json.dump(bench_std, f, indent=2)

    metrics_card = {
        "model_id": champion_id,
        "device": "NVIDIA GeForce RTX 4060 Laptop GPU (CUDA)",
        "algorithm": type(champion_model).__name__,
        "dataset": "IEEE-CIS Real-World Fraud Telemetry (59,054 transactions)",
        "features_count": X_train_trans.shape[1],
        "test_roc_auc": round(float(roc_auc_score(y_test, champion_probs)), 4),
        "test_pr_auc": round(best_pr_auc, 4),
        "train_time_sec": results[champion_id]["train_time_sec"],
        "test_precision": bench_std["overall"]["precision"],
        "test_recall": bench_std["overall"]["recall"],
        "test_f1": bench_std["overall"]["f1"],
        "adaptive_test_recall": bench_adaptive["overall"]["recall"],
        "adaptive_test_precision": bench_adaptive["overall"]["precision"],
        "adaptive_test_f1": bench_adaptive["overall"]["f1"],
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(os.path.join(artifacts_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_card, f, indent=2)

    print(f"\n[+] GPU model artifacts saved successfully to {artifacts_dir}")
    return results


if __name__ == "__main__":
    train_gpu_models()
