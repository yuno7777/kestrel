"""Improve real-world fraud detection model targeting previously diagnosed weak scenarios.

Weak scenarios identified in baseline benchmark:
1. ProductCD 'W' (Standard Web/Retail eCommerce, 74% volume): 48.3% recall (missed 51.7% of fraud).
2. Email Group 'missing' (Guest checkout): 54.1% recall.
3. Card Type 'Debit': 61.5% recall (vs 79.5% on Credit).
4. Whale Transactions (> $1,000): 10.0% precision (90% false positive alert rate).

Improvements applied:
- Feature Engineering: Card-relative amount z-score, web round cents interaction, micro-velocity density, guest web interactions.
- Slice-Weighted Tree Learning: Higher loss weight penalization on historically elusive retail and guest fraud.
- Slice-Adaptive Decision Engine: Context-sensitive decision boundaries calibrated to slice-specific risk curves.
"""

import json
import os
import time
from pathlib import Path
from typing import Dict, Any, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
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

from ml.data.ieee_loader import IEEECISDataLoader
from ml.evaluation.scenario_benchmark import run_comprehensive_scenario_benchmark


class AdaptiveDecisionPolicy:
    """Computes slice-adaptive decision thresholds calibrated for operational fraud risk."""

    def __init__(
        self,
        base_threshold: float = 0.50,
        web_retail_threshold: float = 0.38,
        web_guest_threshold: float = 0.35,
        guest_checkout_threshold: float = 0.40,
        debit_threshold: float = 0.44,
        whale_threshold: float = 0.60,
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

            # Slice 1: Web eCommerce (ProductCD 'W')
            if p == "W":
                if em == "missing":
                    t = self.web_guest_threshold
                else:
                    t = self.web_retail_threshold
            elif em == "missing":
                t = self.guest_checkout_threshold
            elif c == "debit":
                t = self.debit_threshold

            # Slice 2: Whale Transactions (> $1,000) - protect high-value customers from FP friction
            if a > 1000:
                t = self.whale_threshold

            thresholds[i] = t

        return thresholds


def train_improved_model(
    data_path: str = "data/ieee_cis_fraud.csv",
    output_dir: str = "ml/artifacts/kestrel-realworld-improved-v1.0.0",
    baseline_benchmark_path: str = "ml/artifacts/realworld_baseline/scenario_benchmark.json",
    seed: int = 42,
) -> Dict[str, Any]:
    print("=" * 75)
    print("  KESTREL FRAUD PLATFORM - MODEL IMPROVEMENT & TARGETED OPTIMIZATION")
    print("=" * 75)

    # 1. Load data with targeted weak-signal feature engineering
    loader = IEEECISDataLoader(data_path=data_path)
    X, y, num_cols, cat_cols = loader.load_and_preprocess(engineer_weak_signals=True)

    # Stratified Train/Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=seed, stratify=y
    )

    # 2. Slice-Focused Sample Weighting
    # Boost loss gradient on historically underperforming retail and guest checkout fraud
    print("[*] Computing targeted sample weights for weak slices...")
    train_weights = np.ones(len(y_train), dtype=float)
    # Balanced base weights for fraud vs legit
    neg_weight = 1.0
    pos_weight = float((y_train == 0).sum() / max((y_train == 1).sum(), 1))
    train_weights[y_train == 1] = pos_weight

    # Extra reinforcement on ProductCD 'W' fraud
    w_fraud_mask = (X_train["ProductCD"] == "W") & (y_train == 1)
    train_weights[w_fraud_mask] *= 1.35

    # Extra reinforcement on Guest Checkout (missing email) fraud
    guest_fraud_mask = (X_train["p_email_group"] == "missing") & (y_train == 1)
    train_weights[guest_fraud_mask] *= 1.25

    print(f"[+] Sample weights generated. Pos/Neg ratio: {pos_weight:.1f}x. W-Fraud reinforced.")

    # 3. Fit preprocessing pipeline
    print("[*] Fitting preprocessing transformers on expanded feature space...")
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ],
        remainder="drop",
    )
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    print(f"[+] Encoded feature matrix shape: {X_train_trans.shape}")

    # 4. Train Tuned HistGradientBoostingClassifier
    print("[*] Training improved HistGradientBoosting model...")
    improved_model = HistGradientBoostingClassifier(
        max_iter=180,
        learning_rate=0.07,
        max_depth=9,
        min_samples_leaf=15,
        l2_regularization=0.6,
        random_state=seed,
    )

    start = time.perf_counter()
    improved_model.fit(X_train_trans, y_train, sample_weight=train_weights)
    train_time = round(time.perf_counter() - start, 2)
    print(f"[+] Training completed in {train_time}s")

    # 5. Evaluate on test set
    y_prob = improved_model.predict_proba(X_test_trans)[:, 1]
    overall_pr_auc = float(average_precision_score(y_test, y_prob))
    overall_roc_auc = float(roc_auc_score(y_test, y_prob))

    print(f"[*] Improved Model Overall PR-AUC:  {overall_pr_auc:.4f}")
    print(f"[*] Improved Model Overall ROC-AUC: {overall_roc_auc:.4f}")

    # 6. Apply Adaptive Decision Policy
    policy = AdaptiveDecisionPolicy()
    adaptive_thresholds = policy.compute_thresholds(X_test)

    # 7. Run Comprehensive Benchmark on:
    # A) Improved Model with standard 0.50 threshold
    bench_std_threshold = run_comprehensive_scenario_benchmark(
        df_test=X_test,
        y_test=y_test.values,
        y_prob=y_prob,
        threshold=0.50,
    )

    # B) Improved Model with Adaptive Policy
    bench_adaptive = run_comprehensive_scenario_benchmark(
        df_test=X_test,
        y_test=y_test.values,
        y_prob=y_prob,
        threshold=adaptive_thresholds,
    )

    # 8. Compare against Baseline
    baseline_bench = {}
    if os.path.exists(baseline_benchmark_path):
        with open(baseline_benchmark_path, "r", encoding="utf-8") as f:
            baseline_bench = json.load(f)

    # Generate head-to-head delta report
    comparison_report = {}
    print("\n" + "=" * 90)
    print("  HEAD-TO-HEAD SCENARIO BENCHMARK: BASELINE vs IMPROVED (ADAPTIVE)")
    print("=" * 90)
    print(
        f"{'Scenario Slice':<32} | {'Baseline Rec':<12} | {'Improved Rec':<12} | {'Recall Lift':<11} | {'Status Lift'}"
    )
    print("-" * 90)

    for slice_key, impr_sc in bench_adaptive.items():
        base_sc = baseline_bench.get(slice_key, {})
        base_recall = base_sc.get("recall", 0.0)
        impr_recall = impr_sc["recall"]
        rec_diff = impr_recall - base_recall
        rec_diff_str = f"{rec_diff*100:>+5.1f}%"

        base_status = base_sc.get("status", "N/A")
        impr_status = impr_sc["status"]
        status_lift = f"{base_status} -> {impr_status}" if base_status != impr_status else impr_status

        print(
            f"{impr_sc['slice_name']:<32} | {base_recall*100:>10.1f}% | {impr_recall*100:>10.1f}% | {rec_diff_str:>11} | {status_lift}"
        )

        comparison_report[slice_key] = {
            "slice_name": impr_sc["slice_name"],
            "total_count": impr_sc["total_count"],
            "fraud_count": impr_sc["fraud_count"],
            "baseline": {
                "recall": base_sc.get("recall", 0.0),
                "precision": base_sc.get("precision", 0.0),
                "f1": base_sc.get("f1", 0.0),
                "status": base_sc.get("status", "N/A"),
            },
            "improved_standard_50": {
                "recall": bench_std_threshold[slice_key]["recall"],
                "precision": bench_std_threshold[slice_key]["precision"],
                "f1": bench_std_threshold[slice_key]["f1"],
                "status": bench_std_threshold[slice_key]["status"],
            },
            "improved_adaptive": {
                "recall": impr_sc["recall"],
                "precision": impr_sc["precision"],
                "f1": impr_sc["f1"],
                "status": impr_sc["status"],
            },
            "recall_lift_pct_pts": round(rec_diff * 100, 2),
        }

    print("=" * 90)

    # 9. Save Artifacts
    os.makedirs(output_dir, exist_ok=True)
    joblib.dump(improved_model, os.path.join(output_dir, "model.joblib"))
    joblib.dump(preprocessor, os.path.join(output_dir, "pipeline.joblib"))

    with open(os.path.join(output_dir, "scenario_benchmark_adaptive.json"), "w", encoding="utf-8") as f:
        json.dump(bench_adaptive, f, indent=2)

    with open(os.path.join(output_dir, "scenario_benchmark_standard.json"), "w", encoding="utf-8") as f:
        json.dump(bench_std_threshold, f, indent=2)

    with open(os.path.join(output_dir, "improvement_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(comparison_report, f, indent=2)

    metadata = {
        "model_id": "kestrel-realworld-improved-v1.0.0",
        "dataset": "IEEE-CIS Fraud Detection (Real-World)",
        "algorithm": "HistGradientBoostingClassifier (Sample Weighted + Slice Calibrated)",
        "features_count": X_train_trans.shape[1],
        "test_roc_auc": round(overall_roc_auc, 4),
        "test_pr_auc": round(overall_pr_auc, 4),
        "overall_recall_adaptive": bench_adaptive["overall"]["recall"],
        "overall_precision_adaptive": bench_adaptive["overall"]["precision"],
        "overall_f1_adaptive": bench_adaptive["overall"]["f1"],
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(os.path.join(output_dir, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[+] Saved improved model and benchmarks to {output_dir}")
    return comparison_report


if __name__ == "__main__":
    train_improved_model()
