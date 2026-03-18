// Leaflet overlay that displays the current time (hh:mm:ss).
// Keeps time UI separate so it can be replaced with a richer HUD later.

import L from 'leaflet';

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

function formatCountdown(seconds) {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function createTimeOverlay(map, { position = 'topright', intervalMs = 1000 } = {}) {
  let container = null;
  let timeLabel = null;
  let timerLabel = null;
  let startButton = null;
  let intervalId = null;
  let timerRemaining = 0;

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

    timerLabel = L.DomUtil.create('div', '', container);
    timerLabel.textContent = 'Timer: 01:00';
    timerLabel.style.opacity = '0.8';

    startButton = L.DomUtil.create('button', '', container);
    startButton.type = 'button';
    startButton.textContent = 'Start 1:00';
    startButton.style.background = '#9ca3af';
    startButton.style.color = '#111827';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '6px';
    startButton.style.padding = '6px 8px';
    startButton.style.cursor = 'pointer';
    startButton.style.font = '12px system-ui, sans-serif';

    startButton.addEventListener('click', (event) => {
      event.preventDefault();
      timerRemaining = 60;
      timerLabel.textContent = `Timer: ${formatCountdown(timerRemaining)}`;
    });

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;
  };

  control.addTo(map);

  intervalId = setInterval(() => {
    if (!timeLabel || !timerLabel) return;
    timeLabel.textContent = formatTime(new Date());

    if (timerRemaining > 0) {
      timerRemaining -= 1;
      timerLabel.textContent = `Timer: ${formatCountdown(timerRemaining)}`;
    }
  }, intervalMs);

  function remove() {
    if (intervalId) clearInterval(intervalId);
    control.remove();
    intervalId = null;
    container = null;
    timeLabel = null;
    timerLabel = null;
    startButton = null;
  }

  return { remove };
}
