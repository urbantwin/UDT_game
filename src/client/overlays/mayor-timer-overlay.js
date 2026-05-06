import { getMyKingStats } from '../services/challenge-api.js';

const REFRESH_INTERVAL_MS = 60_000;

export function createMayorTimerOverlay({ container = document.body } = {}) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; left:50px; top:100px; z-index:1100;
    display:none;
    background:rgba(99,102,241,0.82); color:#fff;
    font:700 10px system-ui,sans-serif; letter-spacing:0.04em;
    padding:3px 10px; border-radius:10px;
    pointer-events:none;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    transition:opacity 0.3s;
  `;
  container.appendChild(el);

  let tickId    = null;
  let refreshId = null;
  let baseSeconds = 0;
  let startTime   = null;
  let roomLabel   = '';
  let loggedIn    = false;

  function fmt(total) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const ss = String(s).padStart(2, '0');
    if (h > 0) return `${h}h ${String(m).padStart(2,'0')}min ${ss}s`;
    if (m > 0) return `${m}min ${ss}s`;
    return `${ss}s`;
  }

  function tick() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    el.textContent = `▶ ${roomLabel} — ${fmt(baseSeconds + elapsed)}`;
  }

  function startCounting({ label, totalSeconds }) {
    stopCounting();
    roomLabel   = label;
    baseSeconds = totalSeconds;
    startTime   = Date.now();
    el.style.display = 'block';
    tick();
    tickId = setInterval(tick, 1000);
  }

  function stopCounting() {
    if (tickId) { clearInterval(tickId); tickId = null; }
    el.style.display = 'none';
  }

  function stopRefresh() {
    if (refreshId) { clearInterval(refreshId); refreshId = null; }
  }

  async function loadAndApply() {
    if (!loggedIn) return;
    try {
      const stats = await getMyKingStats();
      if (stats?.lastRoom?.isMayor) {
        startCounting({
          label: stats.lastRoom.locationLabel,
          totalSeconds: stats.lastRoom.myTotalSeconds,
        });
      } else {
        stopCounting();
      }
    } catch {
      stopCounting();
    }
  }

  function setLoggedIn(isLoggedIn) {
    loggedIn = isLoggedIn;
    if (isLoggedIn) {
      loadAndApply();
      stopRefresh();
      refreshId = setInterval(loadAndApply, REFRESH_INTERVAL_MS);
    } else {
      stopCounting();
      stopRefresh();
    }
  }

  function refresh() {
    loadAndApply();
  }

  function remove() {
    stopCounting();
    stopRefresh();
    el.remove();
  }

  return { setLoggedIn, refresh, remove };
}
