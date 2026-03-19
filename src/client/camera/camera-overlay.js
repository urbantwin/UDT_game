// Camera overlay UI: renders a video element and controls.

export function createCameraOverlay({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = '16px';
  root.style.zIndex = '1001';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.alignItems = 'flex-end';
  root.style.gap = '8px';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.textContent = 'Camera';
  openButton.style.background = '#9ca3af';
  openButton.style.color = '#111827';
  openButton.style.border = 'none';
  openButton.style.borderRadius = '6px';
  openButton.style.padding = '6px 10px';
  openButton.style.cursor = 'pointer';
  openButton.style.font = '12px system-ui, sans-serif';
  root.appendChild(openButton);

  const panel = document.createElement('div');
  panel.style.display = 'none';
  panel.style.background = 'rgba(0, 0, 0, 0.75)';
  panel.style.color = '#ffffff';
  panel.style.padding = '8px';
  panel.style.borderRadius = '10px';
  panel.style.width = '240px';
  panel.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.35)';
  panel.style.pointerEvents = 'auto';

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.style.width = '100%';
  video.style.height = 'auto';
  video.style.borderRadius = '8px';
  panel.appendChild(video);

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '6px';
  controls.style.marginTop = '6px';
  panel.appendChild(controls);

  const captureButton = document.createElement('button');
  captureButton.type = 'button';
  captureButton.textContent = 'Take photo';
  captureButton.style.background = '#f87171';
  captureButton.style.color = '#111827';
  captureButton.style.border = 'none';
  captureButton.style.borderRadius = '6px';
  captureButton.style.padding = '6px 8px';
  captureButton.style.cursor = 'pointer';
  captureButton.style.font = '12px system-ui, sans-serif';
  controls.appendChild(captureButton);

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
  controls.appendChild(closeButton);

  const status = document.createElement('div');
  status.style.marginTop = '6px';
  status.style.font = '12px system-ui, sans-serif';
  status.style.opacity = '0.85';
  panel.appendChild(status);

  root.appendChild(panel);
  container.appendChild(root);

  let onOpen = null;
  let onClose = null;
  let onCapture = null;

  openButton.addEventListener('click', (event) => {
    event.preventDefault();
    panel.style.display = 'block';
    onOpen?.();
  });

  closeButton.addEventListener('click', (event) => {
    event.preventDefault();
    panel.style.display = 'none';
    onClose?.();
  });

  captureButton.addEventListener('click', (event) => {
    event.preventDefault();
    onCapture?.();
  });

  function setStatus(text) {
    status.textContent = text ?? '';
  }

  function remove() {
    root.remove();
  }

  return {
    video,
    setStatus,
    onOpen: (handler) => {
      onOpen = handler;
    },
    onClose: (handler) => {
      onClose = handler;
    },
    onCapture: (handler) => {
      onCapture = handler;
    },
    hide: () => {
      panel.style.display = 'none';
    },
    remove
  };
}
