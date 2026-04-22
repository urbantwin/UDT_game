// Overlay horloge fixe (top-left) avec bouton paramètres ⚙️.
// Plus de dépendance Leaflet.

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

function formatCountdown(seconds) {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function createTimeOverlay({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; top:16px; right:72px; z-index:1200;
    display:flex; align-items:center; gap:8px;
    background:rgba(0,0,0,0.6); color:#fff;
    padding:6px 10px; border-radius:8px;
    font:14px system-ui,sans-serif;
    user-select:none;
  `;

  const timeLabel = document.createElement('span');
  timeLabel.textContent = formatTime(new Date());
  root.appendChild(timeLabel);

  const timerLabel = document.createElement('span');
  timerLabel.style.cssText = `
    display:none; font-size:18px; font-weight:bold;
    color:#fbbf24; letter-spacing:2px;
  `;
  root.appendChild(timerLabel);

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.textContent = '⚙️';
  settingsBtn.title = 'Paramètres';
  settingsBtn.style.cssText = `
    position:fixed; top:14px; right:14px; z-index:1201;
    width:46px; height:46px; border-radius:50%;
    background:rgb(20,20,20);
    border:1.5px solid rgba(255,255,255,0.12);
    color:#fff; cursor:pointer; line-height:1; font-size:20px;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 3px 10px rgba(0,0,0,0.45);
    transition:transform 0.1s, background 0.15s;
    -webkit-tap-highlight-color:transparent;
    outline:none;
  `;
  settingsBtn.onmouseenter = () => { settingsBtn.style.background = 'rgb(35,35,35)'; };
  settingsBtn.onmouseleave = () => { settingsBtn.style.background = 'rgb(20,20,20)'; };
  settingsBtn.onmousedown = () => { settingsBtn.style.transform = 'scale(0.90)'; };
  settingsBtn.onmouseup = () => { settingsBtn.style.transform = 'scale(1)'; };
  settingsBtn.ontouchstart = () => {
    settingsBtn.style.transform = 'scale(0.90)';
    settingsBtn.style.background = 'rgb(35,35,35)';
  };
  settingsBtn.ontouchend = () => {
    settingsBtn.style.transform = 'scale(1)';
    settingsBtn.style.background = 'rgb(20,20,20)';
  };

  container.appendChild(root);
  container.appendChild(settingsBtn);

  let timerRemaining = 0;
  let onSettingsClickHandler = null;

  const intervalId = setInterval(() => {
    timeLabel.textContent = formatTime(new Date());
    if (timerRemaining > 0) {
      timerRemaining--;
      timerLabel.textContent = formatCountdown(timerRemaining);
      if (timerRemaining === 0) timerLabel.style.display = 'none';
    }
  }, 1000);

  settingsBtn.addEventListener('click', () => onSettingsClickHandler?.());

  function startTimer(seconds = 60) {
    timerRemaining = seconds;
    timerLabel.textContent = formatCountdown(seconds);
    timerLabel.style.display = 'inline';
  }

  function remove() {
    clearInterval(intervalId);
    settingsBtn.remove();
    root.remove();
  }

  return {
    remove,
    startTimer,
    onSettingsClick: (handler) => { onSettingsClickHandler = handler; },
  };
}
