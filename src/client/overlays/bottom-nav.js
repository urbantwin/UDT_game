// Floating navigation.
// Modes: "guessr" and "king".

export function createBottomNav({
  container = document.body,
  onCamera,
  onChallenge,
  onAdmin,
  onOpenLeaderboard,
  onOpenRoomList,
} = {}) {
  const logo = document.createElement('img');
  logo.src = '/logo_king.png';
  logo.alt = 'EPFL Guessr';
  logo.style.cssText = `
    position:fixed; left:50px; top:14px; z-index:1100;
    height:60px; width:auto; border-radius:10px;
    object-fit:contain; box-shadow:0 2px 10px rgba(0,0,0,0.55);
    pointer-events:none; transition:opacity 0.25s;
  `;
  container.appendChild(logo);

  // Kept for compatibility; intentionally hidden by design.
  const modeBadge = document.createElement('div');
  modeBadge.style.cssText = `
    position:fixed; left:50px; top:78px; z-index:1100;
    font:700 9px system-ui,sans-serif; letter-spacing:0.08em;
    text-transform:uppercase; padding:2px 7px; border-radius:10px;
    pointer-events:none; transition:background 0.25s, color 0.25s;
    display:none;
  `;
  const modeTextEl = document.createElement('span');
  modeBadge.appendChild(modeTextEl);
  container.appendChild(modeBadge);

  // Kept for compatibility; intentionally hidden to avoid duplicate user display.
  const userBlock = document.createElement('div');
  userBlock.style.cssText = `
    position:fixed; left:50px; top:96px; z-index:1100;
    display:none; align-items:center; gap:5px;
    font:600 10px system-ui,sans-serif; color:rgba(255,255,255,0.75);
    pointer-events:none;
  `;
  const userTeamDot = document.createElement('span');
  userTeamDot.style.cssText = 'display:none; width:8px; height:8px; border-radius:50%; flex-shrink:0;';
  const userNameEl = document.createElement('span');
  userBlock.appendChild(userTeamDot);
  userBlock.appendChild(userNameEl);
  container.appendChild(userBlock);

  const leaderboardBtn = document.createElement('button');
  leaderboardBtn.style.cssText = `
    position:fixed;
    left:50px;
    top:88px;
    z-index:1100;
    display:none;
    background:linear-gradient(135deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95));
    color:#fff;
    border:none;
    border-radius:12px;
    padding:9px 16px;
    font:700 14px system-ui,sans-serif;
    letter-spacing:0.02em;
    cursor:pointer;
    box-shadow:0 5px 14px rgba(79,70,229,0.35);
    backdrop-filter:blur(8px);
    transition:
      transform 0.15s ease,
      background 0.15s ease,
      box-shadow 0.15s ease;
  `;
  leaderboardBtn.textContent = 'Classements';
  leaderboardBtn.addEventListener('mouseenter', () => {
    leaderboardBtn.style.transform = 'scale(1.04)';
    leaderboardBtn.style.boxShadow = '0 8px 20px rgba(79,70,229,0.45)';
  });
  leaderboardBtn.addEventListener('mouseleave', () => {
    leaderboardBtn.style.transform = 'scale(1)';
    leaderboardBtn.style.boxShadow = '0 5px 14px rgba(79,70,229,0.35)';
  });
  leaderboardBtn.addEventListener('click', () => onOpenLeaderboard?.());
  container.appendChild(leaderboardBtn);

  const roomListBtn = document.createElement('button');
  roomListBtn.style.cssText = `
    position:fixed;
    left:50px;
    top:136px;
    z-index:1100;
    display:none;
    background:linear-gradient(135deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95));
    color:#fff;
    border:none;
    border-radius:12px;
    padding:9px 16px;
    font:700 14px system-ui,sans-serif;
    letter-spacing:0.02em;
    cursor:pointer;
    box-shadow:0 5px 14px rgba(79,70,229,0.35);
    backdrop-filter:blur(8px);
    transition:
      transform 0.15s ease,
      background 0.15s ease,
      box-shadow 0.15s ease;
  `;
  roomListBtn.textContent = 'Liste des salles';
  roomListBtn.addEventListener('mouseenter', () => {
    roomListBtn.style.transform = 'scale(1.04)';
    roomListBtn.style.boxShadow = '0 8px 20px rgba(79,70,229,0.45)';
  });
  roomListBtn.addEventListener('mouseleave', () => {
    roomListBtn.style.transform = 'scale(1)';
    roomListBtn.style.boxShadow = '0 5px 14px rgba(79,70,229,0.35)';
  });
  roomListBtn.addEventListener('click', () => onOpenRoomList?.());
  container.appendChild(roomListBtn);

  const roomCountEl = document.createElement('div');
  roomCountEl.style.cssText = `
    position:fixed; top:14px; right:72px; z-index:1100;
    display:none;
    background:rgba(99,102,241,0.75); color:#fff;
    font:700 11px system-ui,sans-serif; letter-spacing:0.04em;
    padding:4px 14px; border-radius:20px;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    pointer-events:none;
  `;
  container.appendChild(roomCountEl);

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
    btn.onmouseenter = () => { btn.style.background = color; };
    btn.onmouseleave = () => { btn.style.background = btn._baseBg ?? 'rgba(10,10,10,0.88)'; };
    btn.onmousedown = () => { btn.style.transform = 'scale(0.90)'; };
    btn.onmouseup = () => { btn.style.transform = 'scale(1)'; };
    btn.ontouchstart = () => { btn.style.transform = 'scale(0.90)'; btn.style.background = color; };
    btn.ontouchend = () => { btn.style.transform = 'scale(1)'; btn.style.background = btn._baseBg ?? 'rgba(10,10,10,0.88)'; };
    return btn;
  }

  const challengeBtn = makeIconBtn('🎯', 'rgb(255,255,255)', 'Challenge');
  challengeBtn.addEventListener('click', () => onChallenge?.());
  iconGroup.appendChild(challengeBtn);

  const cameraBtn = makeIconBtn('📷', 'rgb(255,255,255)', 'Camera');
  cameraBtn.style.width = '52px';
  cameraBtn.style.height = '52px';
  cameraBtn.style.fontSize = '24px';
  cameraBtn.style.background = 'rgba(185,28,28,0.75)';
  cameraBtn.style.border = '2px solid rgba(239,68,68,0.5)';
  cameraBtn._baseBg = 'rgba(185,28,28,0.75)';
  cameraBtn.onmouseenter = () => { cameraBtn.style.background = 'rgba(239,68,68,0.9)'; };
  cameraBtn.onmouseleave = () => { cameraBtn.style.background = 'rgba(185,28,28,0.75)'; };
  cameraBtn.addEventListener('click', () => onCamera?.());
  iconGroup.appendChild(cameraBtn);

  const adminBtn = makeIconBtn('🔧', 'rgba(245,158,11,0.35)', 'Admin');
  adminBtn.style.display = 'none';
  adminBtn.addEventListener('click', () => onAdmin?.());
  iconGroup.appendChild(adminBtn);

  let currentMode = 'guessr';

  function setMode(mode) {
    currentMode = mode;
    if (mode === 'king') {
      challengeBtn.style.display = 'none';
      cameraBtn.style.display = 'none';
      modeTextEl.textContent = '';
    } else {
      challengeBtn.style.display = 'flex';
      cameraBtn.style.display = 'flex';
      modeTextEl.textContent = '';
      roomCountEl.style.display = 'none';
    }
  }

  function setLoggedIn(loggedIn) {
    modeBadge.style.display = 'none';
    userBlock.style.display = 'none';
    leaderboardBtn.style.display = loggedIn && currentMode === 'king' ? 'block' : 'none';
    roomListBtn.style.display = loggedIn && currentMode === 'king' ? 'block' : 'none';
  }

  function setAdminVisible(visible) {
    adminBtn.style.display = visible ? 'flex' : 'none';
  }

  function setUser(username, teamColor) {
    userNameEl.textContent = username ?? '';
    if (teamColor) {
      userTeamDot.style.background = teamColor;
      userTeamDot.style.display = 'inline-block';
    } else {
      userTeamDot.style.display = 'none';
    }
  }

  function setRoomCount(controlled, total) {
    if (controlled === null || controlled === undefined || currentMode !== 'king') {
      roomCountEl.style.display = 'none';
      roomListBtn.style.display = 'none';
      return;
    }
    roomCountEl.textContent = `${controlled} / ${total} salles`;
    roomCountEl.style.display = 'block';
    leaderboardBtn.style.display = 'block';
    roomListBtn.style.display = 'block';
  }

  function remove() {
    iconGroup.remove();
    logo.remove();
    modeBadge.remove();
    userBlock.remove();
    leaderboardBtn.remove();
    roomListBtn.remove();
    roomCountEl.remove();
  }

  setMode('guessr');
  return { setMode, setLoggedIn, setAdminVisible, setUser, setRoomCount, remove };
}
