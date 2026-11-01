"""Train models on real-world IEEE-CIS dataset and generate scenario benchmark."""

import json
import os
import time
from pathlib import Path
from typing import Dict, Any
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
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


def train_realworld_models(
    data_path: str = "data/ieee_cis_fraud.csv",
    artifacts_dir: str = "ml/artifacts/realworld_baseline",
    seed: int = 42,
) -> Dict[str, Any]:
    """Train models on real-world IEEE-CIS dataset and benchmark across operational scenarios."""
    print("=" * 70)
    print("  KESTREL REAL-WORLD FRAUD MODEL TRAINING & BENCHMARK")
    print("=" * 70)

    loader = IEEECISDataLoader(data_path=data_path)
    X, y, num_cols, cat_cols = loader.load_and_preprocess(engineer_weak_signals=False)

    # Stratified Train/Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=seed, stratify=y
    )
    print(f"[*] Train set: {len(X_train)} ({y_train.sum()} frauds, {y_train.mean():.2%})")
    print(f"[*] Test set:  {len(X_test)} ({y_test.sum()} frauds, {y_test.mean():.2%})")

    # Preprocessing pipeline
    print("[*] Fitting preprocessing transformers...")
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ],
        remainder="drop",
    )

    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    print(f"[+] Feature matrix shape after encoding: {X_train_trans.shape}")

    models = {
        "kestrel-ieee-lr": LogisticRegression(
            class_weight="balanced",
            max_iter=500,
            random_state=seed,
        ),
        "kestrel-ieee-rf": RandomForestClassifier(
            n_estimators=80,
            max_depth=12,
            class_weight="balanced",
            n_jobs=-1,
            random_state=seed,
        ),
        "kestrel-ieee-hgb": HistGradientBoostingClassifier(
            class_weight="balanced",
            max_iter=120,
            learning_rate=0.08,
            max_depth=8,
            random_state=seed,
        ),
    }

    results = {}
    best_pr_auc = -1.0
    champion_id = "kestrel-ieee-hgb"
    champion_model = None

    os.makedirs(artifacts_dir, exist_ok=True)

    for model_id, model in models.items():
        print(f"\n[*] Training {model_id} ({type(model).__name__})...")
        start = time.perf_counter()
        model.fit(X_train_trans, y_train)
        train_time = round(time.perf_counter() - start, 2)

        # Evaluate on test set
        y_prob = model.predict_proba(X_test_trans)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        roc_auc = float(roc_auc_score(y_test, y_prob))
        pr_auc = float(average_precision_score(y_test, y_prob))
        precision = float(precision_score(y_test, y_pred, zero_division=0))
        recall = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))

        print(f"    Train Time: {train_time}s")
        print(f"    PR-AUC:     {pr_auc:.4f}")
        print(f"    ROC-AUC:    {roc_auc:.4f}")
        print(f"    Precision:  {precision:.4f} | Recall: {recall:.4f} | F1: {f1:.4f}")

        model_metrics = {
            "model_id": model_id,
            "algorithm": type(model).__name__,
            "train_time_sec": train_time,
            "test_pr_auc": round(pr_auc, 4),
            "test_roc_auc": round(roc_auc, 4),
            "test_precision": round(precision, 4),
            "test_recall": round(recall, 4),
            "test_f1": round(f1, 4),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        }
        results[model_id] = model_metrics

        if pr_auc > best_pr_auc:
            best_pr_auc = pr_auc
            champion_id = model_id
            champion_model = model

    print(f"\n[+] Champion model selected: {champion_id} (PR-AUC: {best_pr_auc:.4f})")

    # Save champion artifacts
    joblib.dump(champion_model, os.path.join(artifacts_dir, "model.joblib"))
    joblib.dump(preprocessor, os.path.join(artifacts_dir, "pipeline.joblib"))

    # Execute Scenario-Based Slice Benchmark on Champion
    print("\n[*] Running Scenario-Based Slice Benchmark across Operational Scenarios...")
    champion_probs = champion_model.predict_proba(X_test_trans)[:, 1]
    scenario_benchmark = run_comprehensive_scenario_benchmark(
        df_test=X_test,
        y_test=y_test.values,
        y_prob=champion_probs,
        threshold=0.5,
    )

    with open(os.path.join(artifacts_dir, "scenario_benchmark.json"), "w", encoding="utf-8") as f:
        json.dump(scenario_benchmark, f, indent=2)

    with open(os.path.join(artifacts_dir, "models_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Print summary table of scenarios
    print("\n" + "=" * 80)
    print(f"  SCENARIO BENCHMARK RESULTS FOR CHAMPION: {champion_id}")
    print("=" * 80)
    print(f"{'Scenario Slice':<35} | {'Count':<6} | {'Fraud%':<6} | {'Recall':<7} | {'Prec':<7} | {'F1':<7} | {'Status'}")
    print("-" * 80)
    for slice_key, sc in scenario_benchmark.items():
        print(f"{sc['slice_name']:<35} | {sc['total_count']:<6} | {sc['fraud_rate']*100:>5.1f}% | {sc['recall']*100:>6.1f}% | {sc['precision']*100:>6.1f}% | {sc['f1']*100:>6.1f}% | {sc['status']}")
    print("=" * 80)

    return {
        "models": results,
        "champion_id": champion_id,
        "scenario_benchmark": scenario_benchmark,
    }


if __name__ == "__main__":
    train_realworld_models()
