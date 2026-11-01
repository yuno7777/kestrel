import { Transaction, SystemSummary, ModelInfo, DriftReport } from '../types';

const API_BASE = '/api/v1';

export async function fetchSummary(): Promise<SystemSummary> {
  const res = await fetch(`${API_BASE}/monitoring/summary`);
  if (!res.ok) throw new Error('Failed to fetch platform summary');
  return res.json();
}

export async function fetchTransactions(
  page: number = 1,
  pageSize: number = 25,
  decision?: string,
  customerId?: string
): Promise<{ total: number; page: number; pageSize: number; items: Transaction[] }> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (decision && decision !== 'ALL') params.append('decision', decision);
  if (customerId) params.append('customer_id', customerId);

  const res = await fetch(`${API_BASE}/transactions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function fetchTransactionDetail(id: string): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/transactions/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch transaction ${id}`);
  return res.json();
}

export async function fetchFraudAlerts(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/fraud/alerts`);
  if (!res.ok) throw new Error('Failed to fetch fraud alerts');
  return res.json();
}

export async function submitFeedback(
  transactionId: string,
  actualLabel: number,
  notes?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/fraud/${transactionId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actual_label: actualLabel,
      reported_by: 'fraud_analyst_ui',
      notes: notes || 'Reviewed via Kestrel Console',
    }),
  });
  if (!res.ok) throw new Error('Failed to submit feedback');
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function activateModel(modelVersion: string): Promise<void> {
  const res = await fetch(`${API_BASE}/models/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_version: modelVersion }),
  });
  if (!res.ok) throw new Error(`Failed to activate model ${modelVersion}`);
}

export async function fetchDriftReport(): Promise<DriftReport> {
  const res = await fetch(`${API_BASE}/monitoring/drift`);
  if (!res.ok) throw new Error('Failed to fetch drift report');
  return res.json();
}

export function subscribeToLiveStream(
  onTransaction: (txn: Transaction) => void,
  onError?: (err: any) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/streaming/events`);

  eventSource.onmessage = (event) => {
    try {
      const data: Transaction = JSON.parse(event.data);
      onTransaction(data);
    } catch (err) {
      console.error('Failed to parse SSE event data', err);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}
