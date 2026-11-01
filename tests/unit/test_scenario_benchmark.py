"""Unit tests for scenario-based slice evaluation and adaptive decision policy."""

import numpy as np
import pandas as pd
import pytest

from ml.evaluation.scenario_benchmark import evaluate_slice, run_comprehensive_scenario_benchmark
from ml.training.improve_model import AdaptiveDecisionPolicy


def test_evaluate_slice_metrics_and_status():
    y_true = np.array([1, 1, 1, 0, 0, 0, 0, 0, 0, 0])
    y_prob = np.array([0.9, 0.8, 0.7, 0.1, 0.2, 0.15, 0.1, 0.3, 0.05, 0.2])

    res = evaluate_slice("Test Slice", y_true, y_prob, threshold=0.5)

    assert res["slice_name"] == "Test Slice"
    assert res["total_count"] == 10
    assert res["fraud_count"] == 3
    assert res["recall"] == 1.0
    assert res["precision"] == 1.0
    assert res["f1"] == 1.0
    assert res["status"] == "EXCELLENT"
    assert res["fpr"] == 0.0


def test_evaluate_slice_underperforming_diagnosis():
    y_true = np.array([1, 1, 1, 1, 0, 0])
    y_prob = np.array([0.2, 0.3, 0.4, 0.9, 0.1, 0.1])  # Only 1 of 4 detected at 0.50

    res = evaluate_slice("Underperforming Slice", y_true, y_prob, threshold=0.5)

    assert res["recall"] == 0.25
    assert res["status"] == "CRITICAL_UNDERPERFORMING"


def test_evaluate_slice_zero_frauds_no_division_error():
    y_true = np.zeros(10, dtype=int)
    y_prob = np.random.uniform(0.1, 0.4, size=10)

    res = evaluate_slice("Zero Fraud Slice", y_true, y_prob, threshold=0.5)

    assert res["fraud_count"] == 0
    assert res["recall"] == 0.0
    assert res["status"] == "NO_FRAUD_EVENTS"


def test_comprehensive_scenario_benchmark_with_adaptive_thresholds():
    n = 100
    df = pd.DataFrame({
        "TransactionAmt": np.concatenate([
            np.full(20, 15.0),    # micro < 25
            np.full(30, 50.0),    # standard 25-100
            np.full(30, 250.0),   # elevated 100-500
            np.full(10, 750.0),   # high-risk 500-1000
            np.full(10, 2000.0),  # whale > 1000
        ]),
        "ProductCD": ["W"] * 50 + ["C"] * 30 + ["H"] * 20,
        "card6": ["credit"] * 60 + ["debit"] * 40,
        "is_night": [1] * 30 + [0] * 70,
        "p_email_group": ["gmail"] * 40 + ["missing"] * 30 + ["microsoft"] * 20 + ["privacy_webmail"] * 10,
    })

    y_test = np.array([1 if i % 10 == 0 else 0 for i in range(n)])
    y_prob = np.where(y_test == 1, 0.75, 0.15)

    policy = AdaptiveDecisionPolicy()
    adaptive_t = policy.compute_thresholds(df)

    res = run_comprehensive_scenario_benchmark(
        df_test=df,
        y_test=y_test,
        y_prob=y_prob,
        threshold=adaptive_t,
    )

    assert "overall" in res
    assert "amount_micro_under_25" in res
    assert "amount_whale_over_1000" in res
    assert "product_W" in res
    assert "product_C" in res
    assert "card_credit" in res
    assert "card_debit" in res
    assert "temporal_nocturnal" in res
    assert "email_missing" in res

    # Whale thresholds should be elevated (0.60)
    whale_mask = df["TransactionAmt"] > 1000
    assert np.all(adaptive_t[whale_mask] == 0.60)

    # Web eCommerce thresholds should be calibrated lower
    w_non_guest_mask = (df["ProductCD"] == "W") & (df["p_email_group"] != "missing")
    assert np.all(adaptive_t[w_non_guest_mask] == 0.38)
