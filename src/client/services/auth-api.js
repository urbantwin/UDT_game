const AUTH_USER_KEY = 'udt-auth-user';

function getApiBase() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.DEV) {
    return `${location.protocol}//${location.hostname}:3001`;
  }
  return '';
}

function parseJsonSafe(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getStoredUser() {
  return parseJsonSafe(localStorage.getItem(AUTH_USER_KEY));
}

export function clearSession() {
  localStorage.removeItem(AUTH_USER_KEY);
}

export function authHeaders() {
  return {};
}

export function saveSession({ user }) {
  if (!user) {
    clearSession();
    return;
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

async function postAuth(path, payload) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Authentication failed.');
  }
  saveSession(data);
  return data;
}

export async function register({ username, password }) {
  return await postAuth('/api/auth/register', { username, password });
}

export async function login({ username, password, rememberMe = false }) {
  return await postAuth('/api/auth/login', { username, password, rememberMe });
}

export async function logout() {
  try {
    await fetch(`${getApiBase()}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch {
    // Local logout should still proceed even if the request fails.
  } finally {
    clearSession();
  }
}

export async function restoreSession() {
  const res = await fetch(`${getApiBase()}/api/auth/me`, {
    credentials: 'include'
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const data = await res.json();
  if (data?.user) {
    saveSession({ user: data.user });
  }
  return data?.user ?? null;
}
