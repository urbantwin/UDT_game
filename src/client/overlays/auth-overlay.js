import {
  login,
  register,
  clearSession,
  getStoredUser
} from '../services/auth-api.js';

export function createAuthOverlay({ container = document.body, onAuthChange } = {}) {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.left = '16px';
  root.style.top = '16px';
  root.style.zIndex = '1200';
  root.style.background = 'rgba(17, 24, 39, 0.85)';
  root.style.color = '#ffffff';
  root.style.padding = '10px';
  root.style.borderRadius = '10px';
  root.style.width = '220px';
  root.style.font = '12px system-ui, sans-serif';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.gap = '8px';

  const title = document.createElement('div');
  title.textContent = 'Player Account';
  title.style.fontWeight = '600';
  root.appendChild(title);

  const userLabel = document.createElement('div');
  userLabel.style.opacity = '0.9';
  root.appendChild(userLabel);

  const usernameInput = document.createElement('input');
  usernameInput.placeholder = 'username';
  usernameInput.autocomplete = 'username';
  usernameInput.style.padding = '6px';
  usernameInput.style.borderRadius = '6px';
  usernameInput.style.border = 'none';
  root.appendChild(usernameInput);

  const passwordInput = document.createElement('input');
  passwordInput.placeholder = 'password';
  passwordInput.type = 'password';
  passwordInput.autocomplete = 'current-password';
  passwordInput.style.padding = '6px';
  passwordInput.style.borderRadius = '6px';
  passwordInput.style.border = 'none';
  root.appendChild(passwordInput);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '6px';
  root.appendChild(actions);

  const loginButton = makeButton('Login', '#60a5fa');
  const registerButton = makeButton('Register', '#86efac');
  const logoutButton = makeButton('Logout', '#fca5a5');
  actions.appendChild(loginButton);
  actions.appendChild(registerButton);
  actions.appendChild(logoutButton);

  const status = document.createElement('div');
  status.style.minHeight = '14px';
  status.style.opacity = '0.9';
  root.appendChild(status);

  container.appendChild(root);

  let currentUser = getStoredUser();
  refreshUi();

  loginButton.addEventListener('click', async () => {
    try {
      const data = await login({
        username: usernameInput.value.trim(),
        password: passwordInput.value
      });
      currentUser = data.user;
      passwordInput.value = '';
      status.textContent = 'Logged in.';
      refreshUi();
      onAuthChange?.(currentUser);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  registerButton.addEventListener('click', async () => {
    try {
      const data = await register({
        username: usernameInput.value.trim(),
        password: passwordInput.value
      });
      currentUser = data.user;
      passwordInput.value = '';
      status.textContent = 'Account created.';
      refreshUi();
      onAuthChange?.(currentUser);
    } catch (error) {
      status.textContent = error.message;
    }
  });

  logoutButton.addEventListener('click', () => {
    clearSession();
    currentUser = null;
    status.textContent = 'Logged out.';
    refreshUi();
    onAuthChange?.(null);
  });

  function setUser(user) {
    currentUser = user ?? null;
    refreshUi();
  }

  function refreshUi() {
    const loggedIn = Boolean(currentUser?.username);
    userLabel.textContent = loggedIn ? `Logged in as ${currentUser.username}` : 'Not logged in';
    usernameInput.disabled = loggedIn;
    passwordInput.disabled = loggedIn;
    loginButton.disabled = loggedIn;
    registerButton.disabled = loggedIn;
    logoutButton.disabled = !loggedIn;
    if (loggedIn) {
      usernameInput.value = currentUser.username;
    } else {
      usernameInput.value = '';
      passwordInput.value = '';
    }
  }

  function remove() {
    root.remove();
  }

  return { setUser, remove };
}

function makeButton(label, background) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.style.background = background;
  btn.style.color = '#111827';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.padding = '6px 8px';
  btn.style.font = '12px system-ui, sans-serif';
  btn.style.cursor = 'pointer';
  return btn;
}
