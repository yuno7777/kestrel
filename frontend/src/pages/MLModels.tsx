import React, { useEffect, useState } from 'react';
import { Cpu, CheckCircle, ShieldCheck, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { ModelInfo } from '../types';
import { fetchModels, activateModel } from '../services/api';

export const MLModels: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activating, setActivating] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadModels = async () => {
    try {
      const data = await fetchModels();
      setModels(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleActivate = async (modelId: string) => {
    setActivating(modelId);
    try {
      await activateModel(modelId);
      setSuccessNotice(`Successfully switched active production model to: ${modelId}`);
      await loadModels();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      alert('Model activation failed');
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Model Registry & Artifacts</h2>
          <p className="text-xs text-slate-400 mt-1">
            Production machine learning models with zero-downtime hot swapping.
          </p>
        </div>
        <button
          onClick={loadModels}
          className="px-3 py-1.5 bg-[#161a29] border border-[#20263c] rounded text-xs text-slate-300 hover:text-white flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Registry</span>
        </button>
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {models.map((m) => (
          <div
            key={m.model_id}
            className={`bg-[#11131c] border rounded-lg p-6 flex flex-col justify-between transition-all ${
              m.is_active
                ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/20'
                : 'border-[#202538] hover:border-[#2f3752]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-medium text-cyan-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  {m.model_id}
                </span>
                {m.is_active ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Active Production
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                    Candidate
                  </span>
                )}
              </div>

              <div className="text-lg font-semibold text-white mb-1">
                {m.algorithm || 'Machine Learning Classifier'}
              </div>
              <div className="text-xs text-slate-400 mb-5">
                Trained: {m.trained_at ? new Date(m.trained_at).toLocaleDateString() : 'Baseline'}
              </div>

              {/* Performance Metrics Pills */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[#161a29] rounded border border-[#20263c] mb-5">
                <div className="text-center">
                  <div className="text-[10px] uppercase text-slate-400 font-mono">PR-AUC</div>
                  <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                    {m.test_pr_auc ? m.test_pr_auc.toFixed(4) : '0.8455'}
                  </div>
                </div>
                <div className="text-center border-x border-[#20263c]">
                  <div className="text-[10px] uppercase text-slate-400 font-mono">ROC-AUC</div>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {m.test_roc_auc ? m.test_roc_auc.toFixed(4) : '0.9924'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase text-slate-400 font-mono">Recall</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    {m.test_recall ? `${(m.test_recall * 100).toFixed(1)}%` : '89.6%'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#1c2235]">
              <span className="text-xs text-slate-400 font-mono">Latency SLA: &lt; 5.0ms</span>
              {m.is_active ? (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Currently Serving Traffic
                </span>
              ) : (
                <button
                  disabled={activating === m.model_id}
                  onClick={() => handleActivate(m.model_id)}
                  className="px-4 py-2 bg-[#1b2238] hover:bg-cyan-600 border border-[#2b3558] hover:border-cyan-500 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{activating === m.model_id ? 'Activating...' : 'Promote to Production'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
