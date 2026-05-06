import { getNotifications, markAllRead } from '../services/notifications-api.js';

const POLL_INTERVAL_MS = 20_000;

export function createNotificationsOverlay({ container = document.body, onBadgeChange } = {}) {
  // ── Panneau liste (positionné près des réglages) ─────────────────────────
  const panel = document.createElement('div');
  panel.style.cssText = `
    position:fixed; top:70px; right:16px; z-index:1400;
    display:none; background:rgba(10,10,10,0.94); color:#fff;
    border-radius:10px; width:230px;
    max-height:calc(100vh - 80px);
    box-shadow:0 6px 20px rgba(0,0,0,0.5);
    flex-direction:column; overflow:hidden;
  `;
  container.appendChild(panel);

  // Header fixe
  const panelHeader = document.createElement('div');
  panelHeader.style.cssText = `
    display:flex; justify-content:space-between; align-items:center;
    padding:10px 12px 8px; border-bottom:1px solid rgba(255,255,255,0.08);
    flex-shrink:0;
  `;

  const panelTitle = document.createElement('span');
  panelTitle.textContent = 'Notifications';
  panelTitle.style.cssText = 'font:600 13px system-ui,sans-serif;';

  const readAllBtn = document.createElement('button');
  readAllBtn.type = 'button';
  readAllBtn.textContent = 'Tout effacer';
  readAllBtn.style.cssText = `
    background:rgba(255,255,255,0.12); color:#fff; border:none; border-radius:5px;
    padding:3px 8px; cursor:pointer; font:11px system-ui,sans-serif;
  `;

  panelHeader.appendChild(panelTitle);
  panelHeader.appendChild(readAllBtn);
  panel.appendChild(panelHeader);

  // Zone scrollable
  const list = document.createElement('div');
  list.style.cssText = `
    display:flex; flex-direction:column;
    overflow-y:scroll; flex:1; min-height:0;
    scroll-behavior:smooth;
  `;
  panel.appendChild(list);

  // ── State ─────────────────────────────────────────────────────────────────
  let open = false;
  let loggedIn = false;
  let pollTimer = null;
  let unreadNotifs = [];

  // ── Helpers ──────────────────────────────────────────────────────────────
  function updateBadge() {
    onBadgeChange?.(unreadNotifs.length);
  }

  function renderList() {
    list.innerHTML = '';
    if (!unreadNotifs.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Aucun nouveau message.';
      empty.style.cssText = `
        padding:16px 12px; opacity:0.55; font:12px system-ui,sans-serif;
        text-align:center;
      `;
      list.appendChild(empty);
      return;
    }
    for (const n of unreadNotifs) {
      const item = document.createElement('div');
      item.style.cssText = `
        padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06);
        display:flex; flex-direction:column; gap:3px;
        background:rgba(255,255,255,0.04);
      `;

      const msg = document.createElement('div');
      msg.textContent = n.message;
      msg.style.cssText = 'font:600 12px system-ui,sans-serif; line-height:1.45;';

      const time = document.createElement('div');
      time.textContent = new Date(n.createdAt).toLocaleString('fr-FR', { hour12: false });
      time.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.5;';

      item.appendChild(msg);
      item.appendChild(time);
      list.appendChild(item);
    }
  }

  async function refresh() {
    const all = await getNotifications();
    unreadNotifs = all.filter(n => !n.read);
    updateBadge();
    if (open) renderList();
  }

  function startPolling() {
    stopPolling();
    refresh();
    pollTimer = setInterval(refresh, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  // ── Events ────────────────────────────────────────────────────────────────
  readAllBtn.addEventListener('click', async () => {
    await markAllRead();
    unreadNotifs = [];
    updateBadge();
    renderList();
  });

  // Ferme en cliquant en dehors
  document.addEventListener('click', (e) => {
    if (open && !panel.contains(e.target)) {
      open = false;
      panel.style.display = 'none';
    }
  });

  // ── Public API ────────────────────────────────────────────────────────────
  function toggle() {
    if (!loggedIn) return;
    open = !open;
    panel.style.display = open ? 'flex' : 'none';
    if (open) renderList();
  }

  function setLoggedIn(isLoggedIn) {
    loggedIn = isLoggedIn;
    if (isLoggedIn) {
      startPolling();
    } else {
      stopPolling();
      unreadNotifs = [];
      updateBadge();
      open = false;
      panel.style.display = 'none';
    }
  }

  function remove() {
    stopPolling();
    panel.remove();
  }

  return { setLoggedIn, refresh, toggle, remove };
}
