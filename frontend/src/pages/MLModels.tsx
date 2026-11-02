import React, { useCallback, useEffect, useState } from 'react';
import { Check, Cpu, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { fetchModels, activateModel } from '../services/api';
import { ModelInfo } from '../types';

const score = (value?: number) => value == null ? '—' : value.toFixed(4);
const rate = (value?: number) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;

export const MLModels: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModels = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      setModels(await fetchModels());
      setError(null);
    } catch (cause) {
      console.error('Unable to load model registry', cause);
      setError('Model registry could not be read from the API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadModels(true); }, [loadModels]);

  const handleActivate = async (modelId: string) => {
    setActivating(modelId);
    setNotice(null);
    setError(null);
    try {
      await activateModel(modelId);
      await loadModels(true);
      setNotice(`${modelId} is now active in the API process.`);
    } catch (cause) {
      console.error('Model activation failed', cause);
      setError(`The API could not activate ${modelId}.`);
    } finally {
      setActivating(null);
    }
  };

  return (
    <section className="page-view" aria-label="Model registry">
      <PageHeader
        title="Model registry"
        description="Model artifacts and evaluation results currently exposed by the inference API."
        action={<button type="button" className="page-control flex items-center gap-2" disabled={refreshing} onClick={() => void loadModels()}><RefreshCw size={13} strokeWidth={1.4} />{refreshing ? 'Refreshing' : 'Refresh registry'}</button>}
      />

      {notice && <div className="page-note" role="status">{notice}</div>}
      {error && <div className="page-note" role="alert">{error}</div>}

      {models.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {models.map((model) => (
            <article className="page-card" key={model.model_id}>
              <div className="page-card-heading">
                <div className="min-w-0">
                  <div className="page-card-title flex items-center gap-2"><Cpu size={14} strokeWidth={1.3} />{model.model_id}</div>
                  <div className="page-card-caption">{model.algorithm ?? 'Algorithm not recorded'}</div>
                </div>
                <span className="page-status" data-state={model.is_active ? 'ready' : 'unknown'}>{model.is_active ? 'Active' : 'Candidate'}</span>
              </div>

              <div className="page-card-body">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'PR-AUC', value: score(model.test_pr_auc) },
                    { label: 'ROC-AUC', value: score(model.test_roc_auc) },
                    { label: 'Precision', value: rate(model.test_precision) },
                    { label: 'Recall', value: rate(model.test_recall) },
                  ].map((item) => (
                    <div className="page-card-inset rounded-lg p-3" key={item.label}>
                      <div className="page-metric-label">{item.label}</div>
                      <div className="page-metric-value" style={{ fontSize: 17 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="page-card-footer -mx-[18px] mt-4 -mb-[18px] flex items-center justify-between gap-4">
                  <span>Trained {model.trained_at ? new Date(model.trained_at).toLocaleDateString() : 'date unavailable'}</span>
                  {model.is_active ? (
                    <span className="page-status" data-state="ready"><Check size={12} strokeWidth={1.5} />Serving</span>
                  ) : (
                    <button type="button" className="page-control page-control-primary" disabled={activating !== null} onClick={() => void handleActivate(model.model_id)}>
                      {activating === model.model_id ? 'Activating…' : 'Activate model'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="page-card page-empty">{loading ? 'Loading model artifacts…' : 'The API returned no model artifacts.'}</div>}
    </section>
  );
};
