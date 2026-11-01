import React, { useState } from 'react';
import { Sliders, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

export const Settings: React.FC = () => {
  const [approveThreshold, setApproveThreshold] = useState<number>(0.30);
  const [blockThreshold, setBlockThreshold] = useState<number>(0.75);
  const [generatorTPS, setGeneratorTPS] = useState<number>(15);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Platform Configuration & Policy</h2>
        <p className="text-xs text-slate-400 mt-1">
          Adjust multi-tier risk decision policies and streaming simulator parameters.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Platform policies updated and applied to active scoring engine!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Decision Engine Thresholds */}
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-[#202538] pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Fraud Decision Engine Cutoffs</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Auto-Approve Cutoff Threshold</span>
                <span className="font-mono text-emerald-400">&lt; {approveThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.50"
                step="0.05"
                value={approveThreshold}
                onChange={(e) => setApproveThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Transactions with fraud probability strictly below this value are automatically approved without analyst queueing.
              </p>
            </div>

            <div className="pt-3 border-t border-[#1c2235]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Immediate Block Threshold</span>
                <span className="font-mono text-rose-400">&ge; {blockThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={blockThreshold}
                onChange={(e) => setBlockThreshold(parseFloat(e.target.value))}
                className="w-full accent-rose-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Transactions with fraud probability equal to or exceeding this threshold are immediately declined and flagged for recovery.
              </p>
            </div>

            <div className="p-3 bg-[#161a29] rounded border border-[#20263c] text-xs font-mono text-amber-300">
              Manual Review Range: [{approveThreshold.toFixed(2)} to {blockThreshold.toFixed(2)}]
            </div>
          </div>
        </div>

        {/* Streaming Generator Controls */}
        <div className="bg-[#11131c] border border-[#202538] rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-[#202538] pb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Synthetic Stream Simulator Settings</span>
          </div>

          <div>
            <label className="block text-xs text-slate-300 font-medium mb-1">
              Target Streaming Throughput (Transactions Per Second)
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={generatorTPS}
              onChange={(e) => setGeneratorTPS(parseInt(e.target.value) || 1)}
              className="bg-[#161a29] border border-[#20263c] rounded px-3 py-2 text-xs text-white w-48 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors shadow-md shadow-cyan-600/20"
        >
          Save Configuration
        </button>
      </form>
    </div>
  );
};
