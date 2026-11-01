# Kestrel: Machine Learning Architecture & Evaluation

## 1. Problem Formulation & Class Imbalance

Financial fraud detection is an extreme class imbalance problem: typically **99.5% to 99.9% of transactions are legitimate**, while only **0.1% to 0.5% are fraudulent**. 

### 1.1 Risks of Naive Metrics
- Standard accuracy is deeply deceptive: a model that labels every single transaction as legitimate achieves 99.8% accuracy while failing 100% of fraud prevention objectives.
- Primary evaluation metrics must center on **Precision-Recall AUC (PR-AUC)**, **Recall at 1% False Positive Rate (FPR)**, **F1-Score**, and **Expected Financial Loss/Cost**.

---

## 2. Algorithms Evaluated & Implemented

Kestrel implements and trains a portfolio of algorithms to provide comparative transparency:

| Algorithm | Model Family | Role | Key Strengths | Inference Latency |
| :--- | :--- | :--- | :--- | :--- |
| **HistGradientBoosting** | Supervised Boosting | **Primary Production Model** | Native histogram binning, lightning-fast inference (< 4ms), excellent non-linear feature interaction modeling, built-in monotonic constraints. | ~2.5 - 4.0 ms |
| **Random Forest** | Supervised Bagging | Baseline Ensemble | High stability, low variance, robust against outliers, interpretable feature importance. | ~6.0 - 9.0 ms |
| **Logistic Regression** | Linear Model | Linear Baseline | Fast, fully interpretable, serves as benchmark lower bound. | ~0.8 - 1.5 ms |
| **Isolation Forest** | Unsupervised Anomaly | Anomaly Detector | Detects novel zero-day attack vectors and unseen behavioral anomalies without labels. | ~4.0 - 7.0 ms |

---

## 3. Class Imbalance Mitigation Strategy

1. **Balanced Class Weights:**
   - In `HistGradientBoostingClassifier`, `class_weight='balanced'` automatically adjusts loss gradient weights inversely proportional to class frequencies.
2. **Threshold Tuning via Cost Curves:**
   - Instead of the arbitrary default classification threshold ($P = 0.50$), Kestrel performs empirical threshold sweep optimization to minimize expected business cost:
   $$\text{Total Cost} = C_{\text{FN}} \cdot \text{FN} + C_{\text{FP}} \cdot \text{FP} + C_{\text{REV}} \cdot \text{Review}$$
   Where:
   - $C_{\text{FN}}$: False Negative cost (average fraud chargeback loss, e.g. \$250).
   - $C_{\text{FP}}$: False Positive cost (customer friction, customer support inquiry, e.g. \$10).
   - $C_{\text{REV}}$: Manual investigation cost by fraud analyst (e.g. \$25).

---

## 4. Multi-Tier Decision Engine Policy

The output fraud probability $P(\text{fraud})$ maps directly to actionable operational decisions:

```text
               P(fraud) < 0.30       -->   APPROVE  (Low Risk)
      0.30 <= P(fraud) < 0.75       -->   REVIEW   (Medium Risk - Manual Analyst Queue)
               P(fraud) >= 0.75      -->   BLOCK    (High Risk - Immediate Decline)
```

Each decision includes diagnostic **Reason Codes**:
- `HIGH_VELOCITY_BURST`: `txns_last_1m > 3` or `txns_last_5m > 6`
- `UNUSUAL_AMOUNT_DEVIATION`: `amount_to_avg_ratio > 4.0`
- `NOCTURNAL_HIGH_RISK_CATEGORY`: `is_night == 1` and `merchant_category in ('crypto', 'electronics')`
- `RAPID_MERCHANT_HOPPING`: `distinct_merchants_1h > 4` within short interval

---

## 5. Model Artifact Structure

Model training serializes versioned artifacts under `ml/artifacts/<model_version>/`:
- `model.joblib`: Trained estimator.
- `pipeline.joblib`: Preprocessing, one-hot encoder, and standard scaler.
- `metadata.json`: Model version, training timestamp, hyperparameters, algorithm, feature list.
- `metrics.json`: Precision, Recall, F1, ROC-AUC, PR-AUC, confusion matrix, threshold curves.
- `active_model.json`: Pointer to current production model version.
