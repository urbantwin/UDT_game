// Settings dropdown panel — opened by the ⚙️ button in time-overlay.
// Contains: login/register/logout, gallery, notifs, score & leaderboard, règlement.

import {
  login,
  register,
  clearSession,
  getStoredUser,
} from '../services/auth-api.js';
import { getLeaderboard, getMyScore } from '../services/leaderboard-api.js';

const NOTIFS_KEY = 'udt-notifs-enabled';

export function createSettingsOverlay({
  container = document.body,
  onAuthChange,
  onOpenGallery,
  onEnableNotifs,
  onDisableNotifs,
  onTestNotif,
} = {}) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position:fixed; top:50px; left:16px; z-index:1250;
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
      loadMyScore();
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
      loadMyScore();
      onAuthChange?.(currentUser);
    } catch (err) {
      authStatus.textContent = err.message;
    }
  });

  logoutBtn.addEventListener('click', () => {
    clearSession();
    currentUser = null;
    authStatus.textContent = 'Déconnecté.';
    refreshAuthUi();
    loadMyScore();
    onAuthChange?.(null);
  });

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

  // Restore notifs state
  if (localStorage.getItem(NOTIFS_KEY) === 'true' && Notification.permission === 'granted') {
    notifsEnabled = true;
    notifsBtn.textContent = '🔔 Désactiver notifs';
    notifsBtn.style.background = '#4ade80';
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
  }

  function setUser(user) {
    currentUser = user ?? null;
    refreshAuthUi();
    loadMyScore();
  }

  function remove() {
    panel.remove();
  }

  return { toggle, close, setUser, remove };
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
