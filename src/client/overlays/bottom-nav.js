// Navigation flottante bas-gauche.
// Deux modes : 'guessr' (EPFL Guessr) et 'king' (King of the Campus).

export function createBottomNav({
  container = document.body,
  onCamera,
  onChallenge,
  onSwitchMode,      // (newMode: 'guessr'|'king') => void
  onOpenRoomList,    // ouvre la liste complète des salles (king mode)
  onAdmin,
} = {}) {

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logo = document.createElement('img');
  logo.src = '/logo.jpeg';
  logo.alt = 'EPFL Guessr';
  logo.style.cssText = `
    position:fixed; left:50px; top:14px; z-index:1100;
    height:60px; width:auto; border-radius:10px;
    object-fit:contain; box-shadow:0 2px 10px rgba(0,0,0,0.55);
    pointer-events:none; transition:opacity 0.25s;
  `;
  container.appendChild(logo);

  // Badge de mode affiché sous le logo
  const modeBadge = document.createElement('div');
  modeBadge.style.cssText = `
    position:fixed; left:50px; top:78px; z-index:1100;
    font:700 9px system-ui,sans-serif; letter-spacing:0.08em;
    text-transform:uppercase; padding:2px 7px; border-radius:10px;
    pointer-events:none; transition:background 0.25s, color 0.25s;
  `;
  container.appendChild(modeBadge);

  // ── Groupe d'icônes ───────────────────────────────────────────────────────
  const iconGroup = document.createElement('div');
  iconGroup.style.cssText = `
    position:fixed; left:14px; bottom:64px; z-index:1100;
    display:flex; flex-direction:row; gap:8px; align-items:center;
  `;
  container.appendChild(iconGroup);

  function makeIconBtn(icon, color, title, extraCss = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = title;
    btn.style.cssText = `
      width:46px; height:46px; border-radius:50%;
      background:rgba(10,10,10,0.88);
      border:1.5px solid rgba(255,255,255,0.12);
      display:flex; align-items:center; justify-content:center;
      font-size:22px; cursor:pointer; line-height:1;
      box-shadow:0 3px 10px rgba(0,0,0,0.45);
      transition:transform 0.1s, background 0.15s;
      -webkit-tap-highlight-color:transparent; outline:none;
      ${extraCss}
    `;
    btn.textContent = icon;
    btn.onmouseenter  = () => btn.style.background = color;
    btn.onmouseleave  = () => btn.style.background = btn._baseBg ?? 'rgba(10,10,10,0.88)';
    btn.onmousedown   = () => btn.style.transform = 'scale(0.90)';
    btn.onmouseup     = () => btn.style.transform = 'scale(1)';
    btn.ontouchstart  = () => { btn.style.transform = 'scale(0.90)'; btn.style.background = color; };
    btn.ontouchend    = () => { btn.style.transform = 'scale(1)'; btn.style.background = btn._baseBg ?? 'rgba(10,10,10,0.88)'; };
    btn._hoverColor = color;
    return btn;
  }

  // 🎯 Challenge (Guessr uniquement)
  const challengeBtn = makeIconBtn('🎯', 'rgb(255,255,255)', 'Challenge');
  challengeBtn.addEventListener('click', () => onChallenge?.());
  iconGroup.appendChild(challengeBtn);

  // 📋 Liste des salles (King mode uniquement, visible si connecté)
  const listBtn = makeIconBtn('📋', 'rgba(99,102,241,0.6)', 'Liste des salles');
  listBtn.style.display = 'none';
  listBtn.addEventListener('click', () => onOpenRoomList?.());
  iconGroup.appendChild(listBtn);

  // 🎮 Switch de mode (visible si connecté)
  const switchBtn = makeIconBtn('🎮', 'rgba(99,102,241,0.6)', 'King of the Campus');
  switchBtn.style.display = 'none';
  iconGroup.appendChild(switchBtn);

  // 📷 Caméra
  const cameraBtn = makeIconBtn('📷', 'rgb(255,255,255)', 'Caméra');
  cameraBtn.style.width  = '52px';
  cameraBtn.style.height = '52px';
  cameraBtn.style.fontSize = '24px';
  cameraBtn.style.background = 'rgba(185,28,28,0.75)';
  cameraBtn.style.border = '2px solid rgba(239,68,68,0.5)';
  cameraBtn._baseBg = 'rgba(185,28,28,0.75)';
  cameraBtn.onmouseenter  = () => cameraBtn.style.background = 'rgba(239,68,68,0.9)';
  cameraBtn.onmouseleave  = () => cameraBtn.style.background = 'rgba(185,28,28,0.75)';
  cameraBtn.addEventListener('click', () => onCamera?.());
  iconGroup.appendChild(cameraBtn);

  // 🔧 Admin
  const adminBtn = makeIconBtn('🔧', 'rgba(245,158,11,0.35)', 'Admin');
  adminBtn.style.display = 'none';
  adminBtn.addEventListener('click', () => onAdmin?.());
  iconGroup.appendChild(adminBtn);

  // ── État du mode ──────────────────────────────────────────────────────────
  let currentMode = 'guessr';

  switchBtn.addEventListener('click', () => {
    const next = currentMode === 'guessr' ? 'king' : 'guessr';
    onSwitchMode?.(next);
  });

  // ── API publique ──────────────────────────────────────────────────────────
  function setMode(mode) {
    currentMode = mode;
    if (mode === 'king') {
      switchBtn.title = 'EPFL Guessr';
      switchBtn._baseBg = 'rgba(99,102,241,0.45)';
      switchBtn.style.background = 'rgba(99,102,241,0.45)';
      switchBtn.style.border = '1.5px solid rgba(129,140,248,0.5)';
      challengeBtn.style.display = 'none';
      listBtn.style.display = 'flex';
      cameraBtn.style.display = 'none';
      modeBadge.textContent = '👑 King of the Campus';
      modeBadge.style.background = 'rgba(99,102,241,0.7)';
      modeBadge.style.color = '#fff';
    } else {
      switchBtn.title = 'King of the Campus';
      switchBtn._baseBg = 'rgba(10,10,10,0.88)';
      switchBtn.style.background = 'rgba(10,10,10,0.88)';
      switchBtn.style.border = '1.5px solid rgba(255,255,255,0.12)';
      challengeBtn.style.display = 'flex';
      listBtn.style.display = 'none';
      cameraBtn.style.display = 'flex';
      modeBadge.textContent = '🎮 EPFL Guessr';
      modeBadge.style.background = 'rgba(30,30,30,0.75)';
      modeBadge.style.color = 'rgba(255,255,255,0.7)';
    }
  }

  function setLoggedIn(loggedIn) {
    switchBtn.style.display = loggedIn ? 'flex' : 'none';
    modeBadge.style.display = loggedIn ? 'block' : 'none';
  }

  function setAdminVisible(visible) {
    adminBtn.style.display = visible ? 'flex' : 'none';
  }

  function remove() {
    iconGroup.remove();
    logo.remove();
    modeBadge.remove();
  }

  // Initialiser le badge en mode guessr
  setMode('guessr');
  modeBadge.style.display = 'none';

  return { setMode, setLoggedIn, setAdminVisible, remove };
}
