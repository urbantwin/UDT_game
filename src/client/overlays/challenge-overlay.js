import { CHALLENGE_WINDOW } from '../../../game/game-config.js';

function isChallengeWindowOpen(now = new Date()) {
  const toMinutes = (t) => t.hour * 60 + t.minute;
  const start = CHALLENGE_WINDOW?.start ?? { hour: 12, minute: 0 };
  const end   = CHALLENGE_WINDOW?.end   ?? { hour: 23, minute: 59 };
  const current  = now.getHours() * 60 + now.getMinutes();
  const startMin = toMinutes(start);
  const endMin   = toMinutes(end);
  if (startMin <= endMin) return current >= startMin && current <= endMin;
  return current >= startMin || current <= endMin;
}

function formatHm(value) {
  const hh = String(value?.hour   ?? 0).padStart(2, '0');
  const mm = String(value?.minute ?? 0).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function createChallengeOverlay({ container = document.body, onRequest, onGoRespond } = {}) {

  // ── Panneau (bas-gauche, au-dessus de la nav bar) — caché par défaut ──────
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; left:16px; bottom:72px; z-index:1250;
    display:none; flex-direction:column; gap:8px;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:rgba(0,0,0,0.88); color:#fff; padding:10px;
    border-radius:10px; width:220px; display:flex; flex-direction:column; gap:8px;
    box-shadow:0 4px 16px rgba(0,0,0,0.4);
  `;
  root.appendChild(panel);

  const getBtn = document.createElement('button');
  getBtn.type = 'button';
  getBtn.textContent = '🎯 Obtenir un challenge';
  getBtn.style.cssText = `
    background:#fbbf24; color:#111827; border:none; border-radius:6px;
    padding:8px 10px; cursor:pointer; font:12px system-ui,sans-serif; font-weight:600;
  `;
  panel.appendChild(getBtn);

  const stateLabel = document.createElement('div');
  stateLabel.style.cssText = 'font:11px system-ui,sans-serif; opacity:0.85;';
  panel.appendChild(stateLabel);

  const closePanelBtn = document.createElement('button');
  closePanelBtn.type = 'button';
  closePanelBtn.textContent = '✕ Fermer';
  closePanelBtn.style.cssText = `
    background:rgba(255,255,255,0.1); color:#fff; border:none; border-radius:6px;
    padding:5px 8px; cursor:pointer; font:11px system-ui,sans-serif;
  `;
  panel.appendChild(closePanelBtn);

  // ── Modal centré (photo du challenge) ────────────────────────────────────
  const modal = document.createElement('div');
  modal.style.cssText = `
    display:none; position:fixed; left:50%; top:50%;
    transform:translate(-50%,-50%); z-index:1300;
    background:rgba(0,0,0,0.92); padding:14px; border-radius:14px;
    box-shadow:0 8px 24px rgba(0,0,0,0.5);
    flex-direction:column; gap:10px; align-items:center; max-width:90vw;
  `;

  const challengeImg = document.createElement('img');
  challengeImg.alt = 'Photo du challenge';
  challengeImg.style.cssText = `
    width:min(80vw,380px); height:auto; max-height:60vh;
    object-fit:contain; border-radius:10px;
  `;
  modal.appendChild(challengeImg);

  const instruction = document.createElement('div');
  instruction.style.cssText = 'font:13px system-ui,sans-serif; text-align:center; opacity:0.9; padding:0 4px;';
  instruction.textContent = 'Va prendre une photo de ce lieu avec ton GPS actif !';
  modal.appendChild(instruction);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:8px;';

  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.textContent = "📍 J'y vais !";
  goBtn.style.cssText = `
    background:#34d399; color:#111827; border:none; border-radius:6px;
    padding:8px 14px; cursor:pointer; font:13px system-ui,sans-serif; font-weight:600;
  `;

  const closeModalBtn = document.createElement('button');
  closeModalBtn.type = 'button';
  closeModalBtn.textContent = 'Fermer';
  closeModalBtn.style.cssText = `
    background:#9ca3af; color:#111827; border:none; border-radius:6px;
    padding:8px 10px; cursor:pointer; font:12px system-ui,sans-serif;
  `;

  btnRow.appendChild(goBtn);
  btnRow.appendChild(closeModalBtn);
  modal.appendChild(btnRow);

  container.appendChild(root);
  container.appendChild(modal);

  let currentChallengePhotoId = null;

  function refreshWindowState() {
    const open = isChallengeWindowOpen();
    const windowText = `${formatHm(CHALLENGE_WINDOW?.start)}-${formatHm(CHALLENGE_WINDOW?.end)}`;
    getBtn.disabled      = !open;
    getBtn.style.opacity = open ? '1' : '0.5';
    stateLabel.textContent = open
      ? `Disponible (${windowText})`
      : `Disponible à partir de ${formatHm(CHALLENGE_WINDOW?.start)}`;
  }

  function openPanel() {
    refreshWindowState();
    root.style.display = 'flex';
  }

  function closePanel() {
    root.style.display = 'none';
  }

  getBtn.addEventListener('click', async () => {
    getBtn.disabled = true;
    stateLabel.textContent = 'Chargement…';
    try {
      if (!onRequest) throw new Error('onRequest non configuré.');
      const challenge = await onRequest();
      if (!challenge?.dataUrl) throw new Error('Pas de photo reçue.');
      currentChallengePhotoId = challenge.photoId;
      challengeImg.src = challenge.dataUrl;
      modal.style.display = 'flex';
      closePanel();
      stateLabel.textContent = 'Challenge reçu !';
    } catch (err) {
      stateLabel.textContent = err?.message || 'Erreur.';
    } finally {
      refreshWindowState();
    }
  });

  goBtn.addEventListener('click', () => {
    if (!currentChallengePhotoId) return;
    modal.style.display = 'none';
    challengeImg.src = '';
    onGoRespond?.(currentChallengePhotoId);
    currentChallengePhotoId = null;
  });

  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    challengeImg.src = '';
    currentChallengePhotoId = null;
  });

  closePanelBtn.addEventListener('click', closePanel);

  const timerId = setInterval(refreshWindowState, 5000);
  refreshWindowState();

  function remove() {
    clearInterval(timerId);
    root.remove();
    modal.remove();
  }

  return { remove, refreshWindowState, openPanel, closePanel };
}
