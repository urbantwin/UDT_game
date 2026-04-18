const BASE = '/api';

export async function getLeaderboard() {
  const res = await fetch(`${BASE}/leaderboard`);
  if (!res.ok) throw new Error((await res.json()).error ?? 'Leaderboard error');
  return res.json(); // [{ username, score, rank }, ...]
}

export async function getMyScore() {
  const token = localStorage.getItem('udt-token');
  if (!token) return null;
  const res = await fetch(`${BASE}/me/score`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json(); // { score, rank }
}
