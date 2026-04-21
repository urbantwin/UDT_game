// Icônes de navigation flottantes (bas-gauche), au-dessus du logo EPFL Guessr.
// Layout vertical bas-gauche :
//   [🎯] [📷] [🔧?]   ← icônes
//   [logo EPFL]        ← logo

export function createBottomNav({
  container = document.body,
  onCamera,
  onChallenge,
  onAdmin,
} = {}) {

  // ── Logo EPFL Guessr ───────────────────────────────────────────────────────
  const logo = document.createElement('img');
  logo.src = '/logo.jpeg';
  logo.alt = 'EPFL Guessr';
  logo.style.cssText = `
    position:fixed; left:14px; bottom:14px; z-index:1100;
    height:44px; width:auto; border-radius:10px;
    object-fit:contain;
    box-shadow:0 2px 10px rgba(0,0,0,0.55);
    pointer-events:none;
  `;
  container.appendChild(logo);

  // ── Groupe d'icônes au-dessus du logo ────────────────────────────────────
  const iconGroup = document.createElement('div');
  iconGroup.style.cssText = `
    position:fixed; left:14px; bottom:68px; z-index:1100;
    display:flex; flex-direction:row; gap:8px; align-items:center;
  `;
  container.appendChild(iconGroup);

  function makeIconBtn(icon, color, title) {
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
      -webkit-tap-highlight-color:transparent;
      outline:none;
    `;
    btn.textContent = icon;
    btn.onmouseenter  = () => btn.style.background = color;
    btn.onmouseleave  = () => btn.style.background = 'rgba(10,10,10,0.88)';
    btn.onmousedown   = () => btn.style.transform = 'scale(0.90)';
    btn.onmouseup     = () => btn.style.transform = 'scale(1)';
    btn.ontouchstart  = () => { btn.style.transform = 'scale(0.90)'; btn.style.background = color; };
    btn.ontouchend    = () => { btn.style.transform = 'scale(1)'; btn.style.background = 'rgba(10,10,10,0.88)'; };
    return btn;
  }

  // 🎯 Challenge
  const challengeBtn = makeIconBtn('🎯', 'rgba(251,191,36,0.35)', 'Challenge');
  challengeBtn.addEventListener('click', () => onChallenge?.());
  iconGroup.appendChild(challengeBtn);

  // 📷 Caméra (légèrement plus grand, rouge)
  const cameraBtn = makeIconBtn('📷', 'rgba(239,68,68,0.45)', 'Caméra');
  cameraBtn.style.width  = '52px';
  cameraBtn.style.height = '52px';
  cameraBtn.style.fontSize = '24px';
  cameraBtn.style.background = 'rgba(185,28,28,0.75)';
  cameraBtn.style.border = '2px solid rgba(239,68,68,0.5)';
  cameraBtn.onmouseenter  = () => cameraBtn.style.background = 'rgba(239,68,68,0.9)';
  cameraBtn.onmouseleave  = () => cameraBtn.style.background = 'rgba(185,28,28,0.75)';
  cameraBtn.addEventListener('click', () => onCamera?.());
  iconGroup.appendChild(cameraBtn);

  // 🔧 Admin (caché par défaut)
  const adminBtn = makeIconBtn('🔧', 'rgba(245,158,11,0.35)', 'Admin');
  adminBtn.style.display = 'none';
  adminBtn.addEventListener('click', () => onAdmin?.());
  iconGroup.appendChild(adminBtn);

  // ── Public API ────────────────────────────────────────────────────────────
  function setAdminVisible(visible) {
    adminBtn.style.display = visible ? 'flex' : 'none';
  }

  function remove() {
    iconGroup.remove();
    logo.remove();
  }

  return { setAdminVisible, remove };
}
