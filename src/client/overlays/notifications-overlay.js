import { getNotifications, markAllRead } from '../services/notifications-api.js';

const POLL_INTERVAL_MS = 20_000;

export function createNotificationsOverlay({ container = document.body } = {}) {
  // ── Conteneur (coin haut-droit) ──────────────────────────────────────────
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; top:16px; right:16px; z-index:1400;
    display:none; flex-direction:column; align-items:flex-end; gap:6px;
  `;

  // ── Bouton cloche ────────────────────────────────────────────────────────
  const bellWrap = document.createElement('div');
  bellWrap.style.cssText = 'position:relative; display:inline-block;';

  const bellBtn = document.createElement('button');
  bellBtn.type = 'button';
  bellBtn.innerHTML = '🔔';
  bellBtn.title = 'Notifications';
  bellBtn.style.cssText = `
    background:rgba(0,0,0,0.72); color:#fff; border:none; border-radius:50%;
    width:38px; height:38px; font-size:16px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  `;

  const badge = document.createElement('div');
  badge.style.cssText = `
    position:absolute; top:-4px; right:-4px;
    background:#ef4444; color:#fff; border-radius:50%;
    min-width:18px; height:18px; font:bold 10px system-ui,sans-serif;
    display:none; align-items:center; justify-content:center; padding:0 3px;
  `;

  bellWrap.appendChild(bellBtn);
  bellWrap.appendChild(badge);
  root.appendChild(bellWrap);

  // ── Panneau liste ────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.style.cssText = `
    display:none; background:rgba(10,10,10,0.94); color:#fff;
    border-radius:10px; width:280px;
    max-height:calc(100vh - 80px);
    box-shadow:0 6px 20px rgba(0,0,0,0.5);
    flex-direction:column; overflow:hidden;
    align-self:flex-start;
  `;

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

  root.appendChild(panel);
  container.appendChild(root);

  // ── State ─────────────────────────────────────────────────────────────────
  let open = false;
  let pollTimer = null;
  let unreadNotifs = [];

  // ── Helpers ──────────────────────────────────────────────────────────────
  function updateBadge() {
    const count = unreadNotifs.length;
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
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
    // N'afficher que les non-lus
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
  bellBtn.addEventListener('click', () => {
    open = !open;
    panel.style.display = open ? 'flex' : 'none';
    if (open) renderList();
  });

  readAllBtn.addEventListener('click', async () => {
    await markAllRead();
    unreadNotifs = [];
    updateBadge();
    renderList();
  });

  // ── Public API ────────────────────────────────────────────────────────────
  function setLoggedIn(loggedIn) {
    root.style.display = loggedIn ? 'flex' : 'none';
    if (loggedIn) {
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
    root.remove();
  }

  return { setLoggedIn, refresh, remove };
}
