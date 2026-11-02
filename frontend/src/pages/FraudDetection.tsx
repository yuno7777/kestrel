import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { fetchFraudAlerts, fetchTransactionDetail, submitFeedback } from '../services/api';
import { Transaction } from '../types';

interface FraudDetectionProps {
  onSelectTransaction: (txn: Transaction) => void;
}

const formatMoney = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};

export const FraudDetection: React.FC<FraudDetectionProps> = ({ onSelectTransaction }) => {
  const [alerts, setAlerts] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNRESOLVED' | 'BLOCK' | 'REVIEW'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setAlerts(await fetchFraudAlerts());
      setError(null);
    } catch (cause) {
      console.error('Unable to load fraud alerts', cause);
      setError('The fraud alert queue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
    const timer = window.setInterval(() => void loadAlerts(), 10000);
    return () => window.clearInterval(timer);
  }, [loadAlerts]);

  const recordFeedback = async (transactionId: string, label: number) => {
    setNotice(null);
    try {
      await submitFeedback(transactionId, label);
      setNotice('Feedback recorded.');
      await loadAlerts();
    } catch (cause) {
      console.error('Unable to record analyst feedback', cause);
      setError('Feedback could not be recorded.');
    }
  };

  const openTransaction = async (transactionId: string) => {
    try { onSelectTransaction(await fetchTransactionDetail(transactionId)); }
    catch (cause) {
      console.error('Unable to load transaction details', cause);
      setError('Transaction details could not be loaded.');
    }
  };

  const filteredAlerts = useMemo(() => alerts.filter((alert) => {
    if (filter === 'BLOCK' && alert.decision !== 'BLOCK') return false;
    if (filter === 'REVIEW' && alert.decision !== 'REVIEW') return false;
    if (filter === 'UNRESOLVED' && alert.feedback_label != null) return false;
    return true;
  }), [alerts, filter]);

  const openReviews = alerts.filter((alert) => alert.decision === 'REVIEW' && alert.feedback_label == null).length;
  const labelled = alerts.filter((alert) => alert.feedback_label != null).length;

  return (
    <section className="page-view" aria-label="Fraud investigations">
      <PageHeader
        title="Fraud investigations"
        description="Review blocked and escalated transactions, inspect decision signals, and record feedback."
        action={<span className="page-card-caption">Refreshes every 10 seconds</span>}
      />

      {error && <div className="page-note" role="alert">{error}</div>}
      {notice && <div className="page-note" role="status">{notice}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className="page-metric"><div className="page-metric-label">Blocks in result</div><div className="page-metric-value">{alerts.filter((alert) => alert.decision === 'BLOCK').length}</div><div className="page-metric-note">Returned by the fraud alerts endpoint</div></article>
        <article className="page-metric"><div className="page-metric-label">Open review cases</div><div className="page-metric-value">{openReviews}</div><div className="page-metric-note">Review decisions without analyst feedback</div></article>
        <article className="page-metric"><div className="page-metric-label">Feedback recorded</div><div className="page-metric-value">{labelled}</div><div className="page-metric-note">Labeled cases in the returned result</div></article>
      </div>

      <section className="page-card" aria-label="Alert queue filters">
        <div className="page-card-body flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1 rounded-full bg-[#111] p-1">
            {(['ALL', 'UNRESOLVED', 'BLOCK', 'REVIEW'] as const).map((value) => (
              <button type="button" key={value} className={`page-control ${filter === value ? 'page-control-primary' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'ALL' ? 'All alerts' : value === 'UNRESOLVED' ? 'Unresolved' : value}</button>
            ))}
          </div>
          <span className="page-card-caption">{filteredAlerts.length.toLocaleString()} shown</span>
        </div>
      </section>

      <section className="page-card" aria-label="Fraud alert queue">
        <div className="page-table-wrap">
          <table className="page-table">
            <thead><tr><th scope="col">Time</th><th scope="col">Transaction</th><th scope="col">Customer</th><th scope="col">Amount</th><th scope="col">Category</th><th scope="col">Score</th><th scope="col">Decision</th><th scope="col">Reason</th><th scope="col">Analyst feedback</th></tr></thead>
            <tbody>
              {filteredAlerts.length ? filteredAlerts.map((alert) => (
                <tr key={alert.transaction_id} tabIndex={0} onClick={() => void openTransaction(alert.transaction_id)} onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    void openTransaction(alert.transaction_id);
                  }
                }}>
                  <td className="numeric">{new Date(alert.timestamp).toLocaleTimeString()}</td>
                  <td className="numeric">{alert.transaction_id}</td>
                  <td className="numeric">{alert.customer_id}</td>
                  <td className="numeric">{formatMoney(alert.amount, alert.currency)}</td>
                  <td>{alert.merchant_category.replaceAll('_', ' ')}</td>
                  <td className="numeric">{(alert.fraud_probability * 100).toFixed(1)}%</td>
                  <td><Badge label={alert.decision} variant={alert.decision === 'BLOCK' ? 'block' : 'review'} /></td>
                  <td className="numeric">{alert.reason_codes?.[0] ?? '—'}</td>
                  <td>
                    {alert.feedback_label != null ? (
                      <span>{alert.feedback_label === 1 ? 'Confirmed fraud' : 'Marked legitimate'}</span>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" className="page-control" onClick={(event) => { event.stopPropagation(); void recordFeedback(alert.transaction_id, 1); }}>Confirm</button>
                        <button type="button" className="page-control" onClick={(event) => { event.stopPropagation(); void recordFeedback(alert.transaction_id, 0); }}>Dismiss</button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td className="page-empty" colSpan={9}>{loading ? 'Loading alert queue…' : 'No alerts match this filter.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
