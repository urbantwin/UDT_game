// Challenge API helpers (REST).

import { authHeaders } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `http://${location.hostname}:3001`;
  }
  return '';
}

export async function getTodayChallenge() {
  const res = await fetch(`${getApiBase()}/api/challenge/today`);
  if (!res.ok) throw new Error('Failed to fetch today challenge.');
  return await res.json();
}

export async function requestChallengePhoto() {
  const res = await fetch(`${getApiBase()}/api/challenge/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to get challenge.');
  }
  return data;
}

export async function submitPhotoToChallenge({ challengeId, photoId } = {}) {
  if (!challengeId || !photoId) throw new Error('Missing challengeId or photoId.');
  const res = await fetch(`${getApiBase()}/api/challenge/${challengeId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ photoId })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Submission failed.');
  }
  return data;
}
