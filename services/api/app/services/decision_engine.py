"""Configurable multi-tier fraud decision policy engine."""

from typing import List, Tuple
from kestrel_common.schemas import DecisionType, TransactionFeatures
from kestrel_common.config import settings


class DecisionEngine:
    """Evaluates fraud probabilities against business risk thresholds."""

    def __init__(
        self,
        approve_threshold: float = None,
        block_threshold: float = None,
    ):
        self.approve_threshold = (
            approve_threshold
            if approve_threshold is not None
            else settings.THRESHOLD_APPROVE_MAX
        )
        self.block_threshold = (
            block_threshold
            if block_threshold is not None
            else settings.THRESHOLD_BLOCK_MIN
        )

    def evaluate(
        self, fraud_probability: float, features: TransactionFeatures
    ) -> Tuple[DecisionType, List[str]]:
        """Apply thresholds and extract diagnostic reason codes."""
        reason_codes = []

        # Analyze feature deviations for explanation codes
        if features.txns_last_1m >= 3 or features.txns_last_5m >= 6:
            reason_codes.append("HIGH_VELOCITY_BURST")

        if features.amount_to_avg_ratio >= 4.0:
            reason_codes.append("UNUSUAL_AMOUNT_DEVIATION")

        if features.is_night == 1 and features.is_high_risk_category == 1:
            reason_codes.append("NOCTURNAL_HIGH_RISK_CATEGORY")

        if features.distinct_merchants_1h >= 4 and features.time_since_last_txn_sec < 60:
            reason_codes.append("RAPID_MERCHANT_HOPPING")

        if features.amount > 3000.0:
            reason_codes.append("HIGH_VALUE_TRANSACTION")

        # Decision assignment
        if fraud_probability >= self.block_threshold:
            decision = DecisionType.BLOCK
            if not reason_codes:
                reason_codes.append("MODEL_HIGH_FRAUD_PROBABILITY")
        elif fraud_probability >= self.approve_threshold:
            decision = DecisionType.REVIEW
            if not reason_codes:
                reason_codes.append("AMBIGUOUS_RISK_ELEVATION")
        else:
            decision = DecisionType.APPROVE

        return decision, reason_codes
