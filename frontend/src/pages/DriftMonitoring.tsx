import React, { useEffect, useState } from 'react';
import { GitBranch, AlertTriangle, CheckCircle, RefreshCw, BarChart2 } from 'lucide-react';
import { DriftReport } from '../types';
import { fetchDriftReport } from '../services/api';

export const DriftMonitoring: React.FC = () => {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDrift = async () => {
    setLoading(true);
    try {
      const data = await fetchDriftReport();
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrift();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Statistical Data & Feature Drift
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Continuous distribution monitoring using Population Stability Index (PSI) & Kolmogorov-Smirnov test.
          </p>
        </div>
        <button
          onClick={loadDrift}
          className="px-3 py-1.5 bg-[#161a29] border border-[#20263c] rounded text-xs text-slate-300 hover:text-white flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-compute Drift</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Overall Feature Drift
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                report?.overall_status === 'STABLE'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="text-xl font-bold font-mono text-white">
              {report?.overall_status || 'STABLE'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {report?.evaluated_features_count || 1} feature distributions evaluated
          </div>
        </div>

        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            PSI Threshold Standards
          </div>
          <div className="mt-2 space-y-1 text-xs font-mono">
            <div className="text-emerald-400">&lt; 0.10: Stable / Baseline Aligned</div>
            <div className="text-amber-400">0.10 - 0.20: Moderate Shift Warning</div>
            <div className="text-rose-400">&gt; 0.20: Significant Drift Alert</div>
          </div>
        </div>

        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Reference Baseline
          </div>
          <div className="text-lg font-bold font-mono text-white mt-2">kestrel-rf-v1.0.0</div>
          <div className="text-xs text-slate-400 mt-1">Sample Count: 18,750 holdout events</div>
        </div>
      </div>

      {/* Feature Drift Table */}
      <div className="bg-[#11131c] border border-[#202538] rounded-lg overflow-hidden">
        <div className="p-5 border-b border-[#202538]">
          <div className="text-xs uppercase font-medium tracking-wider text-slate-400">
            Monitored Feature Distributions
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#151928] text-slate-400 border-b border-[#202538] uppercase font-mono text-[10px]">
            <tr>
              <th className="py-3 px-4">Feature Name</th>
              <th className="py-3 px-4">PSI Score</th>
              <th className="py-3 px-4">KS Statistic</th>
              <th className="py-3 px-4">KS P-Value</th>
              <th className="py-3 px-4">Reference Mean</th>
              <th className="py-3 px-4">Production Mean</th>
              <th className="py-3 px-4 text-right">Drift Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c2235]">
            {!report?.features || report.features.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  No feature distributions currently recorded.
                </td>
              </tr>
            ) : (
              report.features.map((f) => (
                <tr key={f.feature_name} className="hover:bg-[#161a29]">
                  <td className="py-3 px-4 font-mono font-medium text-white">{f.feature_name}</td>
                  <td className="py-3 px-4 font-mono text-slate-200">{f.psi_score.toFixed(4)}</td>
                  <td className="py-3 px-4 font-mono text-slate-200">
                    {f.ks_statistic.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{f.ks_p_value.toFixed(4)}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{f.reference_mean}</td>
                  <td className="py-3 px-4 font-mono text-cyan-400 font-medium">{f.current_mean}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        f.status === 'SIGNIFICANT_DRIFT'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : f.status === 'MODERATE_DRIFT'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {f.status}
                    </span>
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
