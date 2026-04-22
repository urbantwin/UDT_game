import { authHeaders } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `${location.protocol}//${location.hostname}:3001`;
  }
  return '';
}

// ── 4-BUCKET SYSTEM ───────────────────────────────────────────────────────
// Bucket 1 : contributions en attente   (category=contribution, status=pending)
// Bucket 2 : contributions validées     (category=contribution, status=validated)
// Bucket 3 : réponses en attente        (category=response,     status=pending)
// Bucket 4 : réponses validées (final)  (category=response,     status=validated)

export async function getAdminPhotosByBucket(bucket) {
  const res = await fetch(`${getApiBase()}/api/admin/photos?bucket=${bucket}`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Failed to load bucket ${bucket}.`);
  return data;
}

export async function reviewPhoto({ photoId, action, note } = {}) {
  if (!photoId) throw new Error('Missing photo id.');
  const res = await fetch(`${getApiBase()}/api/admin/photos/${photoId}/review`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to review photo.');
  return data;
}

export async function awardUnbeaten(photoId) {
  if (!photoId) throw new Error('Missing photo id.');
  const res = await fetch(`${getApiBase()}/api/admin/photos/${photoId}/award-unbeaten`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to award unbeaten.');
  return data;
}

// ── LEGACY (conservé pour compatibilité) ─────────────────────────────────
export async function getAdminSubmissions() {
  const res = await fetch(`${getApiBase()}/api/admin/submissions`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load admin submissions.');
  return data;
}

export async function reviewSubmission({ submissionId, action, note } = {}) {
  if (!submissionId) throw new Error('Missing submission id.');
  const res = await fetch(`${getApiBase()}/api/admin/submissions/${submissionId}/review`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to review submission.');
  return data;
}

