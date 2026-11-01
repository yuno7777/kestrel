import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Transaction } from '../types';
import { Badge } from '../components/Badge';
import { fetchTransactions } from '../services/api';

interface ExplorerProps {
  onSelectTransaction: (txn: Transaction) => void;
}

export const TransactionExplorer: React.FC<ExplorerProps> = ({ onSelectTransaction }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchTransactions(
        page,
        pageSize,
        decisionFilter !== 'ALL' ? decisionFilter : undefined,
        customerFilter ? customerFilter : undefined
      );
      setTransactions(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, decisionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Search Header */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-[#11131c] border border-[#202538] p-5 rounded-lg flex flex-col md:flex-row gap-4 items-center justify-between"
      >
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by customer token (e.g. cust_1001)..."
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full bg-[#161a29] border border-[#20263c] rounded pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={decisionFilter}
            onChange={(e) => {
              setDecisionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#161a29] border border-[#20263c] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Decisions</option>
            <option value="APPROVE">Approved</option>
            <option value="REVIEW">Review</option>
            <option value="BLOCK">Blocked</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
          >
            Search
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono whitespace-nowrap">
          Total Records: <span className="text-white font-bold">{total.toLocaleString()}</span>
        </div>
      </form>

      {/* Explorer Results Table */}
      <div className="bg-[#11131c] border border-[#202538] rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#151928] text-slate-400 border-b border-[#202538] uppercase font-mono text-[10px]">
            <tr>
              <th className="py-3 px-4">Timestamp (UTC)</th>
              <th className="py-3 px-4">Transaction ID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Decision</th>
              <th className="py-3 px-4">Model</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c2235]">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Loading transaction records...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No records found matching query.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const badgeVariant =
                  txn.decision === 'BLOCK'
                    ? 'block'
                    : txn.decision === 'REVIEW'
                    ? 'review'
                    : 'approve';

                return (
                  <tr
                    key={txn.transaction_id}
                    className="hover:bg-[#161a29] transition-colors cursor-pointer"
                    onClick={() => onSelectTransaction(txn)}
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(txn.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400 truncate max-w-[130px]">
                      {txn.transaction_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{txn.customer_id}</td>
                    <td className="py-3 px-4 font-mono text-white font-medium">
                      ${txn.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 capitalize">{txn.merchant_category}</td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {(txn.fraud_probability * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <Badge label={txn.decision || 'APPROVE'} variant={badgeVariant} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {txn.model_version || 'kestrel-rf-v1.0.0'}
                    </td>
                    <td className="py-3 px-4 text-right text-cyan-400 font-medium">
                      Inspect
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#1e2336] flex items-center justify-between text-xs text-slate-400">
          <span>
            Page <span className="font-semibold text-white">{page}</span> of{' '}
            <span className="font-semibold text-white">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded bg-[#161a29] border border-[#20263c] disabled:opacity-40 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded bg-[#161a29] border border-[#20263c] disabled:opacity-40 text-slate-300 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
