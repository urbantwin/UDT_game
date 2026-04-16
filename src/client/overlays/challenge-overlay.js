import { CHALLENGE_WINDOW } from '../../../game/game-config.js';

function isChallengeWindowOpen(now = new Date()) {
  const toMinutes = (t) => t.hour * 60 + t.minute;
  const start = CHALLENGE_WINDOW?.start ?? { hour: 12, minute: 0 };
  const end = CHALLENGE_WINDOW?.end ?? { hour: 23, minute: 59 };
  const current = now.getHours() * 60 + now.getMinutes();
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (startMin <= endMin) {
    return current >= startMin && current <= endMin;
  }
  return current >= startMin || current <= endMin;
}

function formatHm(value) {
  const hh = String(value?.hour ?? 0).padStart(2, '0');
  const mm = String(value?.minute ?? 0).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function createChallengeOverlay({ container = document.body, onRequest } = {}) {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.left = '16px';
  root.style.bottom = '16px';
  root.style.zIndex = '1250';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.gap = '8px';

  const panel = document.createElement('div');
  panel.style.background = 'rgba(0, 0, 0, 0.75)';
  panel.style.color = '#ffffff';
  panel.style.padding = '10px';
  panel.style.borderRadius = '10px';
  panel.style.width = '220px';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '8px';
  root.appendChild(panel);

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'get a challenge';
  button.style.background = '#fbbf24';
  button.style.color = '#111827';
  button.style.border = 'none';
  button.style.borderRadius = '6px';
  button.style.padding = '8px 10px';
  button.style.cursor = 'pointer';
  button.style.font = '12px system-ui, sans-serif';
  panel.appendChild(button);

  const stateLabel = document.createElement('div');
  stateLabel.style.font = '11px system-ui, sans-serif';
  stateLabel.style.opacity = '0.85';
  panel.appendChild(stateLabel);

  const result = document.createElement('div');
  result.style.display = 'none';
  result.style.position = 'fixed';
  result.style.left = '50%';
  result.style.top = '50%';
  result.style.transform = 'translate(-50%, -50%)';
  result.style.zIndex = '1300';
  result.style.background = 'rgba(0, 0, 0, 0.86)';
  result.style.padding = '10px';
  result.style.borderRadius = '12px';
  result.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.45)';
  result.style.display = 'none';
  result.style.flexDirection = 'column';
  result.style.gap = '8px';
  result.style.alignItems = 'center';

  const image = document.createElement('img');
  image.alt = 'Challenge photo';
  image.style.width = 'min(80vw, 380px)';
  image.style.height = 'auto';
  image.style.maxHeight = '70vh';
  image.style.objectFit = 'contain';
  image.style.borderRadius = '10px';
  result.appendChild(image);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.style.background = '#9ca3af';
  closeButton.style.color = '#111827';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '6px';
  closeButton.style.padding = '6px 8px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.font = '12px system-ui, sans-serif';
  result.appendChild(closeButton);

  container.appendChild(root);
  container.appendChild(result);

  function refreshWindowState() {
    const open = isChallengeWindowOpen();
    const windowText = `${formatHm(CHALLENGE_WINDOW?.start)}-${formatHm(CHALLENGE_WINDOW?.end)}`;
    button.disabled = !open;
    button.style.opacity = open ? '1' : '0.5';
    stateLabel.textContent = open
      ? `Available now (${windowText})`
      : `Available from ${windowText}`;
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    stateLabel.textContent = 'Loading challenge...';
    try {
      if (!onRequest) throw new Error('Challenge request is not configured.');
      const challenge = await onRequest();
      if (!challenge?.dataUrl) {
        throw new Error('No photo returned.');
      }
      image.src = challenge.dataUrl;
      result.style.display = 'flex';
      stateLabel.textContent = 'Challenge loaded.';
    } catch (error) {
      stateLabel.textContent = error?.message || 'Failed to load challenge.';
    } finally {
      refreshWindowState();
    }
  });

  closeButton.addEventListener('click', () => {
    result.style.display = 'none';
  });

  const timerId = setInterval(refreshWindowState, 1000);
  refreshWindowState();

  function remove() {
    clearInterval(timerId);
    root.remove();
    result.remove();
  }

  return { remove, refreshWindowState };
}
