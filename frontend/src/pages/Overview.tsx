import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Gauge, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/Badge';
import { fetchSummary, fetchTransactions } from '../services/api';
import { SystemSummary, Transaction } from '../types';

interface OverviewProps {
  onSelectTransaction: (txn: Transaction) => void;
}

const percent = (value?: number) => (value == null ? '—' : `${(value * 100).toFixed(2)}%`);
const number = (value?: number) => (value == null ? '—' : value.toLocaleString());

const formatTime = (timestamp: string) =>
  new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(timestamp));

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const Metric: React.FC<{ label: string; value: string; note: string; icon: React.ElementType }> = ({ label, value, note, icon: Icon }) => (
  <article className="metric-card">
    <div className="metric-top"><span>{label}</span><Icon size={14} strokeWidth={1.4} aria-hidden="true" /></div>
    <div className="metric-number" title={value}>{value}</div>
    <div className="metric-note">{note}</div>
  </article>
);

const RiskTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { time: string } }> }) => {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip">{payload[0].payload.time}<br />Risk score&nbsp; {payload[0].value.toFixed(1)}%</div>;
};

export const Overview: React.FC<OverviewProps> = ({ onSelectTransaction }) => {
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [nextSummary, nextTransactions] = await Promise.all([
        fetchSummary(),
        fetchTransactions(1, 20),
      ]);
      setSummary(nextSummary);
      setRecentTxns(nextTransactions.items);
      setError(false);
    } catch (cause) {
      console.error('Unable to load Kestrel overview data', cause);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = window.setInterval(() => void loadData(), 10000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  const riskSeries = useMemo(() => recentTxns.slice().reverse().map((txn) => ({
    time: formatTime(txn.timestamp),
    risk: txn.fraud_probability * 100,
  })), [recentTxns]);

  const decisions = [
    { label: 'Approved', value: summary?.approval_rate, marker: '#eeeeee' },
    { label: 'Review', value: summary?.review_rate, marker: '#8c8c8c' },
    { label: 'Blocked', value: summary?.block_rate, marker: '#454545' },
  ];

  const latest = recentTxns.slice(0, 8);
  const activeModel = summary?.active_model_version || '—';

  return (
    <section className="overview" aria-labelledby="overview-title">
      {error && <div className="load-error" role="status">Overview data could not refresh. Showing the most recently loaded values.</div>}

      <div className="overview-heading">
        <div>
          <div className="eyebrow">Risk monitoring / Overview</div>
          <h1 className="page-title" id="overview-title">Fraud operations</h1>
          <p className="page-description">Transaction decisions and investigation activity across Kestrel.</p>
        </div>
        <div className="overview-actions" aria-live="polite">
          <span className="refresh-mark" />
          {loading ? 'LOADING TELEMETRY' : 'UPDATING EVERY 10 SEC'}
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Transactions processed" value={number(summary?.total_transactions_processed)} note="Since platform start" icon={Activity} />
        <Metric label="Fraud intercepted" value={number(summary?.fraud_transactions_detected)} note="Flagged by current policy" icon={ShieldAlert} />
        <Metric label="Approval rate" value={percent(summary?.approval_rate)} note="All processed transactions" icon={ShieldCheck} />
        <Metric label="Mean inference latency" value={summary ? `${summary.avg_inference_latency_ms.toFixed(2)} ms` : '—'} note={summary ? `P95 ${summary.p95_inference_latency_ms.toFixed(2)} ms` : 'Awaiting telemetry'} icon={Gauge} />
      </div>

      <div className="dashboard-grid">
        <section className="panel" aria-labelledby="risk-trend-title">
          <div className="panel-heading">
            <div>
              <div className="panel-title" id="risk-trend-title">Recent risk scores</div>
              <div className="panel-caption">Latest scored transactions, in arrival order</div>
            </div>
            <span className="panel-period">LAST {riskSeries.length} EVENTS</span>
          </div>
          <div className="chart-body">
            {riskSeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskSeries} margin={{ top: 8, right: 14, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d9d9d9" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#d9d9d9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#1c1c1c" strokeDasharray="2 5" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={36} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(tick: number) => `${tick}%`} />
                  <Tooltip content={<RiskTooltip />} />
                  <Area type="monotone" dataKey="risk" stroke="#e4e4e4" strokeWidth={1.5} fill="url(#riskFill)" activeDot={{ r: 3, fill: '#fff', stroke: '#050505', strokeWidth: 1 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">{loading ? 'Loading scored events…' : 'No scored transactions available yet.'}</div>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="decision-mix-title">
          <div className="panel-heading">
            <div>
              <div className="panel-title" id="decision-mix-title">Decision mix</div>
              <div className="panel-caption">Policy outcomes across processed transactions</div>
            </div>
            <span className="panel-period">ALL TIME</span>
          </div>
          <div className="decision-list">
            {decisions.map(({ label, value, marker }) => (
              <div className="decision-row" key={label}>
                <div className="decision-label"><span className="decision-marker" style={{ '--marker': marker } as React.CSSProperties} />{label}</div>
                <div className="decision-track" aria-label={`${label}: ${percent(value)}`}>
                  <div className="decision-fill" style={{ width: `${Math.max(0, Math.min(100, (value ?? 0) * 100))}%`, '--marker': marker } as React.CSSProperties} />
                </div>
                <div className="decision-value">{percent(value)}</div>
              </div>
            ))}
          </div>
          <div className="model-strip">
            <span>Active model</span>
            <strong title={activeModel}>{activeModel}</strong>
          </div>
        </section>
      </div>

      <section className="panel table-panel" aria-labelledby="recent-transactions-title">
        <div className="panel-heading">
          <div>
            <div className="panel-title" id="recent-transactions-title">Recent transactions</div>
            <div className="panel-caption">Most recently scored activity</div>
          </div>
          <span className="panel-period">{recentTxns.length.toLocaleString()} LOADED</span>
        </div>
        <div className="table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Transaction</th>
                <th scope="col">Merchant category</th>
                <th scope="col">Amount</th>
                <th scope="col">Risk score</th>
                <th scope="col">Decision</th>
              </tr>
            </thead>
            <tbody>
              {latest.length ? latest.map((txn) => {
                const variant = txn.decision === 'BLOCK' ? 'block' : txn.decision === 'REVIEW' ? 'review' : 'approve';
                const marker = txn.decision === 'BLOCK' ? '#777' : txn.decision === 'REVIEW' ? '#aaa' : '#eee';
                return (
                  <tr key={txn.transaction_id} onClick={() => onSelectTransaction(txn)} onKeyDown={(event) => event.key === 'Enter' && onSelectTransaction(txn)} tabIndex={0}>
                    <td className="mono">{formatTime(txn.timestamp)}</td>
                    <td><div className="txn-id mono" title={txn.transaction_id}>{txn.transaction_id}</div></td>
                    <td>{txn.merchant_category.replaceAll('_', ' ')}</td>
                    <td className="mono">{formatMoney(txn.amount, txn.currency)}</td>
                    <td className="risk-score">{(txn.fraud_probability * 100).toFixed(1)}%</td>
                    <td><span className="decision-badge" style={{ '--marker': marker } as React.CSSProperties}><Badge label={txn.decision} variant={variant} /></span></td>
                  </tr>
                );
              }) : (
                <tr><td className="empty-state" colSpan={6}>{loading ? 'Loading transaction activity…' : 'No transactions have been scored yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
