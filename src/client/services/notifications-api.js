import { authHeaders, getStoredUser } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `${location.protocol}//${location.hostname}:3001`;
  }
  return '';
}

export async function getNotifications() {
  if (!getStoredUser()) return [];
  const res = await fetch(`${getApiBase()}/api/notifications`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function markAllRead() {
  const res = await fetch(`${getApiBase()}/api/notifications/read-all`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  return res.ok;
}

export async function markRead(notifId) {
  const res = await fetch(`${getApiBase()}/api/notifications/${notifId}/read`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  return res.ok;
}

