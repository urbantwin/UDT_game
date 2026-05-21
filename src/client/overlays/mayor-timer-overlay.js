import { getMyKingStats } from '../services/challenge-api.js';

const REFRESH_INTERVAL_MS = 60_000;

export function createMayorTimerOverlay({ container = document.body } = {}) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; left:50px; top:100px; z-index:1100;
    display:none;
    background:rgba(17,24,39,0.88); color:#fff;
    font:600 10px system-ui,sans-serif; letter-spacing:0.03em;
    padding:5px 11px; border-radius:10px; line-height:1.7;
    pointer-events:none;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
    border:1px solid rgba(255,255,255,0.08);
  `;
  container.appendChild(el);

  let tickId    = null;
  let refreshId = null;
  let loggedIn  = false;

  let deadlineEpoch    = null; // Unix seconds — quand le statut de maire est perdu
  let renewalEpoch     = null; // Unix seconds — quand le renouvellement est possible
  let roomLabel        = '';

  function fmt(secs) {
    if (secs <= 0) return '—';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const ss = String(s).padStart(2, '0');
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
    if (m > 0) return `${m}min ${ss}s`;
    return `${ss}s`;
  }

  function tick() {
    const now = Math.floor(Date.now() / 1000);

    const lines = [];

    if (deadlineEpoch !== null) {
      const remaining = deadlineEpoch - now;
      const urgent = remaining > 0 && remaining < 3600;
      const color  = remaining <= 0 ? '#f87171' : urgent ? '#fbbf24' : '#86efac';
      const label  = remaining <= 0 ? 'Statut de maire perdu' : `Perte du statut de maire dans : <b style="color:${color}">${fmt(remaining)}</b>`;
      lines.push(label);
    }

    if (renewalEpoch !== null) {
      const remaining = renewalEpoch - now;
      if (remaining > 0) {
        lines.push(`Renouvellement possible dans : <b style="color:#93c5fd">${fmt(remaining)}</b>`);
      }
    }

    if (lines.length === 0) {
      el.style.display = 'none';
      return;
    }

    el.innerHTML = `<div style="opacity:0.6;margin-bottom:1px;">👑 ${roomLabel}</div>${lines.join('<br>')}`;
    el.style.display = 'block';
  }

  function startTimer({ label, renewalDeadline, renewalAllowedAt }) {
    stopTimer();
    roomLabel     = label;
    deadlineEpoch = renewalDeadline   ?? null;
    renewalEpoch  = renewalAllowedAt  ?? null;
    tick();
    tickId = setInterval(tick, 1000);
  }

  function stopTimer() {
    if (tickId) { clearInterval(tickId); tickId = null; }
    el.style.display = 'none';
    deadlineEpoch = null;
    renewalEpoch  = null;
  }

  function stopRefresh() {
    if (refreshId) { clearInterval(refreshId); refreshId = null; }
  }

  async function loadAndApply() {
    if (!loggedIn) return;
    try {
      const stats = await getMyKingStats();
      if (stats?.lastRoom?.isMayor) {
        startTimer({
          label:           stats.lastRoom.locationLabel,
          renewalDeadline: stats.lastRoom.renewalDeadline,
          renewalAllowedAt: stats.lastRoom.renewalAllowedAt,
        });
      } else {
        stopTimer();
      }
    } catch {
      stopTimer();
    }
  }

  function setLoggedIn(isLoggedIn) {
    loggedIn = isLoggedIn;
    if (isLoggedIn) {
      loadAndApply();
      stopRefresh();
      refreshId = setInterval(loadAndApply, REFRESH_INTERVAL_MS);
    } else {
      stopTimer();
      stopRefresh();
    }
  }

  function refresh() {
    loadAndApply();
  }

  function remove() {
    stopTimer();
    stopRefresh();
    el.remove();
  }

  return { setLoggedIn, refresh, remove };
}
