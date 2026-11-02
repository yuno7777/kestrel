export type Decision = 'APPROVE' | 'REVIEW' | 'BLOCK';

export interface TransactionFeatures {
  amount: number;
  log_amount: number;
  hour_of_day: number;
  day_of_week: number;
  is_weekend: number;
  is_night: number;
  txns_last_1m: number;
  txns_last_5m: number;
  txns_last_1h: number;
  amount_sum_1h: number;
  amount_avg_1h: number;
  amount_to_avg_ratio: number;
  time_since_last_txn_sec: number;
  distinct_merchants_1h: number;
  is_high_risk_category: number;
}

export interface Transaction {
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  amount: number;
  currency: string;
  merchant_id: string;
  merchant_category: string;
  payment_channel: string;
  fraud_probability: number;
  prediction: number;
  decision: Decision;
  reason_codes: string[];
  model_version?: string;
  inference_latency_ms?: number;
  feedback_label?: number | null;
  features?: TransactionFeatures;
}

export interface SystemSummary {
  total_transactions_processed: number;
  fraud_transactions_detected: number;
  approval_rate: number;
  review_rate: number;
  block_rate: number;
  avg_inference_latency_ms: number;
  p95_inference_latency_ms: number;
  active_model_version: string;
  system_status: string;
}

export interface DecisionPolicy {
  approve_threshold: number;
  block_threshold: number;
  adaptive_enabled: boolean;
}

export interface ServiceHealth {
  status?: string;
  ready?: boolean;
  active_model?: string | null;
  timestamp?: string;
}

export interface ModelInfo {
  model_id: string;
  algorithm?: string;
  trained_at?: string;
  test_roc_auc?: number;
  test_pr_auc?: number;
  test_precision?: number;
  test_recall?: number;
  test_f1?: number;
  is_active: boolean;
  confusion_matrix?: number[][];
  threshold_analysis?: Array<{
    threshold: number;
    precision: number;
    recall: number;
    f1: number;
  }>;
}

export interface DriftFeature {
  feature_name: string;
  psi_score: number;
  ks_statistic: number;
  ks_p_value: number;
  current_mean: number;
  reference_mean: number;
  status: 'NO_DRIFT' | 'MODERATE_DRIFT' | 'SIGNIFICANT_DRIFT';
}

export interface DriftReport {
  overall_status: string;
  evaluated_features_count?: number;
  message?: string;
  features: DriftFeature[];
}
