// Settings dropdown panel — opened by the ⚙️ button in time-overlay.
// Contains: login/register/logout, gallery shortcut, notifs toggle, test notif.

import {
  login,
  register,
  clearSession,
  getStoredUser,
} from '../services/auth-api.js';

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
