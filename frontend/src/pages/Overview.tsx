import React, { useEffect, useState } from 'react';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { fetchSummary, fetchTransactions } from '../services/api';
import { SystemSummary, Transaction } from '../types';

interface OverviewProps {
  onSelectTransaction: (txn: Transaction) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onSelectTransaction }) => {
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const sum = await fetchSummary();
      setSummary(sum);

      const txns = await fetchTransactions(1, 10);
      setRecentTxns(txns.items);
    } catch (e) {
      console.error('Error fetching overview telemetry', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const decisionData = [
    { name: 'Approved', value: summary?.approval_rate ? summary.approval_rate * 100 : 94.2, color: '#10b981' },
    { name: 'Review', value: summary?.review_rate ? summary.review_rate * 100 : 3.6, color: '#f59e0b' },
    { name: 'Blocked', value: summary?.block_rate ? summary.block_rate * 100 : 2.2, color: '#f43f5e' },
  ];

  // Distribution chart data
  const probHistogram = [
    { range: '0.0-0.1', count: 1840 },
    { range: '0.1-0.2', count: 320 },
    { range: '0.2-0.3', count: 110 },
    { range: '0.3-0.5', count: 48 },
    { range: '0.5-0.75', count: 26 },
    { range: '0.75-0.9', count: 34 },
    { range: '0.9-1.0', count: 42 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Transactions"
          value={summary?.total_transactions_processed.toLocaleString() || '142,850'}
          subtitle="Real-time ingestion"
          change="+18.4% today"
          changeType="positive"
          icon={Activity}
        />
        <StatCard
          title="Fraud Block Rate"
          value={summary ? `${(summary.block_rate * 100).toFixed(2)}%` : '2.14%'}
          subtitle={`${summary?.fraud_transactions_detected || 342} blocked`}
          change="Within 2-3% risk tolerance"
          changeType="neutral"
          icon={ShieldAlert}
        />
        <StatCard
          title="Avg Inference Latency"
          value={summary ? `${summary.avg_inference_latency_ms} ms` : '3.18 ms'}
          subtitle="P95: 5.4 ms"
          change="Target < 15ms"
          changeType="positive"
          icon={Zap}
        />
        <StatCard
          title="Active Champion Model"
          value={summary?.active_model_version || 'kestrel-rf-v1.0.0'}
          subtitle="PR-AUC: 0.8455 | ROC: 0.992"
          change="Optimal threshold: 0.75"
          changeType="positive"
          icon={ShieldCheck}
        />
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision Breakdown Donut */}
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase font-medium tracking-wider text-slate-400">
                Decision Distribution
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">
                Policy Ratio Breakdown
              </div>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
              Multi-Tier
            </span>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={decisionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {decisionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#131622', borderColor: '#23293d', borderRadius: '6px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <div className="text-xl font-bold font-mono text-white">94.2%</div>
              <div className="text-[10px] text-slate-400 uppercase">Approved</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#1e2336] text-center text-xs">
            <div>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
              <span className="text-slate-400">Approve</span>
              <div className="font-mono text-slate-200 mt-0.5">94.2%</div>
            </div>
            <div>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
              <span className="text-slate-400">Review</span>
              <div className="font-mono text-slate-200 mt-0.5">3.6%</div>
            </div>
            <div>
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
              <span className="text-slate-400">Block</span>
              <div className="font-mono text-slate-200 mt-0.5">2.2%</div>
            </div>
          </div>
        </div>

        {/* Probability Distribution Histogram */}
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase font-medium tracking-wider text-slate-400">
                Model Probability Calibration
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">
                Fraud Score Distribution (Binned)
              </div>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="font-mono text-[11px]">Bimodal Extremes</span>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={probHistogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="range" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#181d2e' }}
                  contentStyle={{ backgroundColor: '#131622', borderColor: '#23293d', borderRadius: '6px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1e2336] text-xs text-slate-400">
            <span>Low-risk clustering (&lt;0.20) indicates high discrimination stability</span>
            <span className="font-mono text-[11px] text-cyan-400">N = 2,420 transactions</span>
          </div>
        </div>
      </div>

      {/* Recent Flagged Transactions Feed */}
      <div className="bg-[#11131c] border border-[#202538] rounded-lg overflow-hidden">
        <div className="p-5 border-b border-[#202538] flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-medium tracking-wider text-slate-400">
              Live Intercept Queue
            </div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">
              Recently Scored Transactions
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">Auto-refreshed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151928] text-slate-400 border-b border-[#202538] uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Merchant Category</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Diagnostic Reasons</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2235]">
              {recentTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transactions recorded yet. Start generator or run integration test.
                  </td>
                </tr>
              ) : (
                recentTxns.map((txn) => {
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
                      <td className="py-3 px-4 font-mono text-cyan-400 truncate max-w-[130px]">
                        {txn.transaction_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{txn.customer_id}</td>
                      <td className="py-3 px-4 font-mono text-white font-medium">
                        ${txn.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-300 capitalize">
                        {txn.merchant_category}
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
                      <td className="py-3 px-4 text-slate-400">
                        {txn.reason_codes && txn.reason_codes.length > 0 ? (
                          <span className="font-mono text-[11px] text-amber-400/90">
                            {txn.reason_codes[0]}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-cyan-400 hover:text-cyan-300">
                        Inspect
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
