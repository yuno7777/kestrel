import React, { useState } from 'react';
import { X, Clock, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { Transaction } from '../types';
import { Badge } from './Badge';
import { submitFeedback } from '../services/api';

interface TransactionDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
  onFeedbackSubmitted?: () => void;
}

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  transaction,
  onClose,
  onFeedbackSubmitted,
}) => {
  const [feedbackLabel, setFeedbackLabel] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      await submitFeedback(transaction.transaction_id, feedbackLabel, notes);
      setSuccessMsg('Ground-truth label submitted successfully!');
      if (onFeedbackSubmitted) onFeedbackSubmitted();
    } catch (err: any) {
      alert(`Failed to submit feedback: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const badgeVariant =
    transaction.decision === 'BLOCK'
      ? 'block'
      : transaction.decision === 'REVIEW'
      ? 'review'
      : 'approve';

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#0d0f17] border-l border-[#202538] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-[#202538] flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Transaction Inspector
          </div>
          <div className="text-sm font-mono font-medium text-white truncate max-w-xs mt-0.5">
            {transaction.transaction_id}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-[#1a2033] text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Core Decision Summary Card */}
        <div className="bg-[#121522] border border-[#23293d] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-medium">Risk Decision</span>
            <Badge label={transaction.decision} variant={badgeVariant} size="md" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1c2235]">
            <div>
              <div className="text-[11px] text-slate-400">Fraud Probability</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {(transaction.fraud_probability * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Monetary Amount</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                ${transaction.amount.toFixed(2)}{' '}
                <span className="text-xs text-slate-400 font-normal">
                  {transaction.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reason Codes */}
        {transaction.reason_codes && transaction.reason_codes.length > 0 && (
          <div className="bg-[#121522] border border-[#23293d] rounded-lg p-5">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Diagnostic Reason Codes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {transaction.reason_codes.map((code) => (
                <span
                  key={code}
                  className="px-2.5 py-1 rounded bg-[#1e2438] border border-[#2d3654] text-xs font-mono text-amber-300"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Metadata */}
        <div className="bg-[#121522] border border-[#23293d] rounded-lg p-5 space-y-3">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Transaction Metadata
          </div>
          <div className="grid grid-cols-2 gap-y-2.5 text-xs">
            <span className="text-slate-400">Customer ID:</span>
            <span className="font-mono text-slate-200 text-right">{transaction.customer_id}</span>

            <span className="text-slate-400">Merchant Category:</span>
            <span className="font-medium text-slate-200 text-right capitalize">
              {transaction.merchant_category}
            </span>

            <span className="text-slate-400">Payment Channel:</span>
            <span className="font-medium text-slate-200 text-right capitalize">
              {transaction.payment_channel}
            </span>

            <span className="text-slate-400">Merchant ID:</span>
            <span className="font-mono text-slate-200 text-right">{transaction.merchant_id}</span>

            <span className="text-slate-400">Timestamp (UTC):</span>
            <span className="font-mono text-slate-200 text-right text-[11px]">
              {new Date(transaction.timestamp).toLocaleString()}
            </span>

            <span className="text-slate-400">Model Version:</span>
            <span className="font-mono text-cyan-400 text-right text-[11px]">
              {transaction.model_version || 'kestrel-rf-v1.0.0'}
            </span>

            <span className="text-slate-400">Inference Latency:</span>
            <span className="font-mono text-slate-200 text-right">
              {transaction.inference_latency_ms || 3.1} ms
            </span>
          </div>
        </div>

        {/* Real-time Enriched Features Snapshot */}
        {transaction.features && (
          <div className="bg-[#121522] border border-[#23293d] rounded-lg p-5">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Hydrated Velocity Features (Redis)</span>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-slate-400">Txns (Last 1m):</span>
              <span className="font-mono text-slate-200 text-right">
                {transaction.features.txns_last_1m}
              </span>

              <span className="text-slate-400">Txns (Last 5m):</span>
              <span className="font-mono text-slate-200 text-right">
                {transaction.features.txns_last_5m}
              </span>

              <span className="text-slate-400">Txns (Last 1h):</span>
              <span className="font-mono text-slate-200 text-right">
                {transaction.features.txns_last_1h}
              </span>

              <span className="text-slate-400">Spent (Last 1h):</span>
              <span className="font-mono text-slate-200 text-right">
                ${transaction.features.amount_sum_1h.toFixed(2)}
              </span>

              <span className="text-slate-400">Amount / Average Ratio:</span>
              <span className="font-mono text-slate-200 text-right">
                {transaction.features.amount_to_avg_ratio}x
              </span>

              <span className="text-slate-400">Time Since Last Txn:</span>
              <span className="font-mono text-slate-200 text-right">
                {transaction.features.time_since_last_txn_sec}s
              </span>

              <span className="text-slate-400">Unique Merchants (1h):</span>
              <span className="font-mono text-slate-200 text-right">
                {transaction.features.distinct_merchants_1h}
              </span>

              <span className="text-slate-400">Nocturnal Flag:</span>
              <span className="font-mono text-slate-200 text-right">
                {transaction.features.is_night === 1 ? 'YES (00-05 UTC)' : 'NO'}
              </span>
            </div>
          </div>
        )}

        {/* Analyst Ground-Truth Feedback Form */}
        <div className="bg-[#121522] border border-[#23293d] rounded-lg p-5">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
            Analyst Investigation Feedback
          </div>

          {successMsg && (
            <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Confirmed Ground-Truth</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackLabel(1)}
                  className={`py-2 px-3 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    feedbackLabel === 1
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-[#181c2b] border-[#262c42] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Confirmed Fraud (1)
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackLabel(0)}
                  className={`py-2 px-3 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    feedbackLabel === 0
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-[#181c2b] border-[#262c42] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Legitimate (0)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Investigation Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cardholder confirmed account takeover; chargeback processed."
                rows={2}
                className="w-full bg-[#181c2b] border border-[#262c42] rounded p-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Recording...' : 'Submit Ground-Truth Label'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
