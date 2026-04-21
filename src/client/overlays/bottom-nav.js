// Barre de navigation mobile en bas de l'écran — icônes uniquement.
// Boutons : 🎯 Challenge | 📷 Caméra | 🔧 Admin (conditionnel)

export function createBottomNav({
  container = document.body,
  onCamera,
  onChallenge,
  onAdmin,
} = {}) {
  // ── Logo EPFL Guessr (bas-gauche, au-dessus de la nav) ───────────────────
  const logo = document.createElement('img');
  logo.src = '/logo.jpeg';
  logo.alt = 'EPFL Guessr';
  logo.style.cssText = `
    position:fixed; left:14px; bottom:62px; z-index:1100;
    height:40px; width:auto; border-radius:8px;
    object-fit:contain;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    pointer-events:none;
  `;
  container.appendChild(logo);

  // ── Barre de navigation ───────────────────────────────────────────────────
  const nav = document.createElement('nav');
  nav.style.cssText = `
    position:fixed; bottom:0; left:0; right:0; z-index:1100;
    height:58px;
    background:rgba(10,10,10,0.92);
    backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);
    border-top:1px solid rgba(255,255,255,0.08);
    display:flex; align-items:center; justify-content:space-around;
    padding:0 24px;
  `;
  container.appendChild(nav);

  function makeNavBtn(icon, label, color = '#fff') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = `
      background:transparent; border:none; cursor:pointer;
      display:flex; flex-direction:column; align-items:center; gap:3px;
      padding:6px 16px; border-radius:12px;
      transition:background 0.15s;
      -webkit-tap-highlight-color:transparent;
    `;
    btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.08)';
    btn.onmouseleave = () => btn.style.background = 'transparent';

    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.cssText = 'font-size:22px; line-height:1;';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `font:600 9px system-ui,sans-serif; color:${color}; letter-spacing:0.3px; opacity:0.75;`;

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
    return btn;
  }

  // ── Bouton Challenge ───────────────────────────────────────────────────────
  const challengeBtn = makeNavBtn('🎯', 'CHALLENGE', '#fbbf24');
  challengeBtn.addEventListener('click', () => onChallenge?.());
  nav.appendChild(challengeBtn);

  // ── Bouton Caméra ─────────────────────────────────────────────────────────
  const cameraBtn = document.createElement('button');
  cameraBtn.type = 'button';
  cameraBtn.style.cssText = `
    background:#ef4444; border:none; cursor:pointer;
    width:52px; height:52px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 0 0 4px rgba(239,68,68,0.25), 0 4px 12px rgba(0,0,0,0.5);
    font-size:24px; line-height:1;
    transition:transform 0.1s, background 0.15s;
    -webkit-tap-highlight-color:transparent;
    margin-bottom:10px;
  `;
  cameraBtn.textContent = '📷';
  cameraBtn.onmousedown = () => cameraBtn.style.transform = 'scale(0.92)';
  cameraBtn.onmouseup   = () => cameraBtn.style.transform = 'scale(1)';
  cameraBtn.ontouchstart = () => cameraBtn.style.transform = 'scale(0.92)';
  cameraBtn.ontouchend   = () => cameraBtn.style.transform = 'scale(1)';
  cameraBtn.addEventListener('click', () => onCamera?.());
  nav.appendChild(cameraBtn);

  // ── Bouton Admin (caché par défaut) ───────────────────────────────────────
  const adminBtn = makeNavBtn('🔧', 'ADMIN', '#f59e0b');
  adminBtn.style.display = 'none';
  adminBtn.addEventListener('click', () => onAdmin?.());
  nav.appendChild(adminBtn);

  // ── Public API ────────────────────────────────────────────────────────────
  function setAdminVisible(visible) {
    adminBtn.style.display = visible ? 'flex' : 'none';
  }

  function remove() {
    nav.remove();
    logo.remove();
  }

  return { setAdminVisible, remove };
}
