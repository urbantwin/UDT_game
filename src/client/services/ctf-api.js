// Client-side fetch wrappers for CTF team room-control endpoints.

import { authHeaders } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `${location.protocol}//${location.hostname}:3001`;
  }
  return '';
}

export async function getTeams() {
  const res = await fetch(`${getApiBase()}/api/teams`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de charger les equipes.');
  return data;
}

export async function setTeam(teamId) {
  const res = await fetch(`${getApiBase()}/api/auth/set-team`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ teamId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de rejoindre cette equipe.');
  return data;
}

export async function getCtfRooms() {
  const res = await fetch(`${getApiBase()}/api/ctf/rooms`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de charger les salles CTF.');
  return data;
}

export async function getCtfPlayerLeaderboard() {
  const res = await fetch(`${getApiBase()}/api/ctf/leaderboard/players`, { credentials: 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(tryJson(text)?.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function getCtfTeamComposition() {
  const res = await fetch(`${getApiBase()}/api/ctf/teams/composition`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(tryJson(text)?.error || `Erreur ${res.status}`);
  }
  return res.json();
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export async function getCtfLeaderboard() {
  const res = await fetch(`${getApiBase()}/api/ctf/leaderboard`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de charger le classement CTF.');
  return data;
}
