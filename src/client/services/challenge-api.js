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
    floor:     photo.floor     ?? null,
    dataUrl,
  };
}

// ── CONTRIBUTION (Bucket 1) ────────────────────────────────────────────────
// Soumet une photo comme contribution au pool du jeu.
// locationId: identifiant de salle EPFL optionnel (active le cooldown de 1h CTF).
export async function contributePhoto(photo, { locationId = null } = {}) {
  const payload = await buildPhotoPayload(photo);
  if (!payload.location) throw new Error('GPS requis pour contribuer une photo.');
  if (locationId) payload.locationId = locationId;
  const res = await fetch(`${getApiBase()}/api/photos/contribute`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Echec de la contribution.');
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
export async function acceptChallenge({ challengePhotoId } = {}) {
  if (!challengePhotoId) throw new Error('challengePhotoId manquant.');
  const res = await fetch(`${getApiBase()}/api/challenge/accept`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ challengePhotoId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Impossible d'accepter le challenge.");
  return data;
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

// ── MAIRE DE LA SALLE ─────────────────────────────────────────────────────

export async function getRoomMayors() {
  const res = await fetch(`${getApiBase()}/api/room-mayors`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de récupérer les maires.');
  return data;
}

export async function claimRoom({ locationId, photo }) {
  if (!locationId) throw new Error('locationId manquant.');
  const payload = await buildPhotoPayload(photo);
  if (!payload.location) throw new Error('GPS requis pour revendiquer un lieu.');
  const res = await fetch(`${getApiBase()}/api/room-mayors/claim`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ...payload, locationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Échec de la revendication.');
  return data; // { locationId, protectionEndsAt, mayorUsername }
}

export async function getMyKingStats() {
  const res = await fetch(`${getApiBase()}/api/me/king-stats`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de récupérer les stats King.');
  return data; // { lastRoom: { locationId, locationLabel, myTotalSeconds, myRank, isMayor, totalPlayers } | null }
}

export async function reportMayor(mayorId) {
  const res = await fetch(`${getApiBase()}/api/room-mayors/${mayorId}/report`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Échec du signalement.');
  return data; // { reported: true }
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




