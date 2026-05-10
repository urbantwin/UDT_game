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

// ── MAIRE DE LA SALLE ─────────────────────────────────────────────────────

export async function getAdminAllHistory() {
  const res = await fetch(`${getApiBase()}/api/admin/room-mayors/all-history`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erreur chargement historique salles.');
  return data;
}

export async function getAdminPendingReports() {
  const res = await fetch(`${getApiBase()}/api/admin/room-mayors/reports`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erreur chargement signalements.');
  return data;
}

export async function reviewReport(reportId, decision) {
  const res = await fetch(`${getApiBase()}/api/admin/room-mayors/reports/${reportId}/review`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ decision }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Échec de la revue.');
  return data;
}

export async function getAdminPendingMayors() {
  const res = await fetch(`${getApiBase()}/api/admin/room-mayors/pending`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erreur chargement maires.');
  return data;
}

export async function reviewMayor(mayorId, decision) {
  const res = await fetch(`${getApiBase()}/api/admin/room-mayors/${mayorId}/review`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ decision }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Échec de la revue.');
  return data; // { decision, locationId, mayorUsername }
}

// ── LIEUX / PINS ─────────────────────────────────────────────────────────

export async function saveLocationOverride(locationId, { label, lat, lng } = {}) {
  const res = await fetch(`${getApiBase()}/api/admin/locations/${locationId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ label, lat, lng }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de sauvegarder.');
  return data; // { locationId, label, lat, lng }
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

