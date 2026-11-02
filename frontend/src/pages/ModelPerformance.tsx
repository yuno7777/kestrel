import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { fetchModels } from '../services/api';
import { ModelInfo } from '../types';

const metric = (value?: number) => value == null ? '—' : value.toFixed(4);
const ratio = (value?: number) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;

const PerformanceTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: number }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="mb-1">Threshold {(Number(label) * 100).toFixed(0)}%</div>
      {payload.map((item) => <div key={item.name}>{item.name} {ratio(item.value)}</div>)}
    </div>
  );
};

export const ModelPerformance: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchModels().then((data) => {
      if (!active) return;
      setModels(data);
      setSelectedId(data.find((model) => model.is_active)?.model_id ?? data[0]?.model_id ?? '');
      setError(false);
    }).catch((cause) => {
      console.error('Unable to load model metrics', cause);
      if (active) setError(true);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const model = models.find((item) => item.model_id === selectedId) ?? null;
  const thresholdData = model?.threshold_analysis ?? [];
  const confusion = model?.confusion_matrix;
  const confusionTotal = confusion?.flat().reduce((total, value) => total + value, 0);

  const metrics = useMemo(() => [
    { label: 'PR-AUC', value: metric(model?.test_pr_auc) },
    { label: 'ROC-AUC', value: metric(model?.test_roc_auc) },
    { label: 'Precision', value: ratio(model?.test_precision) },
    { label: 'Recall', value: ratio(model?.test_recall) },
  ], [model]);

  return (
    <section className="page-view" aria-label="Model evaluation">
      <PageHeader
        title="Model performance"
        description="Holdout metrics and threshold results for the selected model."
        action={<select className="page-select" aria-label="Select model" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={!models.length}>
          {models.map((item) => <option key={item.model_id} value={item.model_id}>{item.model_id}{item.is_active ? ' · active' : ''}</option>)}
        </select>}
      />

      {error && <div className="page-note" role="status">Model metrics could not be loaded.</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((item) => (
          <article className="page-metric" key={item.label}>
            <div className="page-metric-label">{item.label}</div>
            <div className="page-metric-value">{item.value}</div>
            <div className="page-metric-note">{model?.is_active ? 'Active model holdout result' : 'Selected model holdout result'}</div>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)] gap-4">
        <section className="page-card" aria-labelledby="threshold-chart-title">
          <div className="page-card-heading">
            <div>
              <div className="page-card-title" id="threshold-chart-title">Precision and recall by threshold</div>
              <div className="page-card-caption">Values are read from the selected model’s evaluation artifact</div>
            </div>
            <span className="page-card-caption">{model?.algorithm ?? 'Model unavailable'}</span>
          </div>
          <div className="page-chart">
            {thresholdData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={thresholdData} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#202020" strokeDasharray="2 5" />
                  <XAxis dataKey="threshold" axisLine={false} tickLine={false} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
                  <YAxis domain={[0, 1]} axisLine={false} tickLine={false} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
                  <Tooltip content={<PerformanceTooltip />} />
                  <Line type="monotone" dataKey="precision" name="Precision" stroke="#f0f0f0" strokeWidth={1.6} dot={false} activeDot={{ r: 3 }} />
                  <Line type="monotone" dataKey="recall" name="Recall" stroke="#999" strokeWidth={1.4} dot={false} activeDot={{ r: 3 }} />
                  <Line type="monotone" dataKey="f1" name="F1" stroke="#555" strokeWidth={1.4} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="page-empty">{loading ? 'Loading evaluation data…' : 'This model artifact has no threshold analysis.'}</div>
            )}
          </div>
        </section>

        <section className="page-card" aria-labelledby="confusion-matrix-title">
          <div className="page-card-heading">
            <div>
              <div className="page-card-title" id="confusion-matrix-title">Confusion matrix</div>
              <div className="page-card-caption">Holdout set{confusionTotal == null ? '' : ` · n = ${confusionTotal.toLocaleString()}`}</div>
            </div>
          </div>
          {confusion?.length === 2 && confusion[0]?.length === 2 && confusion[1]?.length === 2 ? (
            <div className="page-card-body">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'True negative', value: confusion[0][0] },
                  { label: 'False positive', value: confusion[0][1] },
                  { label: 'False negative', value: confusion[1][0] },
                  { label: 'True positive', value: confusion[1][1] },
                ].map((cell) => (
                  <div className="page-card-inset rounded-lg p-4" key={cell.label}>
                    <div className="page-metric-label">{cell.label}</div>
                    <div className="page-metric-value">{cell.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="page-card-body page-empty">No confusion matrix was stored for this model.</div>}
        </section>
      </div>

      <section className="page-card" aria-labelledby="threshold-table-title">
        <div className="page-card-heading">
          <div>
            <div className="page-card-title" id="threshold-table-title">Threshold evaluation</div>
            <div className="page-card-caption">Precision, recall, and F1 across evaluated thresholds</div>
          </div>
        </div>
        <div className="page-table-wrap">
          <table className="page-table">
            <thead><tr><th scope="col">Threshold</th><th scope="col">Precision</th><th scope="col">Recall</th><th scope="col">F1</th></tr></thead>
            <tbody>
              {thresholdData.length ? thresholdData.map((row) => (
                <tr key={row.threshold}>
                  <td className="numeric">{row.threshold.toFixed(2)}</td>
                  <td className="numeric">{ratio(row.precision)}</td>
                  <td className="numeric">{ratio(row.recall)}</td>
                  <td className="numeric">{ratio(row.f1)}</td>
                </tr>
              )) : <tr><td className="page-empty" colSpan={4}>Threshold data unavailable.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
