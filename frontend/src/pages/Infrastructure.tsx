import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { fetchApiHealth, fetchApiReadiness, fetchSummary } from '../services/api';
import { ServiceHealth, SystemSummary } from '../types';

type ProbeState = 'healthy' | 'warning' | 'unknown';

export const Infrastructure: React.FC = () => {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [readiness, setReadiness] = useState<ServiceHealth | null>(null);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [healthResult, readinessResult, summaryResult] = await Promise.allSettled([
      fetchApiHealth(), fetchApiReadiness(), fetchSummary(),
    ]);
    if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
    if (readinessResult.status === 'fulfilled') setReadiness(readinessResult.value);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    setError([healthResult, readinessResult, summaryResult].some((result) => result.status === 'rejected'));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const apiState: ProbeState = health?.status === 'ok' ? 'healthy' : health ? 'warning' : 'unknown';
  const modelState: ProbeState = readiness?.ready ? 'healthy' : readiness ? 'warning' : 'unknown';
  const storeState: ProbeState = summary ? 'healthy' : 'unknown';

  return (
    <section className="page-view" aria-label="Infrastructure status">
      <PageHeader
        title="Infrastructure"
        description="API liveness, model readiness, and persisted transaction volume."
        action={<button type="button" className="page-control flex items-center gap-2" disabled={loading} onClick={() => void refresh()}><RefreshCw size={13} strokeWidth={1.4} />Refresh checks</button>}
      />

      {error && <div className="page-note" role="status">One or more checks failed. Each card retains its last successful response.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <article className="page-card">
          <div className="page-card-heading">
            <div><div className="page-card-title">API liveness</div><div className="page-card-caption">GET /api/v1/system/health</div></div>
            <span className="page-status" data-state={apiState}>{health?.status === 'ok' ? 'Reachable' : health ? 'Unavailable' : 'Unknown'}</span>
          </div>
          <div className="page-card-body">
            <div className="page-metric-label">Last response</div>
            <div className="page-metric-note">{health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'No successful response yet'}</div>
          </div>
        </article>

        <article className="page-card">
          <div className="page-card-heading">
            <div><div className="page-card-title">Model readiness</div><div className="page-card-caption">GET /api/v1/system/ready</div></div>
            <span className="page-status" data-state={modelState}>{readiness?.ready ? 'Ready' : readiness ? 'Not ready' : 'Unknown'}</span>
          </div>
          <div className="page-card-body">
            <div className="page-metric-label">Active model</div>
            <div className="page-metric-note" title={readiness?.active_model ?? undefined}>{readiness?.active_model ?? 'No model reported'}</div>
          </div>
        </article>

        <article className="page-card">
          <div className="page-card-heading">
            <div><div className="page-card-title">Persistence query</div><div className="page-card-caption">Monitoring summary endpoint</div></div>
            <span className="page-status" data-state={storeState}>{summary ? 'Responding' : 'Unknown'}</span>
          </div>
          <div className="page-card-body">
            <div className="page-metric-label">Transactions in summary</div>
            <div className="page-metric-value">{summary?.total_transactions_processed.toLocaleString() ?? '—'}</div>
            <div className="page-metric-note">A successful summary query confirms the configured store is responding.</div>
          </div>
        </article>
      </div>

      <div className="page-note">Kafka, Redis, and cluster probes are not exposed by this API.</div>
    </section>
  );
};
