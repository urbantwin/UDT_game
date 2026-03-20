// Photo store: persists photo blobs and metadata in IndexedDB.
// Multiplayer note:
// - Swap IndexedDB-only storage for a server-backed store (REST/WebSocket).
// - On save, upload to backend and receive a global photo id + author id.
// - On load, subscribe to real-time updates (new/updated/deleted photos).

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

export async function savePhotoRecord(record) {
  const db = await openPhotoStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.add(record);
    request.onsuccess = () => resolve({ ...record, id: request.result });
    request.onerror = () => reject(request.error);
  });
}

export async function updatePhotoRecord(id, patch) {
  const db = await openPhotoStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (!existing) {
        resolve(null);
        return;
      }
      const updated = { ...existing, ...patch };
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve(updated);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getAllPhotos() {
  const db = await openPhotoStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const request = store.getAll();
    request.onsuccess = () => {
      const photos = request.result || [];
      photos.sort((a, b) => b.createdAt - a.createdAt);
      resolve(photos);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPhotoByClientId(clientId) {
  if (!clientId) return null;
  const photos = await getAllPhotos();
  return photos.find((photo) => photo.clientId === clientId) ?? null;
}

export async function getPhotoByRemoteId(remoteId) {
  if (!remoteId) return null;
  const photos = await getAllPhotos();
  return photos.find((photo) => photo.remoteId === remoteId) ?? null;
}
