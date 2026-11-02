import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { fetchDecisionPolicy } from '../services/api';
import { DecisionPolicy } from '../types';

export const Settings: React.FC = () => {
  const [policy, setPolicy] = useState<DecisionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    try {
      setPolicy(await fetchDecisionPolicy());
      setError(false);
    } catch (cause) {
      console.error('Unable to read active Kestrel policy', cause);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPolicy(); }, [loadPolicy]);

  return (
    <section className="page-view" aria-label="Decision policy settings">
      <PageHeader
        title="Decision policy"
        description="Thresholds currently loaded by the scoring API. Changes take effect after an API restart."
        action={<button className="page-control flex items-center gap-2" onClick={() => void loadPolicy()} type="button"><RefreshCw size={13} strokeWidth={1.4} />Refresh policy</button>}
      />

      {error && <div className="page-note" role="status">Policy could not be read from the API. No local values are substituted.</div>}

      {policy ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <article className="page-metric">
              <div className="page-metric-label">Approve below</div>
              <div className="page-metric-value">{policy.approve_threshold.toFixed(2)}</div>
              <div className="page-metric-note">Base fraud probability cutoff</div>
            </article>
            <article className="page-metric">
              <div className="page-metric-label">Manual review</div>
              <div className="page-metric-value">{policy.approve_threshold.toFixed(2)}–{policy.block_threshold.toFixed(2)}</div>
              <div className="page-metric-note">Values between the base cutoffs</div>
            </article>
            <article className="page-metric">
              <div className="page-metric-label">Block at or above</div>
              <div className="page-metric-value">{policy.block_threshold.toFixed(2)}</div>
              <div className="page-metric-note">Base fraud probability cutoff</div>
            </article>
          </div>

          <section className="page-card" aria-labelledby="policy-runtime-title">
            <div className="page-card-heading">
              <div>
                <div className="page-card-title" id="policy-runtime-title">Runtime policy</div>
                <div className="page-card-caption">Values read directly from the active API process</div>
              </div>
              <span className="page-status" data-state={policy.adaptive_enabled ? 'ready' : 'unknown'}>
                {policy.adaptive_enabled ? 'Adaptive adjustments enabled' : 'Adaptive adjustments disabled'}
              </span>
            </div>
            <div className="page-card-body">
              <p className="page-help">Adaptive rules adjust the base thresholds for selected transaction contexts, including online and high-value payments. Edit the API configuration to change these values.</p>
            </div>
          </section>
        </>
      ) : (
        <div className="page-card page-empty">{loading ? 'Reading policy from the API…' : 'Policy is unavailable.'}</div>
      )}
    </section>
  );
};
