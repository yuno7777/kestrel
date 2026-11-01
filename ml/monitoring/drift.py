"""Statistical feature drift and prediction distribution monitoring for Kestrel."""

from typing import Dict, List, Any, Tuple
import numpy as np
from scipy import stats


def calculate_psi(
    expected: np.ndarray, actual: np.ndarray, num_buckets: int = 10
) -> float:
    """Calculate Population Stability Index (PSI) between baseline and production distributions."""
    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    # Determine quantiles on expected data
    percentiles = np.linspace(0, 100, num_buckets + 1)
    bucket_bounds = np.percentile(expected, percentiles)
    bucket_bounds[0] = -np.inf
    bucket_bounds[-1] = np.inf

    expected_counts, _ = np.histogram(expected, bins=bucket_bounds)
    actual_counts, _ = np.histogram(actual, bins=bucket_bounds)

    # Convert to fractions with small epsilon to avoid division by zero
    eps = 1e-4
    expected_pct = (expected_counts / len(expected)) + eps
    actual_pct = (actual_counts / len(actual)) + eps

    # Normalize back to sum to 1
    expected_pct /= expected_pct.sum()
    actual_pct /= actual_pct.sum()

    psi = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(np.round(psi, 4))


def calculate_ks_test(
    reference: np.ndarray, current: np.ndarray
) -> Tuple[float, float]:
    """Run two-sample Kolmogorov-Smirnov test."""
    if len(reference) == 0 or len(current) == 0:
        return 0.0, 1.0

    ks_stat, p_value = stats.ks_2samp(reference, current)
    return float(np.round(ks_stat, 4)), float(np.round(p_value, 4))


def evaluate_feature_drift(
    reference_data: Dict[str, Any], current_samples: Dict[str, List[float]]
) -> Dict[str, Any]:
    """Evaluate drift across a portfolio of features against reference distributions."""
    results = []
    has_significant_drift = False

    for feature_name, curr_vals in current_samples.items():
        if not curr_vals:
            continue

        curr_arr = np.array(curr_vals)
        ref_mean = reference_data.get("numerical_means", {}).get(feature_name, 0.0)
        ref_std = reference_data.get("numerical_stds", {}).get(feature_name, 1.0)

        # Approximate reference samples using baseline mean/std for PSI comparison
        rng = np.random.default_rng(42)
        ref_arr = rng.normal(ref_mean, max(ref_std, 1e-4), size=max(len(curr_arr), 200))

        psi = calculate_psi(ref_arr, curr_arr)
        ks_stat, p_val = calculate_ks_test(ref_arr, curr_arr)

        if psi >= 0.20 or p_val < 0.01:
            status = "SIGNIFICANT_DRIFT"
            has_significant_drift = True
        elif psi >= 0.10:
            status = "MODERATE_DRIFT"
        else:
            status = "NO_DRIFT"

        results.append(
            {
                "feature_name": feature_name,
                "psi_score": psi,
                "ks_statistic": ks_stat,
                "ks_p_value": p_val,
                "current_mean": round(float(np.mean(curr_arr)), 2),
                "reference_mean": round(float(ref_mean), 2),
                "status": status,
            }
        )

    return {
        "overall_status": (
            "CRITICAL_DRIFT" if has_significant_drift else "STABLE"
        ),
        "evaluated_features_count": len(results),
        "features": results,
    }
