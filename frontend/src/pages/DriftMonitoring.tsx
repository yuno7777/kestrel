import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { fetchDriftReport } from '../services/api';
import { DriftReport } from '../types';

const formatValue = (value: number) => Number.isFinite(value) ? value.toFixed(4) : '—';

export const DriftMonitoring: React.FC = () => {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDrift = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await fetchDriftReport());
      setError(false);
    } catch (cause) {
      console.error('Unable to load drift report', cause);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDrift(); }, [loadDrift]);

  const features = report?.features ?? [];
  const status = report?.overall_status || (loading ? 'Loading' : 'Unavailable');

  return (
    <section className="page-view" aria-label="Feature drift monitoring">
      <PageHeader
        title="Feature drift"
        description="Population Stability Index and Kolmogorov–Smirnov results from the drift service."
        action={<button type="button" className="page-control flex items-center gap-2" onClick={() => void loadDrift()} disabled={loading}><RefreshCw size={13} strokeWidth={1.4} />Refresh report</button>}
      />

      {error && <div className="page-note" role="status">The API did not return a drift report. Previous values are retained if available.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="page-metric">
          <div className="page-metric-label">Current report status</div>
          <div className="page-metric-value">{status.replaceAll('_', ' ')}</div>
          <div className="page-metric-note">Status reported by the drift endpoint</div>
        </article>
        <article className="page-metric">
          <div className="page-metric-label">Features evaluated</div>
          <div className="page-metric-value">{report?.evaluated_features_count?.toLocaleString() ?? '—'}</div>
          <div className="page-metric-note">{features.length.toLocaleString()} feature rows in this report</div>
        </article>
      </div>

      {report?.message && <div className="page-note">{report.message}</div>}

      <section className="page-card" aria-labelledby="drift-feature-title">
        <div className="page-card-heading">
          <div>
            <div className="page-card-title" id="drift-feature-title">Feature distributions</div>
            <div className="page-card-caption">Reference and current distribution statistics</div>
          </div>
          <span className="page-card-caption">PSI guide: &lt;0.10 low · 0.10–0.20 watch · &gt;0.20 elevated</span>
        </div>
        <div className="page-table-wrap">
          <table className="page-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">PSI</th>
                <th scope="col">KS statistic</th>
                <th scope="col">KS p-value</th>
                <th scope="col">Reference mean</th>
                <th scope="col">Current mean</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {features.length ? features.map((feature) => (
                <tr key={feature.feature_name}>
                  <td className="numeric">{feature.feature_name}</td>
                  <td className="numeric">{formatValue(feature.psi_score)}</td>
                  <td className="numeric">{formatValue(feature.ks_statistic)}</td>
                  <td className="numeric">{formatValue(feature.ks_p_value)}</td>
                  <td className="numeric">{formatValue(feature.reference_mean)}</td>
                  <td className="numeric">{formatValue(feature.current_mean)}</td>
                  <td>{feature.status.replaceAll('_', ' ')}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="page-empty">{loading ? 'Loading drift report…' : 'No feature rows were returned.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
