import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, UserCheck, Search, Filter } from 'lucide-react';
import { Transaction } from '../types';
import { Badge } from '../components/Badge';
import { fetchFraudAlerts, submitFeedback, fetchTransactionDetail } from '../services/api';

interface FraudDetectionProps {
  onSelectTransaction: (txn: Transaction) => void;
}

export const FraudDetection: React.FC<FraudDetectionProps> = ({ onSelectTransaction }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadAlerts = async () => {
    try {
      const data = await fetchFraudAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load fraud alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickFeedback = async (
    txnId: string,
    label: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      await submitFeedback(txnId, label, 'Quick resolution from alerts table');
      await loadAlerts();
    } catch (err) {
      alert('Feedback submission failed');
    }
  };

  const handleRowClick = async (txnId: string) => {
    try {
      const detail = await fetchTransactionDetail(txnId);
      onSelectTransaction(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterType === 'BLOCK' && a.decision !== 'BLOCK') return false;
    if (filterType === 'REVIEW' && a.decision !== 'REVIEW') return false;
    if (filterType === 'UNRESOLVED' && a.feedback_label !== null) return false;
    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#11131c] border border-rose-500/20 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold uppercase tracking-wider">
            <span>High Risk Blocks</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {alerts.filter((a) => a.decision === 'BLOCK').length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Immediate transaction declines</div>
        </div>

        <div className="bg-[#11131c] border border-amber-500/20 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase tracking-wider">
            <span>Manual Review Queue</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {alerts.filter((a) => a.decision === 'REVIEW').length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Pending analyst verification</div>
        </div>

        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Investigation Resolution</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {alerts.filter((a) => a.feedback_label !== null).length} / {alerts.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Ground-truth labels recorded</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-[#11131c] border border-[#202538] p-4 rounded-lg">
        <div className="flex items-center gap-2">
          {['ALL', 'UNRESOLVED', 'BLOCK', 'REVIEW'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filterType === f
                  ? 'bg-[#1e2438] text-white border border-[#2d3654]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-slate-400">
          Showing {filteredAlerts.length} investigations
        </span>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#11131c] border border-[#202538] rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#151928] text-slate-400 border-b border-[#202538] uppercase font-mono text-[10px]">
            <tr>
              <th className="py-3 px-4">Alert Time</th>
              <th className="py-3 px-4">Transaction ID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Decision</th>
              <th className="py-3 px-4">Reason Codes</th>
              <th className="py-3 px-4">Status / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c2235]">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No alerts currently require manual review.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((a) => (
                <tr
                  key={a.transaction_id}
                  className="hover:bg-[#161a29] transition-colors cursor-pointer"
                  onClick={() => handleRowClick(a.transaction_id)}
                >
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-400">{a.transaction_id}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{a.customer_id}</td>
                  <td className="py-3 px-4 font-mono text-white font-medium">
                    ${a.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-300 capitalize">{a.merchant_category}</td>
                  <td className="py-3 px-4 font-mono font-bold text-rose-400">
                    {(a.fraud_probability * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      label={a.decision}
                      variant={a.decision === 'BLOCK' ? 'block' : 'review'}
                    />
                  </td>
                  <td className="py-3 px-4">
                    {a.reason_codes && a.reason_codes.length > 0 ? (
                      <span className="font-mono text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/30 px-2 py-0.5 rounded">
                        {a.reason_codes[0]}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {a.feedback_label !== null ? (
                      <span
                        className={`font-medium ${
                          a.feedback_label === 1 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {a.feedback_label === 1 ? 'Confirmed Fraud' : 'Legitimate'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleQuickFeedback(a.transaction_id, 1, e)}
                          className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[10px] font-medium"
                        >
                          Confirm Fraud
                        </button>
                        <button
                          onClick={(e) => handleQuickFeedback(a.transaction_id, 0, e)}
                          className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-medium"
                        >
                          Dismiss (Legit)
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
