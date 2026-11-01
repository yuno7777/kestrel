"""Feature transformation pipeline for training and online serving parity."""

from typing import Dict, List, Any, Union
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer


NUMERICAL_FEATURES = [
    "amount",
    "log_amount",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "is_night",
    "txns_last_1m",
    "txns_last_5m",
    "txns_last_1h",
    "amount_sum_1h",
    "amount_avg_1h",
    "amount_to_avg_ratio",
    "time_since_last_txn_sec",
    "distinct_merchants_1h",
    "is_high_risk_category",
]

CATEGORICAL_FEATURES = [
    "merchant_category",
    "payment_channel",
]

ALL_FEATURE_COLUMNS = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


class KestrelFeaturePipeline:
    """Standardized preprocessing pipeline for Kestrel models."""

    def __init__(self):
        self.preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), NUMERICAL_FEATURES),
                (
                    "cat",
                    OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                    CATEGORICAL_FEATURES,
                ),
            ],
            remainder="drop",
        )
        self.feature_names_: List[str] = []
        self.is_fitted = False

    def fit(self, X: pd.DataFrame, y=None):
        """Fit preprocessor on training DataFrame."""
        self.preprocessor.fit(X)
        self.is_fitted = True

        # Extract generated feature names
        num_names = NUMERICAL_FEATURES
        cat_encoder = self.preprocessor.named_transformers_["cat"]
        cat_names = list(cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES))
        self.feature_names_ = num_names + cat_names
        return self

    def transform(self, X: Union[pd.DataFrame, Dict[str, Any]]) -> np.ndarray:
        """Transform batch DataFrame or single feature dictionary into array."""
        if isinstance(X, dict):
            # Single sample inference
            df = pd.DataFrame([X])
        else:
            df = X.copy()

        # Ensure missing columns have safe fallbacks
        for col in NUMERICAL_FEATURES:
            if col not in df.columns:
                df[col] = 0.0
        for col in CATEGORICAL_FEATURES:
            if col not in df.columns:
                df[col] = "unknown"

        return self.preprocessor.transform(df)

    def fit_transform(self, X: pd.DataFrame, y=None) -> np.ndarray:
        return self.fit(X, y).transform(X)
