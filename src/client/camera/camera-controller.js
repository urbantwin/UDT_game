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
      overlay.setStatus('Camera unavailable.');
      overlay.hide();
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
    overlay.setStatus('Saving...');
    try {
      const photo = await capturePhoto(overlay.video);
      const location = state.userLocation
        ? {
            lat: state.userLocation.lat,
            lon: state.userLocation.lon,
            accuracy: state.userLocation.accuracy ?? null
          }
        : null;

      const saved = await savePhotoRecord({
        clientId: makeClientId(),
        createdAt: Date.now(),
        blob: photo.blob,
        width: photo.width,
        height: photo.height,
        type: photo.type,
        location,
        synced: false
      });
      onPhotoSaved?.(saved);
      overlay.setStatus('Saved to device');
    } catch (error) {
      console.warn('Capture error:', error);
      overlay.setStatus('Save failed');
    }
  });

  function open() {
    overlay.openPanel();
  }

  function remove() {
    if (stream) stopCamera(stream);
    overlay.remove();
  }

  return { remove, open };
}
