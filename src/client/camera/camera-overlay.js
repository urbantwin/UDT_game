// Camera overlay UI: renders a video element and controls.
// The open button is removed — camera is triggered by the bottom nav icon.

export function createCameraOverlay({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; right:16px; bottom:72px; z-index:1001;
    display:flex; flex-direction:column; align-items:flex-end; gap:8px;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    display:none; background:rgba(0,0,0,0.85); color:#fff;
    padding:8px; border-radius:10px; width:240px;
    box-shadow:0 6px 16px rgba(0,0,0,0.35); pointer-events:auto;
  `;

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = 'width:100%; height:auto; border-radius:8px; display:block;';
  panel.appendChild(video);

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex; gap:6px; margin-top:6px;';

  const captureButton = document.createElement('button');
  captureButton.type = 'button';
  captureButton.textContent = '📸 Prendre';
  captureButton.style.cssText = `
    background:#f87171; color:#111827; border:none; border-radius:6px;
    padding:6px 8px; cursor:pointer; font:12px system-ui,sans-serif; flex:1;
  `;
  controls.appendChild(captureButton);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    background:#9ca3af; color:#111827; border:none; border-radius:6px;
    padding:6px 10px; cursor:pointer; font:12px system-ui,sans-serif;
  `;
  controls.appendChild(closeButton);
  panel.appendChild(controls);

  const status = document.createElement('div');
  status.style.cssText = 'margin-top:6px; font:12px system-ui,sans-serif; opacity:0.85;';
  panel.appendChild(status);

  root.appendChild(panel);
  container.appendChild(root);

  let onOpen = null;
  let onClose = null;
  let onCapture = null;

  closeButton.addEventListener('click', (e) => {
    e.preventDefault();
    panel.style.display = 'none';
    onClose?.();
  });

  captureButton.addEventListener('click', (e) => {
    e.preventDefault();
    onCapture?.();
  });

  function setStatus(text) {
    status.textContent = text ?? '';
  }

  function openPanel() {
    panel.style.display = 'block';
    onOpen?.();
  }

  function remove() {
    root.remove();
  }

  return {
    video,
    setStatus,
    onOpen:    (h) => { onOpen = h; },
    onClose:   (h) => { onClose = h; },
    onCapture: (h) => { onCapture = h; },
    hide:      () => { panel.style.display = 'none'; },
    openPanel,
    remove,
  };
}
