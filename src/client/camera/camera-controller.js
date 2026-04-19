// Camera controller: orchestrates camera service and UI integration.
// Multiplayer note:
// - Include authenticated user id when saving a photo.
// - Send the photo + metadata to a backend, then broadcast to other clients.
// - Consider optimistic UI updates while awaiting server confirmation.

import { startCamera, stopCamera, capturePhoto } from '../services/camera.js';
import { savePhotoRecord } from '../services/photo-store.js';
import { state } from '../app/state.js';
import { createCameraOverlay } from './camera-overlay.js';

function makeClientId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makePreviewBtn(text, bg) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.style.cssText = `
    background:${bg}; color:#111827; border:none; border-radius:8px;
    padding:10px 18px; cursor:pointer; font:600 13px system-ui,sans-serif;
    min-width:90px;
  `;
  return btn;
}

export function createCameraController({ container, onPhotoSaved } = {}) {
  const overlay = createCameraOverlay({ container });
  let stream = null;
  let opening = false;

  overlay.onOpen(async () => {
    if (opening || stream) return;
    opening = true;
    overlay.setStatus('Requesting camera...');
    try {
      stream = await startCamera({ videoEl: overlay.video, facingMode: 'environment' });
      overlay.setStatus('Ready');
    } catch (error) {
      console.warn('Camera error:', error);
      overlay.setStatus(error?.message || 'Camera unavailable.');
    } finally {
      opening = false;
    }
  });

  overlay.onClose(() => {
    if (stream) stopCamera(stream);
    stream = null;
    overlay.setStatus('');
  });

  overlay.onCapture(async () => {
    if (!stream) return;
    try {
      const photo = await capturePhoto(overlay.video);
      showPreview(photo);
    } catch (error) {
      console.warn('Capture error:', error);
      overlay.setStatus('Capture failed');
    }
  });

  function showPreview(photo) {
    // Build full-screen preview overlay
    const previewRoot = document.createElement('div');
    previewRoot.style.cssText = `
      position:fixed; inset:0; z-index:2000;
      background:rgba(0,0,0,0.92);
      display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:20px;
    `;

    const url = URL.createObjectURL(photo.blob);

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Preview';
    img.style.cssText = `
      max-width:90%; max-height:60vh;
      border-radius:12px; object-fit:contain;
      box-shadow:0 4px 20px rgba(0,0,0,0.5);
    `;
    previewRoot.appendChild(img);

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; gap:12px; flex-wrap:wrap; justify-content:center;';

    const submitBtn  = makePreviewBtn('✓ Submit',          '#60a5fa');
    const reprBtn    = makePreviewBtn('↩ Reprendre',       '#fbbf24');
    const cancelBtn  = makePreviewBtn('✕ Annuler',         '#fca5a5');

    const statusEl = document.createElement('div');
    statusEl.style.cssText = 'color:#fff; font:12px system-ui,sans-serif; opacity:0.8; min-height:16px;';

    btns.appendChild(submitBtn);
    btns.appendChild(reprBtn);
    btns.appendChild(cancelBtn);
    previewRoot.appendChild(btns);
    previewRoot.appendChild(statusEl);
    document.body.appendChild(previewRoot);

    // ── Submit ──────────────────────────────────────────────────────────────
    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true;
      reprBtn.disabled   = true;
      cancelBtn.disabled = true;
      statusEl.textContent = 'Enregistrement…';

      try {
        const location = state.userLocation
          ? {
              lat: state.userLocation.lat,
              lon: state.userLocation.lon,
              accuracy: state.userLocation.accuracy ?? null,
            }
          : null;

        const saved = await savePhotoRecord({
          clientId: makeClientId(),
          userId: state.player?.id ?? null,
          createdAt: Date.now(),
          blob: photo.blob,
          width: photo.width,
          height: photo.height,
          type: photo.type,
          location,
          synced: false,
        });

        URL.revokeObjectURL(url);
        previewRoot.remove();
        overlay.hide();
        if (stream) { stopCamera(stream); stream = null; }
        overlay.setStatus('');

        onPhotoSaved?.(saved);
      } catch (error) {
        console.warn('Save error:', error);
        statusEl.textContent = error?.message ?? 'Échec de l\'enregistrement';
        submitBtn.disabled  = false;
        reprBtn.disabled    = false;
        cancelBtn.disabled  = false;
      }
    });

    // ── Reprendre ───────────────────────────────────────────────────────────
    reprBtn.addEventListener('click', () => {
      URL.revokeObjectURL(url);
      previewRoot.remove();
      // Camera stream still active — user can retake
    });

    // ── Annuler ─────────────────────────────────────────────────────────────
    cancelBtn.addEventListener('click', () => {
      URL.revokeObjectURL(url);
      previewRoot.remove();
      if (stream) { stopCamera(stream); stream = null; }
      overlay.hide();
      overlay.setStatus('');
    });
  }

  function open() {
    overlay.openPanel();
  }

  function remove() {
    if (stream) stopCamera(stream);
    overlay.remove();
  }

  return { remove, open };
}
