import { authHeaders } from './auth-api.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `http://${location.hostname}:3001`;
  }
  return '';
}

export async function getNotifications() {
  const token = authHeaders().Authorization;
  if (!token) return [];
  const res = await fetch(`${getApiBase()}/api/notifications`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function markAllRead() {
  const res = await fetch(`${getApiBase()}/api/notifications/read-all`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  return res.ok;
}

export async function markRead(notifId) {
  const res = await fetch(`${getApiBase()}/api/notifications/${notifId}/read`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  return res.ok;
}
