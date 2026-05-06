import { authHeaders } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `${location.protocol}//${location.hostname}:3001`;
  }
  return '';
}

export async function getMinigamesFeed() {
  const res = await fetch(`${getApiBase()}/api/minigames/feed`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de charger le feed.');
  return data; // [{ id, dataUrl, location, submitterUsername }]
}

export async function submitTimeGuess({ photoId, guessedTime }) {
  const res = await fetch(`${getApiBase()}/api/guess`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ photoId, type: 'time-guess', payload: { guessedTime } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Échec de la soumission.');
  return data; // { score, realTime }
}
