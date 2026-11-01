import React, { useState, useEffect } from 'react';
import { Play, Pause, Filter, Search, RotateCcw, Activity } from 'lucide-react';
import { Transaction, Decision } from '../types';
import { Badge } from '../components/Badge';
import { subscribeToLiveStream, fetchTransactions } from '../services/api';

interface LiveTransactionsProps {
  onSelectTransaction: (txn: Transaction) => void;
}

export const LiveTransactions: React.FC<LiveTransactionsProps> = ({ onSelectTransaction }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Initial fetch of recent transactions
    fetchTransactions(1, 30).then((res) => {
      setTransactions(res.items);
    });

    // Subscribe to SSE stream
    const unsubscribe = subscribeToLiveStream(
      (newTxn) => {
        if (!isLive) return;
        setTransactions((prev) => [newTxn, ...prev.slice(0, 99)]);
      },
      (err) => console.warn('Live stream disconnected; reconnecting...', err)
    );

    return () => unsubscribe();
  }, [isLive]);

  const filtered = transactions.filter((t) => {
    if (filterDecision !== 'ALL' && t.decision !== filterDecision) return false;
    if (
      searchQuery &&
      !t.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !t.customer_id.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#11131c] border border-[#202538] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors border ${
              isLive
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? 'Pause Live Ingestion' : 'Resume Live Ingestion'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 px-2 py-1 bg-[#161a29] rounded border border-[#20263c]">
            <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Buffer: {transactions.length} events</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Decision Pill Filter */}
          <div className="flex items-center bg-[#161a29] p-0.5 rounded border border-[#20263c] text-xs">
            {['ALL', 'APPROVE', 'REVIEW', 'BLOCK'].map((d) => (
              <button
                key={d}
                onClick={() => setFilterDecision(d)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterDecision === d
                    ? 'bg-[#252c44] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search txn or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#161a29] border border-[#20263c] rounded pl-8 pr-3 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Real-Time Table */}
      <div className="bg-[#11131c] border border-[#202538] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151928] text-slate-400 border-b border-[#202538] uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Time (UTC)</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Fraud Score</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2235]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No transactions matching filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((txn) => {
                  const badgeVariant =
                    txn.decision === 'BLOCK'
                      ? 'block'
                      : txn.decision === 'REVIEW'
                      ? 'review'
                      : 'approve';

                  return (
                    <tr
                      key={txn.transaction_id}
                      className="hover:bg-[#161a29] transition-colors cursor-pointer group"
                      onClick={() => onSelectTransaction(txn)}
                    >
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {new Date(txn.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400 truncate max-w-[120px]">
                        {txn.transaction_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{txn.customer_id}</td>
                      <td className="py-3 px-4 font-mono text-white font-medium">
                        ${txn.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-300 capitalize">
                        {txn.merchant_category}
                      </td>
                      <td className="py-3 px-4 text-slate-400 capitalize">
                        {txn.payment_channel.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`font-semibold ${
                            txn.fraud_probability >= 0.75
                              ? 'text-rose-400'
                              : txn.fraud_probability >= 0.3
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {(txn.fraud_probability * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge label={txn.decision} variant={badgeVariant} />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {txn.inference_latency_ms ? `${txn.inference_latency_ms}ms` : '3.1ms'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-cyan-400 group-hover:text-cyan-300">
                        View &rarr;
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
