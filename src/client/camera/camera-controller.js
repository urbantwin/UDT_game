// Camera controller: orchestrates camera service and UI integration.

import { startCamera, stopCamera, capturePhoto } from '../services/camera.js';
import { createCameraOverlay } from './camera-overlay.js';

function openPhotoStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('udt-game', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePhotoRecord(record) {
  const db = await openPhotoStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    store.add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function createCameraController({ container } = {}) {
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
      await savePhotoRecord({
        createdAt: Date.now(),
        blob: photo.blob,
        width: photo.width,
        height: photo.height,
        type: photo.type
      });
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
