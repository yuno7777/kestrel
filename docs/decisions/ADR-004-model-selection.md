# ADR-004: HistGradientBoosting as Primary Production ML Classifier

## Status
Accepted

## Context
Transaction scoring requires a machine learning algorithm capable of handling non-linear interactions, skewed monetary distributions, mixed data types, and extreme class imbalance (~0.1-0.5% fraud rate), while maintaining strict sub-5ms inference latency.

## Decision
We select Scikit-Learn's `HistGradientBoostingClassifier` as the primary production model, benchmarked against `RandomForestClassifier` and `LogisticRegression`, with `IsolationForest` for unsupervised anomaly scoring.
- **Histogram Binning:** Discretizes numerical continuous features into integer bins, yielding an order-of-magnitude faster training and inference than traditional Gradient Boosting.
- **Class Imbalance Handling:** Supports `class_weight='balanced'` natively to penalize false negatives on the minority fraud class.
- **Inference Speed:** Average single-sample inference time is ~2.5 - 4.0ms, fitting comfortably within the 50ms end-to-end SLA.

## Consequences
### Positive
- High PR-AUC and ROC-AUC on tabular transaction data.
- Native missing value support and minimal preprocessing overhead.
- No heavy C++ external library dependencies (such as libgomp issues sometimes seen with raw LightGBM on Windows).

### Negative
- Requires probability calibration (Platt scaling / Isotonic regression) to output well-calibrated posterior probabilities for multi-tier threshold decisioning.
