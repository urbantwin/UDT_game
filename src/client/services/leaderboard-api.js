import { authHeaders } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `http://${location.hostname}:3001`;
  }
  return '';
}

export async function getLeaderboard() {
  const res = await fetch(`${getApiBase()}/api/leaderboard`);
  if (!res.ok) throw new Error((await res.json()).error ?? 'Leaderboard error');
  return res.json(); // [{ username, score, rank }, ...]
}

export async function getMyScore() {
  const headers = authHeaders();
  if (!headers.Authorization) return null;
  const res = await fetch(`${getApiBase()}/api/me/score`, { headers });
  if (!res.ok) return null;
  return res.json(); // { score, rank }
}
