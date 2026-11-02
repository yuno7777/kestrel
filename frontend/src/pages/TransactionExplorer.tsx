import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { fetchTransactions } from '../services/api';
import { Transaction } from '../types';

interface ExplorerProps {
  onSelectTransaction: (txn: Transaction) => void;
}

const formatMoney = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};

export const TransactionExplorer: React.FC<ExplorerProps> = ({ onSelectTransaction }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [customerInput, setCustomerInput] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pageSize = 25;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchTransactions(page, pageSize, decisionFilter, customerFilter || undefined);
      setTransactions(response.items);
      setTotal(response.total);
      setError(false);
    } catch (cause) {
      console.error('Unable to load transaction results', cause);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [customerFilter, decisionFilter, page]);

  useEffect(() => { void loadData(); }, [loadData]);

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setCustomerFilter(customerInput.trim());
    if (page === 1 && customerInput.trim() === customerFilter) void loadData();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="page-view" aria-label="Transaction search">
      <PageHeader
        title="Transaction search"
        description="Filter persisted transactions by customer token and decision, then inspect a scored event."
      />

      {error && <div className="page-note" role="status">The transaction query failed. Adjust the filters or retry.</div>}

      <form className="page-card page-card-body flex flex-col lg:flex-row lg:items-center gap-3" onSubmit={search}>
        <label className="relative flex-1 min-w-0">
          <Search size={14} strokeWidth={1.4} className="absolute left-3 top-1/2 -translate-y-1/2 page-icon-muted" aria-hidden="true" />
          <input className="page-control pl-9 w-full" type="search" value={customerInput} onChange={(event) => setCustomerInput(event.target.value)} placeholder="Customer token" aria-label="Customer token" />
        </label>
        <select className="page-select" value={decisionFilter} onChange={(event) => { setDecisionFilter(event.target.value); setPage(1); }} aria-label="Decision filter">
          <option value="ALL">All decisions</option>
          <option value="APPROVE">Approved</option>
          <option value="REVIEW">Review</option>
          <option value="BLOCK">Blocked</option>
        </select>
        <button type="submit" className="page-control page-control-primary">Search</button>
        <div className="page-card-caption lg:ml-auto">{total.toLocaleString()} matching records</div>
      </form>

      <section className="page-card" aria-label="Search results">
        <div className="page-table-wrap">
          <table className="page-table">
            <thead><tr><th scope="col">Timestamp</th><th scope="col">Transaction</th><th scope="col">Customer</th><th scope="col">Amount</th><th scope="col">Category</th><th scope="col">Risk score</th><th scope="col">Decision</th><th scope="col">Model</th><th scope="col"></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td className="page-empty" colSpan={9}>Loading transaction records…</td></tr>
              ) : transactions.length ? transactions.map((transaction) => (
                <tr key={transaction.transaction_id} onClick={() => onSelectTransaction(transaction)} tabIndex={0} onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onSelectTransaction(transaction);
                  }
                }}>
                  <td className="numeric">{new Date(transaction.timestamp).toLocaleString()}</td>
                  <td className="numeric">{transaction.transaction_id}</td>
                  <td className="numeric">{transaction.customer_id}</td>
                  <td className="numeric">{formatMoney(transaction.amount, transaction.currency)}</td>
                  <td>{transaction.merchant_category.replaceAll('_', ' ')}</td>
                  <td className="numeric">{(transaction.fraud_probability * 100).toFixed(1)}%</td>
                  <td><Badge label={transaction.decision} variant={transaction.decision === 'BLOCK' ? 'block' : transaction.decision === 'REVIEW' ? 'review' : 'approve'} /></td>
                  <td className="numeric">{transaction.model_version ?? '—'}</td>
                  <td><button type="button" className="page-control" onClick={(event) => { event.stopPropagation(); onSelectTransaction(transaction); }}>Inspect</button></td>
                </tr>
              )) : (
                <tr><td className="page-empty" colSpan={9}>No transactions match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="page-card-footer flex items-center justify-between gap-4">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" aria-label="Previous page" className="page-control" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={14} /></button>
            <button type="button" aria-label="Next page" className="page-control" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight size={14} /></button>
          </div>
        </div>
      </section>
    </section>
  );
};
