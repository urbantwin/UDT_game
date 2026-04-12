const AUTH_TOKEN_KEY = 'udt-auth-token';
const AUTH_USER_KEY = 'udt-auth-user';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `http://${location.hostname}:3001`;
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

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser() {
  return parseJsonSafe(localStorage.getItem(AUTH_USER_KEY));
}

export function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function authHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function saveSession({ token, user }) {
  if (!token || !user) return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

async function postAuth(path, payload) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function login({ username, password }) {
  return await postAuth('/api/auth/login', { username, password });
}

export async function restoreSession() {
  const token = getStoredToken();
  if (!token) return null;
  const res = await fetch(`${getApiBase()}/api/auth/me`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const data = await res.json();
  if (data?.user) {
    saveSession({ token, user: data.user });
  }
  return data?.user ?? null;
}
