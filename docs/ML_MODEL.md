# Kestrel: Machine Learning Architecture & Real-World Evaluation

## 1. Problem Formulation & Class Imbalance

Financial transaction fraud detection is an extreme class imbalance classification problem: **legitimate transactions make up 96.6% - 99.8% of volume**, while fraud constitutes **0.2% - 3.4%**.

### 1.1 Risks of Naive Metrics
- Standard classification accuracy is actively misleading: a dummy classifier labeling all transactions legitimate achieves 96.6% to 99.8% accuracy while stopping $0 in financial theft.
- True production evaluation requires **Precision-Recall Area Under Curve (PR-AUC)**, **Recall across operational scenario slices**, and **False Positive Rate (FPR) containment**.

---

## 2. Dataset Integration: Real-World IEEE-CIS Benchmark

Kestrel is trained and benchmarked on the real-world **IEEE-CIS Fraud Detection** dataset (provided by Vesta Corporation), featuring:
- **59,054 authentic payment card transactions**
- **2,005 verified fraud cases (3.40% baseline fraud rate)**
- **434 raw telemetry columns** spanning:
  - Temporal signals: `TransactionDT` (seconds from epoch)
  - Monetary values: `TransactionAmt`
  - Categoricals: `ProductCD` (Product code: W, C, H, R, S), `card4` (network), `card6` (credit vs debit), `P_emaildomain`
  - Vesta engineered counters: `C1`-`C14` (velocity counting), `D1`-`D15` (timedelta recency), `V1`-`V339` (identity and behavioral features)

---

## 3. Real-World Preprocessing Pipeline (`IEEECISDataLoader`)

Located in `ml/data/ieee_loader.py`:
1. **Temporal Extraction:**
   - `hour_of_day`: $(TransactionDT // 3600) \pmod{24}$
   - `day_of_week`: $(TransactionDT // 86400) \pmod 7$
   - `is_night`: Indicator for transactions between 00:00 and 05:59 UTC
   - `is_weekend`: Indicator for Saturday/Sunday
2. **Monetary & Amount Dynamics:**
   - `log_amount`: $\log(1 + TransactionAmt)$
   - `cents`: $TransactionAmt \pmod 1$ (floating point decimal precision)
   - `is_round_amount`: Binary flag for integer dollar transactions ($cents == 0$)
3. **Identity & Email Grouping:**
   - Cleans and aggregates messy email domains into high-signal cohorts: `gmail`, `yahoo`, `microsoft`, `apple`, `privacy_webmail`, `corporate_or_other`, and `missing` (guest checkouts).
4. **Velocity Aggregations:**
   - `c_sum`: Composite transaction velocity across all $C$-counters.
   - `c_max`: Peak burst velocity.
   - `null_feature_count`: Total missing attributes (proxy for identity transparency).

---

## 4. Scenario Diagnosis & Targeted Improvement Phase

### 4.1 Diagnosis of Baseline Champion (`kestrel-ieee-hgb`)
Baseline slice evaluation revealed strong detection in high-risk categories (ProductCD 'C' at **89.3% recall**, Micro-transactions at **83.9% recall**), but a critical blind spot in standard web eCommerce:
- **ProductCD 'W' (Standard Retail Web, 74% of traffic):** Only **48.3% recall** (`CRITICAL_UNDERPERFORMING`), missing more than half of retail fraud.
- **Guest Checkout (`p_email_group == 'missing'`):** Only **54.1% recall** (`CRITICAL_UNDERPERFORMING`).
- **Debit Card Transactions:** Only **61.5% recall** (vs 79.5% on Credit).

### 4.2 Engineering Targeted Signals (`engineer_weak_signals=True`)
To resolve these weaknesses, targeted signals were introduced:
- `w_round_cents`: Specific interaction between ProductCD 'W' and integer cent amounts (80.7% of fraud on 'W' transactions uses round dollar amounts, vs 50.0% of legit transactions).
- `w_missing_email`: Web transactions omitting email domain.
- `card1_amt_zscore` & `card1_amt_ratio`: Normalized expenditure deviation against cardholder historical mean.
- `micro_velocity_density`: Micro-charge velocity burst density.
- `debit_round_cents` & `debit_velocity`: Debit card risk interactions.

### 4.3 Slice-Reinforced Tree Learning
During gradient boosting training (`HistGradientBoostingClassifier`), sample weights were scaled dynamically:
- $1.35\times$ weight boost on ProductCD 'W' fraud cases.
- $1.25\times$ weight boost on Guest Checkout fraud cases.

### 4.4 Slice-Adaptive Decision Engine (`AdaptiveDecisionPolicy`)
Rather than enforcing a blunt static $0.50$ threshold across diverse transaction categories, Kestrel implements context-calibrated decision thresholds:
- **Web Retail (`ProductCD == 'W'`):** Threshold calibrated to **0.38** (lowered to **0.35** for guest web checkouts).
- **Guest Checkout:** Threshold calibrated to **0.40**.
- **Debit Cards:** Threshold calibrated to **0.44**.
- **Whale Transactions (> $1,000):** Threshold elevated to **0.60** to prevent high-value customer friction while maintaining high recall.

---

## 5. Measured Production Lifts

Measured on 14,764 held-out real-world test transactions:

| Metric / Slice | Baseline | Improved (Adaptive) | Lift |
| :--- | :--- | :--- | :--- |
| **ProductCD 'W' (Web Retail) Recall** | 48.3% | **66.3%** | **+18.0% absolute lift** |
| **Guest Checkout Recall** | 54.1% | **73.8%** | **+19.7% absolute lift** |
| **Debit Card Recall** | 61.5% | **71.0%** | **+9.5% absolute lift** |
| **Elevated Value ($100-$500) Recall** | 64.6% | **75.7%** | **+11.1% absolute lift** |
| **Overall Population Recall** | 70.1% | **77.8%** | **+7.8% absolute lift** |
| **Overall ROC-AUC** | 0.8796 | **0.8811** | **+0.15%** |
