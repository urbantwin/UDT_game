// Leaflet overlay that displays the current time (hh:mm:ss).

import L from 'leaflet';

const NOTIFS_KEY = 'udt-notifs-enabled';

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

function formatCountdown(seconds) {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function makeButton(text, bg) {
  const btn = L.DomUtil.create('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.style.background = bg;
  btn.style.color = '#111827';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.padding = '6px 8px';
  btn.style.cursor = 'pointer';
  btn.style.font = '12px system-ui, sans-serif';
  return btn;
}

export function createTimeOverlay(map, { position = 'topright', intervalMs = 1000 } = {}) {
  let container = null;
  let timeLabel = null;
  let timerLabel = null;
  let notifsButton = null;
  let intervalId = null;
  let timerRemaining = 0;
  let notifsEnabled = false;
  let onEnableNotifs = null;
  let onDisableNotifs = null;
  let onTestNotif = null;

  const control = L.control({ position });
  control.onAdd = () => {
    container = L.DomUtil.create('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';
    container.style.background = 'rgba(0, 0, 0, 0.6)';
    container.style.color = '#ffffff';
    container.style.padding = '8px 10px';
    container.style.borderRadius = '8px';
    container.style.font = '14px system-ui, sans-serif';

    timeLabel = L.DomUtil.create('div', '', container);
    timeLabel.textContent = formatTime(new Date());

    // Timer caché par défaut — apparaît uniquement lors de l'événement
    timerLabel = L.DomUtil.create('div', '', container);
    timerLabel.style.display = 'none';
    timerLabel.style.fontSize = '22px';
    timerLabel.style.fontWeight = 'bold';
    timerLabel.style.color = '#fbbf24';
    timerLabel.style.letterSpacing = '2px';

    notifsButton = makeButton('Activer notifs', '#60a5fa');
    container.appendChild(notifsButton);
    notifsButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (notifsEnabled) {
        notifsEnabled = false;
        localStorage.setItem(NOTIFS_KEY, 'false');
        notifsButton.textContent = 'Activer notifs';
        notifsButton.style.background = '#60a5fa';
        notifsButton.disabled = false;
        onDisableNotifs?.();
      } else {
        notifsButton.disabled = true;
        notifsButton.textContent = '...';
        onEnableNotifs?.((result) => {
          if (result?.granted) {
            notifsEnabled = true;
            localStorage.setItem(NOTIFS_KEY, 'true');
            notifsButton.textContent = 'Désactiver notifs';
            notifsButton.style.background = '#4ade80';
            notifsButton.disabled = false;
          } else {
            notifsButton.textContent = 'Permission refusée';
            notifsButton.style.background = '#f87171';
            notifsButton.disabled = false;
          }
        });
      }
    });

    const testButton = makeButton('Test notif', '#fbbf24');
    container.appendChild(testButton);
    testButton.addEventListener('click', (e) => {
      e.preventDefault();
      onTestNotif?.();
    });

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    // Restaure l'état sauvegardé si la permission est déjà accordée
    if (localStorage.getItem(NOTIFS_KEY) === 'true' && Notification.permission === 'granted') {
      notifsEnabled = true;
      notifsButton.textContent = 'Désactiver notifs';
      notifsButton.style.background = '#4ade80';
    }

    return container;
  };

  control.addTo(map);

  intervalId = setInterval(() => {
    if (!timeLabel) return;
    timeLabel.textContent = formatTime(new Date());

    if (timerRemaining > 0) {
      timerRemaining -= 1;
      if (timerLabel) timerLabel.textContent = formatCountdown(timerRemaining);
      if (timerRemaining === 0 && timerLabel) timerLabel.style.display = 'none';
    }
  }, intervalMs);

  function startTimer(seconds = 60) {
    timerRemaining = seconds;
    if (timerLabel) {
      timerLabel.textContent = formatCountdown(timerRemaining);
      timerLabel.style.display = 'block';
    }
  }

  function remove() {
    if (intervalId) clearInterval(intervalId);
    control.remove();
    intervalId = null;
    container = null;
    timeLabel = null;
    timerLabel = null;
    notifsButton = null;
  }

  return {
    remove,
    startTimer,
    onEnableNotifs: (handler) => { onEnableNotifs = handler; },
    onDisableNotifs: (handler) => { onDisableNotifs = handler; },
    onTestNotif: (handler) => { onTestNotif = handler; }
  };
}
