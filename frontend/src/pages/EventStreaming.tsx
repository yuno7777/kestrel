import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { subscribeToLiveStream } from '../services/api';
import { Transaction } from '../types';

interface EventStreamingProps {
  onSelectTransaction: (transaction: Transaction) => void;
}

const formatTime = (timestamp: string) => new Intl.DateTimeFormat(undefined, {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date(timestamp));

const formatMoney = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};

export const EventStreaming: React.FC<EventStreamingProps> = ({ onSelectTransaction }) => {
  const [events, setEvents] = useState<Transaction[]>([]);
  const [receivedCount, setReceivedCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => subscribeToLiveStream(
    (event) => {
      setConnected(true);
      setReceivedCount((count) => count + 1);
      setEvents((current) => [event, ...current].slice(0, 30));
    },
    () => setConnected(false),
  ), []);

  const lastEvent = events[0];

  return (
    <section className="page-view" aria-label="Event stream">
      <PageHeader
        title="Event stream"
        description="Transactions observed on the server-sent event stream."
        action={<span className="page-status" data-state={connected ? 'healthy' : 'warning'}>{connected ? 'Receiving events' : 'Waiting for event'}</span>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <article className="page-metric">
          <div className="page-metric-label">Feed endpoint</div>
          <div className="page-metric-value" style={{ fontSize: 17 }}>/api/v1/streaming/events</div>
          <div className="page-metric-note">Server-sent events</div>
        </article>
        <article className="page-metric">
          <div className="page-metric-label">Received in this view</div>
          <div className="page-metric-value">{receivedCount.toLocaleString()}</div>
          <div className="page-metric-note">Counter starts when this tab opens</div>
        </article>
        <article className="page-metric">
          <div className="page-metric-label">Last event</div>
          <div className="page-metric-value">{lastEvent ? formatTime(lastEvent.timestamp) : '—'}</div>
          <div className="page-metric-note">{lastEvent?.transaction_id ?? 'No transaction received yet'}</div>
        </article>
      </div>

      <section className="page-card" aria-labelledby="event-list-title">
        <div className="page-card-heading">
          <div>
            <div className="page-card-title" id="event-list-title">Latest events</div>
            <div className="page-card-caption">Most recent 30 events observed in this browser session</div>
          </div>
          <span className="page-card-caption">{events.length.toLocaleString()} buffered</span>
        </div>
        <div className="page-table-wrap">
          <table className="page-table">
            <thead><tr><th scope="col">Time</th><th scope="col">Transaction</th><th scope="col">Channel</th><th scope="col">Amount</th><th scope="col">Risk</th><th scope="col">Decision</th><th scope="col"></th></tr></thead>
            <tbody>
              {events.length ? events.slice(0, 12).map((event) => (
                <tr key={`${event.transaction_id}-${event.timestamp}`}>
                  <td className="numeric">{formatTime(event.timestamp)}</td>
                  <td className="numeric">{event.transaction_id}</td>
                  <td>{event.payment_channel.replaceAll('_', ' ')}</td>
                  <td className="numeric">{formatMoney(event.amount, event.currency)}</td>
                  <td className="numeric">{(event.fraud_probability * 100).toFixed(1)}%</td>
                  <td><Badge label={event.decision} variant={event.decision === 'BLOCK' ? 'block' : event.decision === 'REVIEW' ? 'review' : 'approve'} /></td>
                  <td><button type="button" className="page-control" onClick={() => onSelectTransaction(event)}>Inspect</button></td>
                </tr>
              )) : (
                <tr><td className="page-empty" colSpan={7}>Events will appear here as the API stream delivers them.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="page-note">Kafka broker health and lag are not exposed by the current API.</div>
    </section>
  );
};
