"""Unit tests for statistical drift detection algorithms."""

import numpy as np
from ml.monitoring.drift import calculate_psi, calculate_ks_test, evaluate_feature_drift


def test_psi_identical_distributions():
    """Identical distributions should have PSI close to zero (< 0.05)."""
    rng = np.random.default_rng(42)
    dist1 = rng.normal(100, 15, size=2000)
    dist2 = rng.normal(100, 15, size=2000)

    psi = calculate_psi(dist1, dist2)
    assert psi < 0.05, f"Expected near-zero PSI, got {psi}"


def test_psi_drifted_distributions():
    """Drifted distribution should yield high PSI (> 0.20)."""
    rng = np.random.default_rng(42)
    baseline = rng.normal(50, 10, size=2000)
    shifted = rng.normal(120, 25, size=2000)

    psi = calculate_psi(baseline, shifted)
    assert psi >= 0.20, f"Expected high PSI >= 0.20 for drifted data, got {psi}"


def test_ks_test_detects_shift():
    """KS test should flag distribution shift with low p-value."""
    rng = np.random.default_rng(42)
    ref = rng.exponential(scale=10.0, size=1500)
    curr = rng.exponential(scale=50.0, size=1500)

    ks_stat, p_val = calculate_ks_test(ref, curr)
    assert p_val < 0.01
    assert ks_stat > 0.1
