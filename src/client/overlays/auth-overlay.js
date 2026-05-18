// Compact auth display (top-right): shows 👤 : username + team color dot.
// Login/register/logout are handled by settings-overlay.

export function createAuthOverlay({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; top:68px; right:16px; z-index:1200;
    background:rgb(254, 255, 183); color:#fff;
    padding:6px 10px; border-radius:8px;
    font:13px system-ui,sans-serif;
    display:flex; align-items:center; gap:5px;
    white-space:nowrap;
  `;

  const icon = document.createElement('span');
  icon.textContent = '👤';
  root.appendChild(icon);

  const teamDot = document.createElement('span');
  teamDot.style.cssText = `
    display:none; width:10px; height:10px; border-radius:50%;
    flex-shrink:0; border:1.5px solid rgba(0,0,0,0.15);
  `;
  root.appendChild(teamDot);

  const label = document.createElement('span');
  label.textContent = ': Non connecté';
  label.style.color = 'black';
  root.appendChild(label);

  container.appendChild(root);

  function setUser(user) {
    label.textContent = user?.username ? `: ${user.username}` : ': Non connecté';
    if (!user) teamDot.style.display = 'none';
  }

  function setTeamColor(color) {
    if (color) {
      teamDot.style.background = color;
      teamDot.style.display = 'inline-block';
    } else {
      teamDot.style.display = 'none';
    }
  }

  function remove() {
    root.remove();
  }

  return { setUser, setTeamColor, remove };
}
