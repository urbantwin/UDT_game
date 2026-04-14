import { authHeaders } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `http://${location.hostname}:3001`;
  }
  return '';
}

export async function getAdminSubmissions() {
  const res = await fetch(`${getApiBase()}/api/admin/submissions`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to load admin submissions.');
  }
  return data;
}

export async function reviewSubmission({ submissionId, action, note } = {}) {
  if (!submissionId) throw new Error('Missing submission id.');
  const res = await fetch(`${getApiBase()}/api/admin/submissions/${submissionId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action, note })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to review submission.');
  }
  return data;
}
