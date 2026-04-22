// Challenge API helpers (REST).

import { authHeaders } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `${location.protocol}//${location.hostname}:3001`;
  }
  return '';
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror  = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function buildPhotoPayload(photo) {
  const dataUrl = photo.blob ? await blobToDataUrl(photo.blob) : (photo.dataUrl ?? null);
  if (!dataUrl) throw new Error('No photo data.');
  return {
    clientId:  photo.clientId  ?? null,
    createdAt: photo.createdAt,
    width:     photo.width     ?? null,
    height:    photo.height    ?? null,
    type:      photo.type      ?? 'image/png',
    location:  photo.location  ?? null,
    dataUrl,
  };
}

// ── CONTRIBUTION (Bucket 1) ────────────────────────────────────────────────
// Soumet une photo comme contribution au pool du jeu.
// Exige une localisation GPS active.
export async function contributePhoto(photo) {
  const payload = await buildPhotoPayload(photo);
  if (!payload.location) throw new Error('GPS requis pour contribuer une photo.');
  const res = await fetch(`${getApiBase()}/api/photos/contribute`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Échec de la contribution.');
  return data; // { id }
}

// ── CHALLENGE REQUEST (Bucket 2 → joueur) ─────────────────────────────────
// Demande une photo aléatoire validée (pas la sienne, pas déjà vue).
export async function requestChallengePhoto() {
  const res = await fetch(`${getApiBase()}/api/challenge/request`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de récupérer un challenge.');
  return data; // { photoId, dataUrl }
}

// ── CHALLENGE RESPONSE (Bucket 3) ─────────────────────────────────────────
// Soumet la photo prise en réponse à un challenge.
// Exige une localisation GPS active et le challengePhotoId reçu.
export async function respondToChallenge({ photo, challengePhotoId }) {
  if (!challengePhotoId) throw new Error('challengePhotoId manquant.');
  const payload = await buildPhotoPayload(photo);
  if (!payload.location) throw new Error('GPS requis pour répondre au challenge.');
  const res = await fetch(`${getApiBase()}/api/photos/respond`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ...payload, challengePhotoId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Échec de la soumission.');
  return data; // { id }
}

// ── LEGACY (conservé pour compatibilité) ──────────────────────────────────
export async function getTodayChallenge() {
  const res = await fetch(`${getApiBase()}/api/challenge/today`);
  if (!res.ok) throw new Error('Failed to fetch today challenge.');
  return await res.json();
}

export async function submitPhotoToChallenge({ challengeId, photoId } = {}) {
  if (!challengeId || !photoId) throw new Error('Missing challengeId or photoId.');
  const res = await fetch(`${getApiBase()}/api/challenge/${challengeId}/submit`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ photoId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Submission failed.');
  return data;
}

