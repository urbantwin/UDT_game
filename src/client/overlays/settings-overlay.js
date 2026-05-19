// Settings dropdown panel — opened by the ⚙️ button in time-overlay.
// Contains: login/register/logout, gallery, notifs, score & leaderboard, règlement.

import {
  login,
  register,
  logout,
  getStoredUser,
} from '../services/auth-api.js';
import { getLeaderboard, getMyScore } from '../services/leaderboard-api.js';
import { getMyKingStats, getRoomMayors } from '../services/challenge-api.js';

const NOTIFS_KEY = 'udt-notifs-enabled';

export function createSettingsOverlay({
  container = document.body,
  onAuthChange,
  onOpenGallery,
  onEnableNotifs,
  onDisableNotifs,
  onTestNotif,
  onOpenNotifications,
  onSwitchMode,
} = {}) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position:fixed; top:100px; right:16px; z-index:1250;
    display:none; flex-direction:column; gap:8px;
    background:rgba(10,10,10,0.95); color:#fff;
    padding:12px; border-radius:10px; width:220px;
    box-shadow:0 6px 20px rgba(0,0,0,0.55);
    font:12px system-ui,sans-serif;
  `;
  container.appendChild(panel);

  let currentUser = getStoredUser();
  let notifsEnabled = false;
  let isOpen = false;
  let gameMode = 'guessr';

  // ── Auth section ──────────────────────────────────────────────────────────
  const userLabel = document.createElement('div');
  userLabel.style.cssText = 'font-weight:600; font-size:13px; margin-bottom:2px;';
  panel.appendChild(userLabel);

  const usernameInput = document.createElement('input');
  usernameInput.placeholder = "Nom d'utilisateur";
  usernameInput.autocomplete = 'username';
  usernameInput.style.cssText = `
    padding:6px; border-radius:6px; border:none;
    font:12px system-ui,sans-serif; width:100%; box-sizing:border-box;
    background:#1f2937; color:#fff;
  `;

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.placeholder = 'Mot de passe';
  passwordInput.autocomplete = 'current-password';
  passwordInput.style.cssText = `
    padding:6px; border-radius:6px; border:none;
    font:12px system-ui,sans-serif; width:100%; box-sizing:border-box;
    background:#1f2937; color:#fff;
  `;

  const authBtns = document.createElement('div');
  authBtns.style.cssText = 'display:flex; gap:6px;';
  const loginBtn    = makeBtn('Connexion',    '#60a5fa');
  const registerBtn = makeBtn('Inscription',  '#86efac');
  const logoutBtn   = makeBtn('Déconnexion',  '#fca5a5');
  authBtns.appendChild(loginBtn);
  authBtns.appendChild(registerBtn);
  authBtns.appendChild(logoutBtn);

  const authStatus = document.createElement('div');
  authStatus.style.cssText = 'font-size:11px; opacity:0.8; min-height:14px;';

  panel.appendChild(usernameInput);
  panel.appendChild(passwordInput);
  panel.appendChild(authBtns);
  panel.appendChild(authStatus);

  panel.appendChild(makeDivider());

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifsRow = document.createElement('div');
  notifsRow.style.cssText = 'display:flex; align-items:center; gap:6px;';

  const openNotifsBtn = makeBtn('🔔 Notifications', 'rgba(255,255,255,0.1)');
  openNotifsBtn.style.color = '#fff';
  openNotifsBtn.style.flex = '1';
  openNotifsBtn.style.textAlign = 'left';
  openNotifsBtn.addEventListener('click', () => {
    close();
    onOpenNotifications?.();
  });

  const notifBadge = document.createElement('span');
  notifBadge.style.cssText = `
    background:#ef4444; color:#fff; border-radius:10px;
    min-width:18px; height:18px; font:bold 10px system-ui,sans-serif;
    display:none; align-items:center; justify-content:center; padding:0 4px;
    flex-shrink:0;
  `;

  notifsRow.appendChild(openNotifsBtn);
  notifsRow.appendChild(notifBadge);
  panel.appendChild(notifsRow);

  panel.appendChild(makeDivider());

/*
  // ── Gallery ───────────────────────────────────────────────────────────────
  const galleryBtn = makeBtn('📷 Galerie', 'rgba(255,255,255,0.1)');
  galleryBtn.style.color = '#fff';
  galleryBtn.style.width = '100%';
  panel.appendChild(galleryBtn);

  panel.appendChild(makeDivider());

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifsBtn    = makeBtn('🔔 Activer notifs', '#60a5fa');
  const testNotifBtn = makeBtn('🔁 Test notif',     '#fbbf24');
  notifsBtn.style.width    = '100%';
  testNotifBtn.style.width = '100%';
  panel.appendChild(notifsBtn);
  panel.appendChild(testNotifBtn);

  panel.appendChild(makeDivider());
*/
  // ── Score & Classement ────────────────────────────────────────────────────
  const scoreSection = document.createElement('div');
  scoreSection.style.cssText = 'display:flex; flex-direction:column; gap:6px;';

  const scoreHeader = document.createElement('div');
  scoreHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';

  const scoreTitle = document.createElement('span');
  scoreTitle.textContent = '🏆 Score & Classement';
  scoreTitle.style.cssText = 'font-weight:600; font-size:12px;';

  const refreshScoreBtn = document.createElement('button');
  refreshScoreBtn.type = 'button';
  refreshScoreBtn.textContent = '↻';
  refreshScoreBtn.title = 'Actualiser';
  refreshScoreBtn.style.cssText = `
    background:transparent; border:none; color:#9ca3af; cursor:pointer;
    font-size:14px; padding:0; line-height:1;
  `;

  scoreHeader.appendChild(scoreTitle);
  scoreHeader.appendChild(refreshScoreBtn);
  scoreSection.appendChild(scoreHeader);

  // Ligne "Mon score: X pts | Rang: #Y"
  const myScoreEl = document.createElement('div');
  myScoreEl.style.cssText = `
    font-size:12px; background:rgba(255,255,255,0.07);
    border-radius:6px; padding:6px 8px; line-height:1.6;
  `;
  myScoreEl.textContent = 'Connectez-vous pour voir votre score.';
  scoreSection.appendChild(myScoreEl);

  // Bouton pour afficher/masquer le classement complet
  const toggleLbBtn = makeBtn('📋 Voir le classement', 'rgba(255,255,255,0.1)');
  toggleLbBtn.style.color = '#fff';
  toggleLbBtn.style.width = '100%';
  scoreSection.appendChild(toggleLbBtn);

  // Zone classement (masquée par défaut)
  const lbList = document.createElement('div');
  lbList.style.cssText = `
    display:none; flex-direction:column; gap:2px;
    max-height:200px; overflow-y:auto;
    background:rgba(0,0,0,0.3); border-radius:6px; padding:4px;
  `;
  scoreSection.appendChild(lbList);

  panel.appendChild(scoreSection);

  // ── Score King of the Campus ──────────────────────────────────────────────
  const kingSection = document.createElement('div');
  kingSection.style.cssText = 'display:none; flex-direction:column; gap:6px;';

  const kingHeader = document.createElement('div');
  kingHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
  const kingTitle = document.createElement('span');
  kingTitle.textContent = '👑 Dernière salle';
  kingTitle.style.cssText = 'font-weight:600; font-size:12px;';
  const refreshKingBtn = document.createElement('button');
  refreshKingBtn.type = 'button';
  refreshKingBtn.textContent = '↻';
  refreshKingBtn.title = 'Actualiser';
  refreshKingBtn.style.cssText = 'background:transparent; border:none; color:#9ca3af; cursor:pointer; font-size:14px; padding:0; line-height:1;';
  kingHeader.appendChild(kingTitle);
  kingHeader.appendChild(refreshKingBtn);
  kingSection.appendChild(kingHeader);

  const lastRoomEl = document.createElement('div');
  lastRoomEl.style.cssText = 'font-size:12px; background:rgba(255,255,255,0.07); border-radius:6px; padding:6px 8px; line-height:1.6;';
  lastRoomEl.textContent = 'Connectez-vous pour voir votre statut.';
  kingSection.appendChild(lastRoomEl);

  const myRoomsTitle = document.createElement('div');
  myRoomsTitle.textContent = '⏱ Mes salles actives';
  myRoomsTitle.style.cssText = 'font-weight:600; font-size:11px; margin-top:4px;';
  kingSection.appendChild(myRoomsTitle);

  const myRoomsEl = document.createElement('div');
  myRoomsEl.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
  kingSection.appendChild(myRoomsEl);

  kingSection.appendChild(makeDivider());

  /* // Removed switchmode button
  const switchModeBtn = makeBtn('🎮 Changer de jeu', 'rgba(99,102,241,0.7)');
  switchModeBtn.style.color = '#fff';
  switchModeBtn.style.width = '100%';
  switchModeBtn.addEventListener('click', () => {
    close();
    onSwitchMode?.();
  });
  kingSection.appendChild(switchModeBtn);
*/

  panel.appendChild(kingSection);

  panel.appendChild(makeDivider());

  // ── Règlement ─────────────────────────────────────────────────────────────
  const rulesBtn = makeBtn('📖 Règles du jeu', 'rgba(255,255,255,0.1)');
  rulesBtn.style.color = '#fff';
  rulesBtn.style.width = '100%';
  panel.appendChild(rulesBtn);

  // ── Score events ──────────────────────────────────────────────────────────
  let lbVisible = false;

  async function loadMyScore() {
    if (!currentUser) {
      myScoreEl.textContent = 'Connectez-vous pour voir votre score.';
      return;
    }
    myScoreEl.textContent = '…';
    try {
      const data = await getMyScore();
      if (data) {
        myScoreEl.innerHTML =
          `<b>${currentUser.username}</b><br>` +
          `🏅 <b>${data.score} pts</b> &nbsp;|&nbsp; Rang : <b>#${data.rank}</b>`;
      } else {
        myScoreEl.textContent = 'Score indisponible.';
      }
    } catch {
      myScoreEl.textContent = 'Erreur de chargement.';
    }
  }

  async function loadLeaderboard() {
    lbList.innerHTML = '<div style="opacity:0.6;font-size:11px;padding:4px">Chargement…</div>';
    try {
      const rows = await getLeaderboard();
      lbList.innerHTML = '';
      if (!rows.length) {
        lbList.innerHTML = '<div style="opacity:0.6;font-size:11px;padding:4px">Aucun joueur.</div>';
        return;
      }
      for (const p of rows) {
        const entry = document.createElement('div');
        entry.style.cssText = `
          display:flex; justify-content:space-between; align-items:center;
          padding:3px 6px; border-radius:4px; font-size:11px;
          background:${currentUser?.username === p.username ? 'rgba(96,165,250,0.2)' : 'transparent'};
        `;
        const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
        entry.innerHTML = `<span>${medal} ${p.username}</span><span style="font-weight:600">${p.score} pts</span>`;
        lbList.appendChild(entry);
      }
    } catch {
      lbList.innerHTML = '<div style="color:#fca5a5;font-size:11px;padding:4px">Erreur de chargement.</div>';
    }
  }

  // ── King stats ────────────────────────────────────────────────────────────
  let mayorData = [];
  let kingTickId = null;

  function formatCountdown(unixSec) {
    const remaining = unixSec - Math.floor(Date.now() / 1000);
    if (remaining <= 0) return null;
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2,'0')}min`;
    if (m > 0) return `${m}min ${String(s).padStart(2,'0')}s`;
    return `${s}s`;
  }

  function tickKingCountdowns() {
    const nowSec = Math.floor(Date.now() / 1000);
    for (const el of panel.querySelectorAll('[data-king-deadline]')) {
      const endsAt = Number(el.dataset.kingDeadline);
      const txt = formatCountdown(endsAt);
      const urgent = endsAt - nowSec < 3600;
      el.textContent = txt ? `⏰ Renouveler avant : ${txt}` : '⚠️ Délai dépassé !';
      el.style.color = urgent ? '#ef4444' : '#fbbf24';
    }
  }

  function renderMyActiveRooms(rooms) {
    myRoomsEl.innerHTML = '';
    const nowSec = Math.floor(Date.now() / 1000);
    const myRooms = rooms.filter(loc => loc.mayor?.userId === currentUser?.id);
    if (myRooms.length === 0) {
      const none = document.createElement('div');
      none.textContent = 'Aucune salle revendiquée.';
      none.style.cssText = 'font-size:11px; opacity:0.55; padding:2px 0;';
      myRoomsEl.appendChild(none);
      return;
    }
    for (const loc of myRooms) {
      const row = document.createElement('div');
      row.style.cssText = `
        background:rgba(255,255,255,0.07); border-radius:6px;
        padding:5px 8px; display:flex; flex-direction:column; gap:2px;
      `;
      const nameEl = document.createElement('div');
      nameEl.textContent = `👑 ${loc.locationLabel}`;
      nameEl.style.cssText = 'font:600 11px system-ui; color:#34d399;';
      row.appendChild(nameEl);
      if (loc.mayor?.renewalDeadline) {
        const deadlineEl = document.createElement('div');
        deadlineEl.dataset.kingDeadline = String(loc.mayor.renewalDeadline);
        const txt = formatCountdown(loc.mayor.renewalDeadline);
        const urgent = loc.mayor.renewalDeadline - nowSec < 3600;
        deadlineEl.textContent = txt ? `⏰ Renouveler avant : ${txt}` : '⚠️ Délai dépassé !';
        deadlineEl.style.cssText = `font:10px system-ui; color:${urgent ? '#ef4444' : '#fbbf24'};`;
        row.appendChild(deadlineEl);
      }
      myRoomsEl.appendChild(row);
    }
  }

  function formatTotalTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min ${s}s`;
    return `${s}s`;
  }

  async function loadKingScore() {
    if (!currentUser) {
      lastRoomEl.textContent = 'Connectez-vous pour voir votre statut.';
      mayorData = [];
      return;
    }
    lastRoomEl.textContent = '…';
    try {
      const [stats, mayors] = await Promise.all([getMyKingStats(), getRoomMayors()]);
      mayorData = mayors;
      if (!stats.lastRoom) {
        lastRoomEl.textContent = 'Aucune salle revendiquée encore.';
      } else {
        const r = stats.lastRoom;
        const icon = r.isMayor ? '▶️' : '⏸️';
        const rankStr = r.myRank ? `#${r.myRank}${r.totalPlayers > 1 ? ` / ${r.totalPlayers}` : ''}` : '';
        let deadlineHtml = '';
        if (r.isMayor && r.renewalDeadline) {
          const remaining = r.renewalDeadline - Math.floor(Date.now() / 1000);
          if (remaining > 0) {
            const h = Math.floor(remaining / 3600);
            const m = Math.floor((remaining % 3600) / 60);
            const timeStr = h > 0 ? `${h}h ${m}min` : `${m} min`;
            const urgent = remaining < 3600;
            deadlineHtml = `<div style="font-size:10px;color:${urgent ? '#ef4444' : '#fbbf24'};margin-top:2px;">⏰ Renouveler avant ${timeStr}</div>`;
          } else {
            deadlineHtml = `<div style="font-size:10px;color:#ef4444;margin-top:2px;">⚠️ Délai dépassé</div>`;
          }
        }
        lastRoomEl.innerHTML =
          `<div style="font-size:13px;">${icon} <b>${r.locationLabel}</b></div>` +
          `<div style="opacity:0.75;font-size:11px;">${r.isMayor ? 'Vous êtes maire' : 'Plus maire'}${rankStr ? ' · ' + rankStr : ''} · ${formatTotalTime(r.myTotalSeconds)}</div>` +
          deadlineHtml;
      }
      renderMyActiveRooms(mayors);
    } catch {
      lastRoomEl.textContent = 'Erreur de chargement.';
    }
  }

  refreshKingBtn.addEventListener('click', loadKingScore);

  toggleLbBtn.addEventListener('click', async () => {
    lbVisible = !lbVisible;
    lbList.style.display = lbVisible ? 'flex' : 'none';
    toggleLbBtn.textContent = lbVisible ? '🔼 Masquer le classement' : '📋 Voir le classement';
    if (lbVisible) await loadLeaderboard();
  });

  refreshScoreBtn.addEventListener('click', async () => {
    await loadMyScore();
    if (lbVisible) await loadLeaderboard();
  });

  rulesBtn.addEventListener('click', () => {
    window.open('/reglement.html', '_blank');
  });

  // ── Event handlers ────────────────────────────────────────────────────────
  loginBtn.addEventListener('click', async () => {
    try {
      authStatus.textContent = '...';
      const data = await login({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      });
      currentUser = data.user;
      passwordInput.value = '';
      authStatus.textContent = 'Connecté !';
      refreshAuthUi();
      gameMode === 'king' ? loadKingScore() : loadMyScore();
      onAuthChange?.(currentUser);
    } catch (err) {
      authStatus.textContent = err.message;
    }
  });

  registerBtn.addEventListener('click', async () => {
    try {
      authStatus.textContent = '...';
      const data = await register({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      });
      currentUser = data.user;
      passwordInput.value = '';
      authStatus.textContent = 'Compte créé !';
      refreshAuthUi();
      gameMode === 'king' ? loadKingScore() : loadMyScore();
      onAuthChange?.(currentUser);
    } catch (err) {
      authStatus.textContent = err.message;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    authStatus.textContent = '...';
    await logout();
    currentUser = null;
    authStatus.textContent = 'Déconnecté.';
    refreshAuthUi();
    gameMode === 'king' ? loadKingScore() : loadMyScore();
    onAuthChange?.(null);
  });
/*
  galleryBtn.addEventListener('click', () => {
    onOpenGallery?.();
    close();
  });

  notifsBtn.addEventListener('click', () => {
    if (notifsEnabled) {
      notifsEnabled = false;
      localStorage.setItem(NOTIFS_KEY, 'false');
      notifsBtn.textContent = '🔔 Activer notifs';
      notifsBtn.style.background = '#60a5fa';
      notifsBtn.style.color = '#111827';
      onDisableNotifs?.();
    } else {
      notifsBtn.disabled = true;
      notifsBtn.textContent = '…';
      onEnableNotifs?.((result) => {
        if (result?.granted) {
          notifsEnabled = true;
          localStorage.setItem(NOTIFS_KEY, 'true');
          notifsBtn.textContent = '🔔 Désactiver notifs';
          notifsBtn.style.background = '#4ade80';
          notifsBtn.style.color = '#111827';
        } else {
          notifsBtn.textContent = '🔕 Permission refusée';
          notifsBtn.style.background = '#f87171';
          notifsBtn.style.color = '#111827';
        }
        notifsBtn.disabled = false;
      });
    }
  });

  testNotifBtn.addEventListener('click', () => onTestNotif?.());
*/
  // ── Helpers ───────────────────────────────────────────────────────────────
  function refreshAuthUi() {
    const loggedIn = Boolean(currentUser?.username);
    userLabel.textContent = loggedIn ? `👤 ${currentUser.username}` : 'Non connecté';
    usernameInput.style.display = loggedIn ? 'none' : 'block';
    passwordInput.style.display = loggedIn ? 'none' : 'block';
    loginBtn.style.display    = loggedIn ? 'none'         : 'inline-block';
    registerBtn.style.display = loggedIn ? 'none'         : 'inline-block';
    logoutBtn.style.display   = loggedIn ? 'inline-block' : 'none';
    if (!loggedIn) {
      usernameInput.value = '';
      passwordInput.value = '';
    }
  }

  refreshAuthUi();

  // ── Public API ────────────────────────────────────────────────────────────
  let removeOutsideHandler = null;

  function toggle() {
    if (isOpen) {
      close();
    } else {
      isOpen = true;
      panel.style.display = 'flex';
      if (gameMode === 'king') {
        kingTickId = setInterval(tickKingCountdowns, 1000);
      }
      // Register outside-click listener on next tick so the current click
      // (on the ⚙️ button) doesn't immediately re-close the panel.
      setTimeout(() => {
        function outsideHandler(e) {
          if (!panel.contains(e.target)) {
            close();
            document.removeEventListener('click', outsideHandler);
          }
        }
        document.addEventListener('click', outsideHandler);
        removeOutsideHandler = () => document.removeEventListener('click', outsideHandler);
      }, 0);
    }
  }

  function close() {
    isOpen = false;
    panel.style.display = 'none';
    removeOutsideHandler?.();
    removeOutsideHandler = null;
    if (kingTickId) { clearInterval(kingTickId); kingTickId = null; }
  }

  function setUser(user) {
    currentUser = user ?? null;
    refreshAuthUi();
    if (gameMode === 'king') {
      loadKingScore();
    } else {
      loadMyScore();
    }
  }

  function setGameMode(mode) {
    gameMode = mode;
    if (mode === 'king') {
      scoreSection.style.display = 'none';
      kingSection.style.display = 'flex';
      if (currentUser) loadKingScore();
    } else {
      scoreSection.style.display = 'flex';
      kingSection.style.display = 'none';
    }
  }

  function setNotifBadge(count) {
    notifBadge.textContent = count > 9 ? '9+' : String(count);
    notifBadge.style.display = count > 0 ? 'flex' : 'none';
  }

  function remove() {
    panel.remove();
  }

  return { toggle, close, setUser, setGameMode, setNotifBadge, remove };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBtn(text, background) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.style.cssText = `
    background:${background}; color:#111827; border:none; border-radius:6px;
    padding:5px 8px; cursor:pointer; font:11px system-ui,sans-serif;
  `;
  return btn;
}

function makeDivider() {
  const d = document.createElement('div');
  d.style.cssText = 'height:1px; background:rgba(255,255,255,0.1); margin:2px 0;';
  return d;
}
