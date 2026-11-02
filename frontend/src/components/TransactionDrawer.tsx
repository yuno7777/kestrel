import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import { Transaction } from '../types';
import { submitFeedback } from '../services/api';

interface TransactionDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
  onFeedbackSubmitted?: () => void;
}

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const prettyLabel = (value: string) => value.replaceAll('_', ' ');

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  transaction,
  onClose,
  onFeedbackSubmitted,
}) => {
  const [feedbackLabel, setFeedbackLabel] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!transaction) return;
    setFeedbackLabel(1);
    setNotes('');
    setMessage(null);
  }, [transaction?.transaction_id]);

  useEffect(() => {
    if (!transaction) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [transaction, onClose]);

  if (!transaction) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await submitFeedback(transaction.transaction_id, feedbackLabel, notes.trim());
      setMessage({ kind: 'success', text: 'Feedback recorded.' });
      onFeedbackSubmitted?.();
    } catch (cause) {
      console.error('Unable to submit transaction feedback', cause);
      setMessage({ kind: 'error', text: 'Feedback could not be recorded.' });
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    ['Customer', transaction.customer_id, true],
    ['Merchant', transaction.merchant_id, true],
    ['Category', prettyLabel(transaction.merchant_category), false],
    ['Channel', prettyLabel(transaction.payment_channel), false],
    ['Timestamp', new Date(transaction.timestamp).toLocaleString(), true],
    ['Model version', transaction.model_version ?? '—', true],
    ['Inference latency', transaction.inference_latency_ms == null ? '—' : `${transaction.inference_latency_ms.toFixed(2)} ms`, true],
  ] as const;

  const featureRows = transaction.features ? [
    ['Transactions · 1 min', transaction.features.txns_last_1m.toLocaleString()],
    ['Transactions · 5 min', transaction.features.txns_last_5m.toLocaleString()],
    ['Transactions · 1 hour', transaction.features.txns_last_1h.toLocaleString()],
    ['Spend · 1 hour', formatMoney(transaction.features.amount_sum_1h, transaction.currency)],
    ['Amount to average', `${transaction.features.amount_to_avg_ratio.toFixed(2)}×`],
    ['Time since previous', `${transaction.features.time_since_last_txn_sec.toLocaleString()} sec`],
    ['Merchants · 1 hour', transaction.features.distinct_merchants_1h.toLocaleString()],
    ['High risk category', transaction.features.is_high_risk_category ? 'Yes' : 'No'],
  ] : [];

  return (
    <div className="transaction-inspector" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <button type="button" className="transaction-inspector-backdrop" onClick={onClose} aria-label="Close transaction inspector" />
      <aside className="transaction-drawer" role="dialog" aria-modal="true" aria-labelledby="transaction-drawer-title">
        <header className="transaction-drawer-header">
          <div className="min-w-0">
            <div className="drawer-kicker">Transaction record</div>
            <h2 id="transaction-drawer-title" title={transaction.transaction_id}>{transaction.transaction_id}</h2>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close inspector"><X size={17} strokeWidth={1.5} /></button>
        </header>

        <div className="transaction-drawer-content">
          <section className="drawer-summary" aria-label="Decision summary">
            <div className="drawer-summary-top">
              <span className="drawer-label">Decision</span>
              <span className="drawer-decision">{transaction.decision}</span>
            </div>
            <div className="drawer-summary-values">
              <div><span className="drawer-label">Risk score</span><strong>{(transaction.fraud_probability * 100).toFixed(1)}%</strong></div>
              <div><span className="drawer-label">Amount</span><strong>{formatMoney(transaction.amount, transaction.currency)}</strong></div>
            </div>
          </section>

          <section className="drawer-section" aria-labelledby="drawer-reasons-title">
            <div className="drawer-section-heading"><h3 id="drawer-reasons-title">Decision reasons</h3><span>{transaction.reason_codes.length}</span></div>
            {transaction.reason_codes.length ? (
              <ul className="drawer-reason-list">
                {transaction.reason_codes.map((reason) => <li key={reason}><ChevronRight size={13} strokeWidth={1.4} />{prettyLabel(reason)}</li>)}
              </ul>
            ) : <p className="drawer-muted">No reason codes were returned for this transaction.</p>}
          </section>

          <section className="drawer-section" aria-labelledby="drawer-details-title">
            <div className="drawer-section-heading"><h3 id="drawer-details-title">Transaction details</h3></div>
            <dl className="drawer-details">
              {fields.map(([label, value, mono]) => (
                <div className="drawer-detail-row" key={label}><dt>{label}</dt><dd className={mono ? 'drawer-mono' : ''}>{value}</dd></div>
              ))}
            </dl>
          </section>

          {featureRows.length > 0 && (
            <section className="drawer-section" aria-labelledby="drawer-features-title">
              <div className="drawer-section-heading"><h3 id="drawer-features-title">Velocity features</h3></div>
              <dl className="drawer-details">
                {featureRows.map(([label, value]) => <div className="drawer-detail-row" key={label}><dt>{label}</dt><dd className="drawer-mono">{value}</dd></div>)}
              </dl>
            </section>
          )}

          <section className="drawer-section" aria-labelledby="drawer-feedback-title">
            <div className="drawer-section-heading"><h3 id="drawer-feedback-title">Analyst feedback</h3></div>
            {message && <div className={`drawer-message ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.kind === 'success' && <Check size={13} />}{message.text}</div>}
            <form className="drawer-feedback" onSubmit={handleSubmit}>
              <fieldset disabled={submitting}>
                <legend>Ground truth</legend>
                <div className="drawer-choice-row">
                  <label className={feedbackLabel === 1 ? 'selected' : ''}><input type="radio" name="feedback" value="1" checked={feedbackLabel === 1} onChange={() => setFeedbackLabel(1)} />Fraud</label>
                  <label className={feedbackLabel === 0 ? 'selected' : ''}><input type="radio" name="feedback" value="0" checked={feedbackLabel === 0} onChange={() => setFeedbackLabel(0)} />Legitimate</label>
                </div>
              </fieldset>
              <label className="drawer-notes-label" htmlFor="transaction-feedback-notes">Notes <span>Optional</span></label>
              <textarea id="transaction-feedback-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Add investigation context" disabled={submitting} />
              <button className="drawer-submit" type="submit" disabled={submitting}>{submitting ? 'Recording…' : 'Record feedback'}</button>
            </form>
          </section>
        </div>
      </aside>
    </div>
  );
};
