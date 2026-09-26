const API_BASE = 'https://finsight-1-gqzg.onrender.com';

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function fetchTransactions(limit = 100, category = '', search = '') {
  let url = `${API_BASE}/transactions?limit=${limit}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function categorizeTransactions(transactionIds = null) {
  const res = await fetch(`${API_BASE}/transactions/categorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_ids: transactionIds })
  });
  if (!res.ok) throw new Error('Failed to categorize transactions');
  return res.json();
}

export async function fetchRecurring() {
  const res = await fetch(`${API_BASE}/recurring/detect`);
  if (!res.ok) throw new Error('Failed to fetch recurring commitments');
  return res.json();
}

export async function fetchAnomalies(baselineWindow = 180) {
  const res = await fetch(`${API_BASE}/anomalies?baseline_window=${baselineWindow}`);
  if (!res.ok) throw new Error('Failed to fetch anomalies');
  return res.json();
}

export async function fetchForecast(horizonDays = 30) {
  const res = await fetch(`${API_BASE}/forecast?horizon_days=${horizonDays}`);
  if (!res.ok) throw new Error('Failed to fetch cash flow forecast');
  return res.json();
}

export async function simulateScenario(params) {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to run scenario simulation');
  return res.json();
}

export async function fetchGoals() {
  const res = await fetch(`${API_BASE}/goals`);
  if (!res.ok) throw new Error('Failed to fetch goals');
  return res.json();
}

export async function fetchRecommendations() {
  const res = await fetch(`${API_BASE}/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to generate recommendations');
  return res.json();
}

export async function fetchApprovals() {
  const res = await fetch(`${API_BASE}/approval-requests`);
  if (!res.ok) throw new Error('Failed to fetch approval requests');
  return res.json();
}

export async function createApprovalRequest(requestData) {
  const res = await fetch(`${API_BASE}/approval-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  if (!res.ok) throw new Error('Failed to create approval request');
  return res.json();
}

export async function approveRequest(id) {
  const res = await fetch(`${API_BASE}/approval-requests/${id}/approve`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to approve request');
  return res.json();
}

export async function rejectRequest(id) {
  const res = await fetch(`${API_BASE}/approval-requests/${id}/reject`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reject request');
  return res.json();
}

export async function resetMockData() {
  const res = await fetch(`${API_BASE}/reset-data`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset mock data');
  return res.json();
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}
