import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { fetchTransactions, subscribeToLiveStream } from '../services/api';
import { Decision, Transaction } from '../types';

interface LiveTransactionsProps {
  onSelectTransaction: (txn: Transaction) => void;
}

const formatMoney = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};

export const LiveTransactions: React.FC<LiveTransactionsProps> = ({ onSelectTransaction }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [filterDecision, setFilterDecision] = useState<Decision | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isLiveRef = useRef(isLive);

  useEffect(() => { isLiveRef.current = isLive; }, [isLive]);

  useEffect(() => {
    fetchTransactions(1, 30).then((response) => setTransactions(response.items)).catch((cause) => {
      console.error('Unable to load recent transactions', cause);
      setError(true);
    }).finally(() => setLoading(false));

    return subscribeToLiveStream((transaction) => {
      if (!isLiveRef.current) return;
      setTransactions((current) => [transaction, ...current.filter((item) => item.transaction_id !== transaction.transaction_id)].slice(0, 100));
    }, () => setError(true));
  }, []);

  const filtered = useMemo(() => transactions.filter((transaction) => {
    if (filterDecision !== 'ALL' && transaction.decision !== filterDecision) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return transaction.transaction_id.toLowerCase().includes(query) || transaction.customer_id.toLowerCase().includes(query);
    }
    return true;
  }), [filterDecision, searchQuery, transactions]);

  return (
    <section className="page-view" aria-label="Live transactions">
      <PageHeader
        title="Live transactions"
        description="Recent scored events from the stream. Select a row to inspect its features and decision reasons."
        action={<button type="button" className="page-control flex items-center gap-2" onClick={() => setIsLive((value) => !value)}>{isLive ? <Pause size={13} strokeWidth={1.4} /> : <Play size={13} strokeWidth={1.4} />}{isLive ? 'Pause updates' : 'Resume updates'}</button>}
      />

      {error && <div className="page-note" role="status">Some transaction data could not be loaded. The feed will continue reconnecting.</div>}

      <div className="page-card">
        <div className="page-card-body flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="page-status" data-state={isLive ? 'ready' : 'unknown'}>{isLive ? 'Stream updates on' : 'Updates paused'}</span>
            <span className="page-card-caption">{transactions.length.toLocaleString()} recent events buffered</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-1 rounded-full bg-[#111] p-1">
              {(['ALL', 'APPROVE', 'REVIEW', 'BLOCK'] as const).map((decision) => (
                <button type="button" key={decision} className={`page-control ${filterDecision === decision ? 'page-control-primary' : ''}`} onClick={() => setFilterDecision(decision)} aria-pressed={filterDecision === decision}>
                  {decision === 'ALL' ? 'All' : decision}
                </button>
              ))}
            </div>
            <label className="relative flex items-center">
              <Search size={13} strokeWidth={1.4} className="absolute left-3 page-icon-muted" aria-hidden="true" />
              <input className="page-control pl-9 w-full sm:w-56" type="search" placeholder="Transaction or customer" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label="Search transactions" />
            </label>
          </div>
        </div>
      </div>

      <section className="page-card" aria-label="Recent transaction feed">
        <div className="page-card-heading">
          <div><div className="page-card-title">Transaction feed</div><div className="page-card-caption">{filtered.length.toLocaleString()} matching rows</div></div>
        </div>
        <div className="page-table-wrap">
          <table className="page-table">
            <thead><tr><th scope="col">Time</th><th scope="col">Transaction</th><th scope="col">Customer</th><th scope="col">Amount</th><th scope="col">Category</th><th scope="col">Channel</th><th scope="col">Risk</th><th scope="col">Decision</th><th scope="col">Latency</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.slice(0, 50).map((transaction) => (
                <tr key={transaction.transaction_id} onClick={() => onSelectTransaction(transaction)} tabIndex={0} onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onSelectTransaction(transaction);
                  }
                }}>
                  <td className="numeric">{new Date(transaction.timestamp).toLocaleTimeString()}</td>
                  <td className="numeric">{transaction.transaction_id}</td>
                  <td className="numeric">{transaction.customer_id}</td>
                  <td className="numeric">{formatMoney(transaction.amount, transaction.currency)}</td>
                  <td>{transaction.merchant_category.replaceAll('_', ' ')}</td>
                  <td>{transaction.payment_channel.replaceAll('_', ' ')}</td>
                  <td className="numeric">{(transaction.fraud_probability * 100).toFixed(1)}%</td>
                  <td><Badge label={transaction.decision} variant={transaction.decision === 'BLOCK' ? 'block' : transaction.decision === 'REVIEW' ? 'review' : 'approve'} /></td>
                  <td className="numeric">{transaction.inference_latency_ms == null ? '—' : `${transaction.inference_latency_ms.toFixed(2)} ms`}</td>
                </tr>
              )) : (
                <tr><td className="page-empty" colSpan={9}>{loading ? 'Loading recent events…' : 'No transactions match these filters.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
