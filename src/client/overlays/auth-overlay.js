// Compact auth display (top-right): shows 👤 : username only.
// Login/register/logout are handled by settings-overlay.

export function createAuthOverlay({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; top:16px; right:70px; z-index:1200;
    background:rgba(0,0,0,0.6); color:#fff;
    padding:6px 10px; border-radius:8px;
    font:13px system-ui,sans-serif;
    display:flex; align-items:center; gap:5px;
    white-space:nowrap;
  `;

  const icon = document.createElement('span');
  icon.textContent = '👤';
  root.appendChild(icon);

  const label = document.createElement('span');
  label.textContent = ': Non connecté';
  root.appendChild(label);

  container.appendChild(root);

  let currentUser = null;

  function setUser(user) {
    currentUser = user ?? null;
    label.textContent = currentUser?.username
      ? `: ${currentUser.username}`
      : ': Non connecté';
  }

  function remove() {
    root.remove();
  }

  return { setUser, remove };
}
