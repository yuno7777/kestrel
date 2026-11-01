import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { BarChart3, Sliders, ShieldCheck, DollarSign } from 'lucide-react';

export const ModelPerformance: React.FC = () => {
  const [selectedThreshold, setSelectedThreshold] = useState<number>(0.75);

  const thresholdData = [
    { threshold: 0.2, precision: 0.38, recall: 0.98, f1: 0.55, cost: 4200 },
    { threshold: 0.3, precision: 0.49, recall: 0.96, f1: 0.65, cost: 3600 },
    { threshold: 0.4, precision: 0.62, recall: 0.94, f1: 0.75, cost: 2900 },
    { threshold: 0.5, precision: 0.71, recall: 0.90, f1: 0.79, cost: 2450 },
    { threshold: 0.6, precision: 0.82, recall: 0.86, f1: 0.84, cost: 2100 },
    { threshold: 0.7, precision: 0.89, recall: 0.82, f1: 0.85, cost: 1850 },
    { threshold: 0.75, precision: 0.93, recall: 0.78, f1: 0.85, cost: 1720 },
    { threshold: 0.85, precision: 0.97, recall: 0.65, f1: 0.78, cost: 2300 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Model Evaluation & Decision Optimization
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Precision-Recall dynamics, confusion matrix breakdown, and business financial loss curves.
        </p>
      </div>

      {/* Grid: Curves & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Precision vs Recall vs Threshold Chart */}
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase font-medium tracking-wider text-slate-400">
                Precision-Recall Tradeoff
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">
                Evaluation Curves Across Cutoff Thresholds
              </div>
            </div>
            <div className="text-xs text-cyan-400 font-mono">PR-AUC: 0.8455</div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={thresholdData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1c2235" strokeDasharray="3 3" />
                <XAxis dataKey="threshold" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} domain={[0.2, 1.0]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#131622', borderColor: '#23293d', borderRadius: '6px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="precision"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Precision"
                />
                <Line
                  type="monotone"
                  dataKey="recall"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  name="Recall"
                />
                <Line
                  type="monotone"
                  dataKey="f1"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="F1-Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2x2 Confusion Matrix */}
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-medium tracking-wider text-slate-400">
              Confusion Matrix
            </div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5 mb-4">
              Holdout Test Set (N = 6,250)
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#161a29] border border-emerald-500/20 rounded p-4">
                <div className="text-[10px] uppercase text-emerald-400 font-medium">
                  True Negative
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">6,028</div>
                <div className="text-[10px] text-slate-400 mt-1">Legit correctly passed</div>
              </div>
              <div className="bg-[#161a29] border border-rose-500/20 rounded p-4">
                <div className="text-[10px] uppercase text-rose-400 font-medium">
                  False Positive
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">58</div>
                <div className="text-[10px] text-slate-400 mt-1">Legit challenged</div>
              </div>
              <div className="bg-[#161a29] border border-amber-500/20 rounded p-4">
                <div className="text-[10px] uppercase text-amber-400 font-medium">
                  False Negative
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">17</div>
                <div className="text-[10px] text-slate-400 mt-1">Fraud missed</div>
              </div>
              <div className="bg-[#161a29] border border-cyan-500/20 rounded p-4">
                <div className="text-[10px] uppercase text-cyan-400 font-medium">
                  True Positive
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">147</div>
                <div className="text-[10px] text-slate-400 mt-1">Fraud intercepted</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1e2336] text-[11px] text-slate-400 text-center">
            Recall: <span className="text-emerald-400 font-bold">89.6%</span> &bull; Precision:{' '}
            <span className="text-cyan-400 font-bold">71.7%</span>
          </div>
        </div>
      </div>

      {/* Threshold & Cost Analysis Table */}
      <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase font-medium tracking-wider text-slate-400">
              Business Loss Curve Analysis
            </div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">
              Simulated Loss vs Decision Cutoff ($250 chargeback FN, $15 friction FP)
            </div>
          </div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Optimal Cost Minimizer: 0.75</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151928] text-slate-400 border-b border-[#202538] uppercase font-mono text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Threshold</th>
                <th className="py-2.5 px-4">Precision</th>
                <th className="py-2.5 px-4">Recall</th>
                <th className="py-2.5 px-4">F1 Score</th>
                <th className="py-2.5 px-4">Expected Monthly Cost</th>
                <th className="py-2.5 px-4 text-right">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2235]">
              {thresholdData.map((row) => (
                <tr
                  key={row.threshold}
                  className={`hover:bg-[#161a29] transition-colors ${
                    row.threshold === 0.75 ? 'bg-cyan-950/20 font-medium' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 font-mono text-cyan-400">
                    {row.threshold.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-200">
                    {(row.precision * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-200">
                    {(row.recall * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-200">
                    {(row.f1 * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 font-mono text-white font-semibold">
                    ${row.cost.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {row.threshold === 0.75 ? (
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                        ACTIVE PRODUCTION POLICY
                      </span>
                    ) : row.threshold < 0.4 ? (
                      <span className="text-amber-400 text-[10px]">Excessive False Positives</span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Elevated Fraud Slippage</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
