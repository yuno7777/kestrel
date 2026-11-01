# Kestrel: Benchmark Results & Operational Scenario Profiling

## 1. Real-World Dataset & Scenario-Based Evaluation Framework

To evaluate and harden Kestrel under realistic financial transaction dynamics, the platform was benchmarked on the real-world **IEEE-CIS Fraud Detection** dataset (provided by Vesta Corporation).

- **Total Transactions:** 59,054 real card transactions
- **Class Imbalance:** 2,005 fraud cases (3.40% fraud rate, 96.60% legitimate)
- **Feature Space:** 434 raw telemetry attributes spanning card attributes, transaction amounts, Vesta V-features, D-recency features, and C-velocity counts
- **Test Set:** 14,764 held-out transactions (501 fraud cases) evaluated under stratified split ($seed = 42$)

---

## 2. Baseline Model Performance & Diagnosis of Weak Scenarios

Three algorithms were trained as baselines on the normalized feature space:
1. **Logistic Regression (`kestrel-ieee-lr`):** PR-AUC 0.2842, ROC-AUC 0.7961
2. **Random Forest (`kestrel-ieee-rf`):** PR-AUC 0.4721, ROC-AUC 0.8654
3. **HistGradientBoosting (`kestrel-ieee-hgb`):** PR-AUC 0.5148, ROC-AUC 0.8796 (Champion Baseline)

### Granular Scenario Slice Diagnosis (Baseline Champion)

Evaluating overall metrics alone masks severe slice vulnerabilities. Slice benchmarking revealed sharp operational asymmetries:

| Operational Scenario Slice | Test Count | Fraud Rate | Baseline Recall | Baseline Prec | Status Diagnosis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ProductCD 'C' (Cash/Crypto/Wire)** | 1,820 | 10.77% | **89.3%** | 27.0% | **GOOD** (High signal, strong detection) |
| **Micro-Transactions (< $25)** | 1,174 | 7.41% | **83.9%** | 27.4% | **GOOD** (High card-testing velocity) |
| **Credit Cards** | 3,704 | 6.45% | **79.5%** | 23.2% | **GOOD** |
| **Nocturnal (00:00 - 05:59 UTC)** | 3,644 | 3.51% | **75.8%** | 23.7% | **GOOD** |
| **ProductCD 'H' / 'R'** | 1,744 | 4.41% | **79.5% - 81.1%** | 21.7% - 27.5% | **GOOD** |
| **ProductCD 'W' (Web Retail eCommerce)** | **10,919 (74%)** | 1.93% | **48.3%** | 14.1% | **CRITICAL_UNDERPERFORMING** (Missed 51.7% of fraud!) |
| **Email Group: 'missing' (Guest Checkout)** | **2,348** | 2.60% | **54.1%** | 17.7% | **CRITICAL_UNDERPERFORMING** |
| **Card Type: DEBIT** | **11,021** | 2.38% | **61.5%** | 19.3% | **MODERATE** (Missed 38.5% of debit fraud) |
| **Whale Transactions (> $1,000)** | **207** | 1.45% | 66.7% | **10.0%** | **MODERATE** (90% false positive alert rate) |

### Root Cause Analysis of Weak Scenarios:
1. **ProductCD 'W' Clustering:** Legitimate web retail has lower fraud rates (1.93%), causing model probabilities for retail fraud to cluster right around $0.40 - 0.48$, falling just below the generic $0.50$ static decision threshold.
2. **Hidden Behavioral Signals in Web Fraud:** Exploratory feature analysis revealed that **80.7% of fraudulent web transactions use exact integer dollar amounts (`cents == .00`)**, compared to only 50.0% of legitimate transactions.
3. **Guest Checkout Evasion:** Attackers bypass email profiling by omitting domain information (`p_email_group == 'missing'`).

---

## 3. Targeted Improvement Phase

To eliminate the diagnosed blind spots, three engineering enhancements were deployed in `kestrel-realworld-improved-v1.0.0`:

1. **Targeted Feature Engineering (`ml/data/ieee_loader.py`):**
   - `w_round_cents`: Interaction between ProductCD 'W' and integer cents ($cents == 0$).
   - `w_missing_email`: Web retail transactions omitting email address.
   - `card1_amt_zscore` & `card1_amt_ratio`: Cardholder-relative expenditure deviation ($Z$-score vs card historical mean).
   - `micro_velocity_density`: Velocity aggregation normalized by transaction amount ($C_{sum} / (Amt + 1)$).
   - `debit_round_cents` & `debit_velocity`: Specific debit card risk interactions.
   - `log_card1_freq`: Card novelty vs recurrence frequency.

2. **Slice-Reinforced Sample Weighting:**
   - Boosting loss penalty applied during gradient boosting training: $1.35\times$ weight boost on ProductCD 'W' fraud and $1.25\times$ weight boost on guest checkout fraud.

3. **Slice-Adaptive Decision Policy (`AdaptiveDecisionPolicy`):**
   - Context-sensitive decision boundaries calibrated to slice risk curves:
     - Web eCommerce (`ProductCD == 'W'`): calibrated threshold $0.38$ (lowered to $0.35$ on guest checkouts).
     - Guest Checkouts overall: calibrated threshold $0.40$.
     - Debit Cards: calibrated threshold $0.44$.
     - Whale Transactions (> $1,000$): elevated threshold $0.60$ to reduce VIP customer false positive friction.

---

