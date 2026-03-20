// Photo sync: REST + WebSocket bridge for shared gallery updates.

import {
  getPhotoByClientId,
  getPhotoByRemoteId,
  savePhotoRecord,
  updatePhotoRecord
} from './photo-store.js';

function getApiBase() {
  if (import.meta.env.DEV) {
    return `http://${location.hostname}:3001`;
  }
  return '';
}

function getWsUrl() {
  if (import.meta.env.DEV) {
    return `ws://${location.hostname}:3001/ws`;
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export function createPhotoSync({ onRemotePhoto } = {}) {
  const apiBase = getApiBase();
  const wsUrl = getWsUrl();
  let socket = null;
  let reconnectTimer = null;

  async function ingestRemotePhoto(remote) {
    if (!remote) return null;
    const existing = (await getPhotoByRemoteId(remote.id))
      ?? (await getPhotoByClientId(remote.clientId));
    if (existing) return existing;

    const blob = await dataUrlToBlob(remote.dataUrl);
    const saved = await savePhotoRecord({
      remoteId: remote.id,
      clientId: remote.clientId ?? null,
      createdAt: remote.createdAt,
      blob,
      width: remote.width,
      height: remote.height,
      type: remote.type,
      location: remote.location ?? null,
      synced: true
    });
    onRemotePhoto?.(saved);
    return saved;
  }

  async function loadRemotePhotos() {
    const res = await fetch(`${apiBase}/api/photos`);
    if (!res.ok) throw new Error('Failed to fetch remote photos.');
    const photos = await res.json();
    for (const remote of photos) {
      await ingestRemotePhoto(remote);
    }
  }

  async function uploadPhoto(localPhoto) {
    if (!localPhoto?.blob) return;
    try {
      const dataUrl = await blobToDataUrl(localPhoto.blob);
      const payload = {
        clientId: localPhoto.clientId,
        createdAt: localPhoto.createdAt,
        width: localPhoto.width,
        height: localPhoto.height,
        type: localPhoto.type,
        location: localPhoto.location,
        dataUrl
      };

      const res = await fetch(`${apiBase}/api/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Photo upload failed.');
      const result = await res.json();
      if (localPhoto.id) {
        await updatePhotoRecord(localPhoto.id, {
          remoteId: result.id,
          synced: true
        });
      }
    } catch (error) {
      console.warn('Photo sync upload failed:', error);
    }
  }

  function connect() {
    socket = new WebSocket(wsUrl);
    socket.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'photo-added') {
          await ingestRemotePhoto(message.photo);
        }
      } catch (error) {
        console.warn('Photo sync message error:', error);
      }
    });
    socket.addEventListener('close', () => {
      if (reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 2000);
    });
  }

  connect();

  function close() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  }

  return { loadRemotePhotos, uploadPhoto, close };
}
