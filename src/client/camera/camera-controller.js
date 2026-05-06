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
  let skipFloorMode = false;

  function hasKnownLocation() {
    const loc = state.userLocation;
    return Boolean(
      loc
      && Number.isFinite(loc.lat)
      && Number.isFinite(loc.lon)
    );
  }

  overlay.onOpen(async () => {
    if (opening || stream) return;
    if (!hasKnownLocation()) {
      overlay.setStatus('Activez la geolocalisation et attendez un fix GPS.');
      return;
    }
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
    if (!hasKnownLocation()) {
      overlay.setStatus('Position GPS inconnue. Impossible de prendre une photo.');
      return;
    }
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
      align-items:center; justify-content:center; gap:16px;
    `;

    const url = URL.createObjectURL(photo.blob);

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Preview';
    img.style.cssText = `
      max-width:90%; max-height:55vh;
      border-radius:12px; object-fit:contain;
      box-shadow:0 4px 20px rgba(0,0,0,0.5);
    `;
    previewRoot.appendChild(img);

    let selectedFloor = null;

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; gap:12px; flex-wrap:wrap; justify-content:center;';

    const submitBtn  = makePreviewBtn('✓ Submit',    '#60a5fa');
    const reprBtn    = makePreviewBtn('↩ Reprendre', '#fbbf24');
    const cancelBtn  = makePreviewBtn('✕ Annuler',   '#fca5a5');

    if (!skipFloorMode) {
      // ── Floor selector (obligatoire pour contributions) ──────────────────
      const floorLabels = ['SS', 'RDC', '+1', '+2', '+3', '+4'];
      const floorValues = [-1, 0, 1, 2, 3, 4];

      const floorWrap = document.createElement('div');
      floorWrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:6px;';

      const floorTitle = document.createElement('div');
      floorTitle.textContent = '⚠️ Sélectionne l\'étage (obligatoire)';
      floorTitle.style.cssText = 'color:#fbbf24; font:600 12px system-ui,sans-serif;';
      floorWrap.appendChild(floorTitle);

      const floorBtns = document.createElement('div');
      floorBtns.style.cssText = 'display:flex; gap:6px;';

      floorLabels.forEach((label, i) => {
        const fb = document.createElement('button');
        fb.type = 'button';
        fb.textContent = label;
        fb.style.cssText = `
          background:rgba(255,255,255,0.12); color:#fff; border:1px solid rgba(255,255,255,0.2);
          border-radius:6px; padding:6px 10px; cursor:pointer;
          font:600 12px system-ui,sans-serif; transition:background 0.1s;
        `;
        fb.addEventListener('click', () => {
          selectedFloor = floorValues[i];
          for (const b of floorBtns.querySelectorAll('button')) {
            b.style.background = 'rgba(255,255,255,0.12)';
            b.style.color = '#fff';
            b.style.border = '1px solid rgba(255,255,255,0.2)';
          }
          fb.style.background = '#60a5fa';
          fb.style.color = '#111827';
          fb.style.border = '1px solid #60a5fa';
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          floorTitle.textContent = `Étage sélectionné : ${label}`;
          floorTitle.style.color = '#86efac';
        });
        floorBtns.appendChild(fb);
      });
      floorWrap.appendChild(floorBtns);
      previewRoot.appendChild(floorWrap);

      // Submit verrouillé tant qu'aucun étage n'est choisi
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.4';
    }

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
          floor: selectedFloor,
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

  function open({ skipFloor = false } = {}) {
    skipFloorMode = skipFloor;
    if (!hasKnownLocation()) {
      overlay.setStatus('Activez la geolocalisation et attendez un fix GPS.');
      overlay.openPanel();
      return;
    }
    overlay.openPanel();
  }

  function remove() {
    if (stream) stopCamera(stream);
    overlay.remove();
  }

  return { remove, open };
}
