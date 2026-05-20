import { getRoomMayors } from '../services/challenge-api.js';
import { getCtfRooms } from '../services/ctf-api.js';

export function createRoomListOverlay({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; left:0; top:33vh; bottom:0; z-index:1250;
    width:320px; max-width:92vw;
    transform:translateX(-100%);
    transition:transform 0.25s ease;
    display:flex; flex-direction:column;
    pointer-events:none;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:rgba(15,15,15,0.96); color:#fff;
    border-top-right-radius:12px;
    display:flex; flex-direction:column;
    height:100%;
    box-shadow:4px 0 24px rgba(0,0,0,0.5);
    pointer-events:all;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display:flex; justify-content:space-between; align-items:center;
    padding:14px 12px 12px;
    border-bottom:1px solid rgba(255,255,255,0.08);
    flex-shrink:0;
  `;
  const titleEl = document.createElement('span');
  titleEl.textContent = 'Liste des salles';
  titleEl.style.cssText = 'font-weight:600; font-size:14px;';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    min-width:44px; min-height:44px; padding:6px 10px;
    background:rgba(255,255,255,0.1); color:#fff;
    border:none; border-radius:6px; font:14px system-ui,sans-serif;
    cursor:pointer; flex-shrink:0;
  `;
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const statusEl = document.createElement('div');
  statusEl.style.cssText = `
    font:11px system-ui,sans-serif; opacity:0.75;
    padding:8px 12px 0; flex-shrink:0;
  `;

  const scrollArea = document.createElement('div');
  scrollArea.style.cssText = `
    flex:1; overflow-y:auto; padding:10px 12px 18px;
    -webkit-overflow-scrolling:touch;
  `;
  const listEl = document.createElement('div');
  listEl.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
  scrollArea.appendChild(listEl);

  panel.appendChild(header);
  panel.appendChild(statusEl);
  panel.appendChild(scrollArea);
  root.appendChild(panel);
  container.appendChild(root);

  closeBtn.addEventListener('click', close);

  function tint(color, alpha = 0.22) {
    if (!color) return 'rgba(255,255,255,0.06)';
    const hex = String(color).replace('#', '');
    if (hex.length !== 6) return 'rgba(255,255,255,0.06)';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function renderRow(room, mayorName) {
    const row = document.createElement('div');
    const controlled = Boolean(mayorName);
    row.style.cssText = `
      border-radius:8px; padding:8px 10px;
      border:1px solid ${controlled ? tint(room.teamColor, 0.45) : 'rgba(255,255,255,0.12)'};
      background:${controlled ? tint(room.teamColor, 0.24) : 'rgba(255,255,255,0.05)'};
      display:flex; flex-direction:column; gap:2px;
    `;

    const roomName = document.createElement('div');
    roomName.textContent = room.locationLabel;
    roomName.style.cssText = 'font:600 12px system-ui,sans-serif;';

    const status = document.createElement('div');
    status.textContent = controlled ? `controle par ${mayorName}` : 'libre';
    status.style.cssText = `
      font:11px system-ui,sans-serif;
      color:${controlled ? '#ffffff' : 'rgba(255,255,255,0.7)'};
      opacity:0.95;
    `;

    row.appendChild(roomName);
    row.appendChild(status);
    return row;
  }

  async function refresh() {
    statusEl.textContent = 'Chargement...';
    listEl.innerHTML = '';
    try {
      const [rooms, mayors] = await Promise.all([getCtfRooms(), getRoomMayors()]);
      const mayorNameByLocation = new Map(
        mayors
          .filter((loc) => loc?.mayor?.username)
          .map((loc) => [loc.locationId, loc.mayor.username])
      );
      const sortedRooms = [...rooms].sort((a, b) => a.locationLabel.localeCompare(b.locationLabel, 'fr'));
      for (const room of sortedRooms) {
        listEl.appendChild(renderRow(room, mayorNameByLocation.get(room.locationId) ?? null));
      }
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = err?.message || 'Erreur de chargement.';
    }
  }

  function open() {
    root.style.transform = 'translateX(0)';
    root.style.pointerEvents = 'all';
    refresh();
  }

  function close() {
    root.style.transform = 'translateX(-100%)';
    root.style.pointerEvents = 'none';
  }

  function toggle() {
    const isOpen = root.style.transform === 'translateX(0)';
    if (isOpen) close();
    else open();
  }

  function remove() {
    root.remove();
  }

  return { open, close, toggle, refresh, remove };
}