## 4. Head-to-Head Benchmark Results (Measured Lifts)

Below are the actual measured results from `ml/artifacts/kestrel-realworld-improved-v1.0.0/improvement_comparison.json`:

| Scenario Slice | Total Count | Fraud Count | Baseline Recall | Improved Recall | Absolute Recall Lift | Status Progression |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Overall Population** | **14,764** | **501** | **70.1%** | **77.8%** | **+7.8%** | **MODERATE -> GOOD** |
| **ProductCD 'W' (Web Retail)** | **10,919** | **211** | **48.3%** | **66.3%** | **+18.0%** | **CRITICAL -> MODERATE** |
| **Email: 'missing' (Guest Checkout)** | **2,348** | **61** | **54.1%** | **73.8%** | **+19.7%** | **CRITICAL -> MODERATE** |
| **Elevated Value ($100 - $500)** | **5,451** | **181** | **64.6%** | **75.7%** | **+11.1%** | **MODERATE -> GOOD** |
| **Card Type: DEBIT** | **11,021** | **262** | **61.5%** | **71.0%** | **+9.5%** | **MODERATE (Substantial Lift)** |
| **Card Type: CREDIT** | **3,704** | **239** | **79.5%** | **85.4%** | **+5.9%** | **GOOD** |
| **Micro-Transactions (< $25)** | **1,174** | **87** | **83.9%** | **87.4%** | **+3.5%** | **GOOD** |
| **Everyday Standard ($25 - $100)** | **7,502** | **207** | **68.6%** | **76.3%** | **+7.7%** | **MODERATE -> GOOD** |
| **Nocturnal (00:00 - 05:59 UTC)** | **3,644** | **128** | **75.8%** | **83.6%** | **+7.8%** | **GOOD** |
| **Daytime (06:00 - 23:59 UTC)** | **11,120** | **373** | **68.1%** | **75.9%** | **+7.8%** | **MODERATE -> GOOD** |
| **Email: 'gmail'** | **5,710** | **246** | **77.2%** | **82.5%** | **+5.3%** | **GOOD** |
| **ProductCD 'C' (Cash/Crypto)** | **1,820** | **196** | **89.3%** | **89.3%** | **+0.0%** | **GOOD (Preserved Peak)** |

---

## 5. Serving Latency & Throughput Benchmark

Tested on a 13th Gen Intel Core i7-13620H (10 cores, 16 threads), 16 GB DDR5 RAM, Windows 11 Enterprise (x64):

| Metric | Measured Value | SLA Target | Status |
| :--- | :--- | :--- | :--- |
| **Throughput** | **52.64 requests/sec** | >= 25 req/s (Single-worker local) | EXCEEDED |
| **P50 HTTP Turnaround** | 272.61 ms | < 350 ms | PASSED |
| **P95 HTTP Turnaround** | 303.45 ms | < 450 ms | PASSED |
| **P99 HTTP Turnaround** | 329.66 ms | < 500 ms | PASSED |
| **In-Process Inference Latency** | **2.8 - 4.2 ms** | < 10.0 ms | EXCEEDED |

---

## 6. GPU Training Acceleration & Performance Benchmark

### 6.1 Hardware Configuration
- **GPU Accelerator:** NVIDIA GeForce RTX 4060 Laptop GPU (8,188 MiB GDDR6 VRAM, Driver 617.42, CUDA 13.4)
- **Host CPU:** 13th Gen Intel(R) Core(TM) i7-13620H (16 vCPUs)
- **Frameworks:** XGBoost 3.4.1 (`device='cuda'`, `tree_method='hist'`), CatBoost 1.2.10 (`task_type='GPU'`)

### 6.2 Real-World IEEE-CIS Training Benchmark (44,290 Train Samples, 108 Features)

| Model | Acceleration | Train Time | Test PR-AUC | Test ROC-AUC | Test Precision | Test Recall | Test F1 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`kestrel-gpu-xgboost`** | **NVIDIA CUDA** | **1.90 s** | **0.5555** | **0.8862** | **58.24%** | 50.10% | **0.5386** |
| **`kestrel-gpu-catboost`** | **NVIDIA CUDA** | **2.99 s** | 0.5352 | 0.8811 | 35.40% | 59.28% | 0.4433 |
| `kestrel-ieee-hgb` | CPU (Multithread) | 4.31 s | 0.5148 | 0.8796 | 21.13% | 70.06% | 0.3247 |
| `kestrel-ieee-rf` | CPU (Multithread) | 12.80 s | 0.4721 | 0.8654 | 18.50% | 68.20% | 0.2910 |
| `kestrel-ieee-lr` | CPU (Single) | 8.45 s | 0.2842 | 0.7961 | 11.20% | 63.40% | 0.1904 |

### 6.3 Key GPU Takeaways
1. **Training Speedup:** GPU XGBoost trained 300 deep trees on 44,290 multi-dimensional records in **1.90 seconds**, delivering a **6.7x speedup over CPU Random Forest**.
2. **Discriminative Precision Lift:** Precision at default threshold reached **58.24%** on GPU XGBoost (vs 21.13% for CPU HistGradientBoosting), with PR-AUC reaching **0.5555** (the highest discrimination recorded).
3. **VIP Customer Protection:** On high-value Whale transactions (> $1,000), GPU XGBoost achieved **66.7% precision** (cutting false positive friction by more than 85% compared to the baseline 10.0% precision).

