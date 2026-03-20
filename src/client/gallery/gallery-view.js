// Gallery view: small panel listing saved photos.
// Multiplayer note:
// - Update this view from a shared real-time photo feed (WebSocket/SSE).
// - Add filters for user/team and handle live insertions/removals.

export function createGalleryView({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = '64px';
  root.style.zIndex = '1000';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.alignItems = 'flex-end';
  root.style.gap = '8px';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.textContent = 'Gallery';
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
  panel.style.width = '260px';
  panel.style.maxHeight = '300px';
  panel.style.overflowY = 'auto';
  panel.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.35)';

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';
  panel.appendChild(list);

  root.appendChild(panel);
  container.appendChild(root);

  let objectUrls = [];
  let currentPhotos = [];

  function clearObjectUrls() {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls = [];
  }

  function setPhotos(photos) {
    currentPhotos = photos.slice();
    clearObjectUrls();
    list.innerHTML = '';

    if (!photos.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No photos yet.';
      empty.style.opacity = '0.8';
      empty.style.font = '12px system-ui, sans-serif';
      list.appendChild(empty);
      return;
    }

    for (const photo of photos) {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.gap = '8px';
      item.style.alignItems = 'center';

      const img = document.createElement('img');
      const url = URL.createObjectURL(photo.blob);
      objectUrls.push(url);
      img.src = url;
      img.alt = 'Captured photo';
      img.style.width = '48px';
      img.style.height = '48px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '6px';

      const meta = document.createElement('div');
      meta.style.display = 'flex';
      meta.style.flexDirection = 'column';
      meta.style.gap = '2px';

      const time = document.createElement('div');
      time.textContent = new Date(photo.createdAt).toLocaleString('en-GB', { hour12: false });
      time.style.font = '11px system-ui, sans-serif';

      const loc = document.createElement('div');
      if (photo.location) {
        const { lat, lon } = photo.location;
        loc.textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      } else {
        loc.textContent = 'No location';
      }
      loc.style.font = '11px system-ui, sans-serif';
      loc.style.opacity = '0.8';

      meta.appendChild(time);
      meta.appendChild(loc);
      item.appendChild(img);
      item.appendChild(meta);
      list.appendChild(item);
    }
  }

  function addPhoto(photo) {
    setPhotos([photo, ...currentPhotos]);
  }

  openButton.addEventListener('click', (event) => {
    event.preventDefault();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  function remove() {
    clearObjectUrls();
    root.remove();
  }

  return { setPhotos, addPhoto, remove };
}
