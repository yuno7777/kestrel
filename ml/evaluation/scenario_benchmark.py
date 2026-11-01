"""Scenario-based slice evaluation benchmark for real-world fraud detection."""

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, average_precision_score


def evaluate_slice(
    name: str,
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """Compute detailed evaluation metrics on a specific transaction slice."""
    count = len(y_true)
    fraud_count = int(np.sum(y_true))
    legit_count = count - fraud_count
    fraud_rate = float(fraud_count / max(count, 1))

    if fraud_count == 0:
        return {
            "slice_name": name,
            "total_count": count,
            "fraud_count": 0,
            "fraud_rate": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "roc_auc": 0.0,
            "pr_auc": 0.0,
            "fpr": 0.0,
            "avg_prob_fraud": 0.0,
            "avg_prob_legit": round(float(np.mean(y_prob)), 4) if count > 0 else 0.0,
            "status": "NO_FRAUD_EVENTS",
        }

    y_pred = (y_prob >= threshold).astype(int)

    precision = float(precision_score(y_true, y_pred, zero_division=0))
    recall = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        roc_auc = float(roc_auc_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else 0.5
        pr_auc = float(average_precision_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else 0.0
    except Exception:
        roc_auc = 0.5
        pr_auc = 0.0

    # False positive rate: FP / (FP + TN)
    fp = np.sum((y_pred == 1) & (y_true == 0))
    tn = np.sum((y_pred == 0) & (y_true == 0))
    fpr = float(fp / max(fp + tn, 1))

    # Mean probabilities
    prob_fraud = float(np.mean(y_prob[y_true == 1])) if fraud_count > 0 else 0.0
    prob_legit = float(np.mean(y_prob[y_true == 0])) if legit_count > 0 else 0.0

    # Diagnostic assessment
    if recall >= 0.85 and precision >= 0.70:
        status = "EXCELLENT"
    elif recall >= 0.75:
        status = "GOOD"
    elif recall < 0.60:
        status = "CRITICAL_UNDERPERFORMING"
    else:
        status = "MODERATE"

    return {
        "slice_name": name,
        "total_count": count,
        "fraud_count": fraud_count,
        "fraud_rate": round(fraud_rate, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "fpr": round(fpr, 4),
        "avg_prob_fraud": round(prob_fraud, 4),
        "avg_prob_legit": round(prob_legit, 4),
        "status": status,
    }


def run_comprehensive_scenario_benchmark(
    df_test: pd.DataFrame,
    y_test: np.ndarray,
    y_prob: np.ndarray,
    threshold: Any = 0.5,
) -> Dict[str, Any]:
    """Execute scenario-based slice benchmarking across Amount, Category, Card Type, and Time."""
    results = {}
    is_array = isinstance(threshold, np.ndarray)

    def _t(mask=None):
        if not is_array or mask is None:
            return threshold
        return threshold[mask]

    # 1. Overall Population
    results["overall"] = evaluate_slice("Overall Population", y_test, y_prob, _t())

    # 2. Amount Brackets
    amt = df_test["TransactionAmt"].values
    m_micro = amt < 25
    results["amount_micro_under_25"] = evaluate_slice(
        "Micro-Transactions (< $25)", y_test[m_micro], y_prob[m_micro], _t(m_micro)
    )
    m_std = (amt >= 25) & (amt < 100)
    results["amount_standard_25_100"] = evaluate_slice(
        "Everyday Standard ($25 - $100)",
        y_test[m_std],
        y_prob[m_std],
        _t(m_std),
    )
    m_elev = (amt >= 100) & (amt < 500)
    results["amount_elevated_100_500"] = evaluate_slice(
        "Elevated Value ($100 - $500)",
        y_test[m_elev],
        y_prob[m_elev],
        _t(m_elev),
    )
    m_high = (amt >= 500) & (amt <= 1000)
    results["amount_high_risk_500_1000"] = evaluate_slice(
        "High-Value Outliers ($500 - $1,000)",
        y_test[m_high],
        y_prob[m_high],
        _t(m_high),
    )
    m_whale = amt > 1000
    results["amount_whale_over_1000"] = evaluate_slice(
        "Whale Transactions (> $1,000)",
        y_test[m_whale],
        y_prob[m_whale],
        _t(m_whale),
    )

    # 3. Product Categories
    prod = df_test["ProductCD"].values
    for p_cat in ["C", "W", "H", "R", "S"]:
        mask = prod == p_cat
        if np.sum(mask) > 0:
            results[f"product_{p_cat}"] = evaluate_slice(
                f"ProductCD '{p_cat}'", y_test[mask], y_prob[mask], _t(mask)
            )

    # 4. Card Types (Credit vs Debit)
    c6 = df_test["card6"].values
    for card_type in ["credit", "debit"]:
        mask = c6 == card_type
        if np.sum(mask) > 0:
            results[f"card_{card_type}"] = evaluate_slice(
                f"Card Type: {card_type.upper()}", y_test[mask], y_prob[mask], _t(mask)
            )

    # 5. Temporal Slice (Night vs Day)
    if "is_night" in df_test.columns:
        night = df_test["is_night"].values
        m_night = night == 1
        m_day = night == 0
        results["temporal_nocturnal"] = evaluate_slice(
            "Nocturnal (00:00 - 05:59 UTC)", y_test[m_night], y_prob[m_night], _t(m_night)
        )
        results["temporal_daytime"] = evaluate_slice(
            "Daytime (06:00 - 23:59 UTC)", y_test[m_day], y_prob[m_day], _t(m_day)
        )

    # 6. Email Privacy Slices
    if "p_email_group" in df_test.columns:
        emails = df_test["p_email_group"].values
        for grp in ["privacy_webmail", "gmail", "microsoft", "missing"]:
            mask = emails == grp
            if np.sum(mask) > 0:
                results[f"email_{grp}"] = evaluate_slice(
                    f"Email Group: {grp}", y_test[mask], y_prob[mask], _t(mask)
                )

    return results
