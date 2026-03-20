// Leaflet layer that shows photo locations as small markers.
// Multiplayer note:
// - Replace local photo list with real-time events from a shared gallery service.
// - Ensure `photo.id` is globally unique (server-generated) to avoid collisions.

import L from 'leaflet';

function createPhotoIcon() {
  return L.divIcon({
    className: '',
    html: '<div style="width:10px;height:10px;background:#f59e0b;border-radius:50%;border:2px solid #111827;"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

export function createPhotoMarkersLayer(map) {
  const markers = new Map();
  const icon = createPhotoIcon();

  function openPhotoPopup(photo, marker) {
    if (!photo?.blob) return;
    const imageUrl = URL.createObjectURL(photo.blob);

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';
    container.style.background = 'rgba(17, 24, 39, 0.9)';
    container.style.padding = '8px';
    container.style.borderRadius = '8px';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Photo';
    img.style.width = '140px';
    img.style.height = '140px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '6px';
    container.appendChild(img);

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.style.background = '#9ca3af';
    close.style.color = '#111827';
    close.style.border = 'none';
    close.style.borderRadius = '6px';
    close.style.padding = '4px 6px';
    close.style.cursor = 'pointer';
    close.style.font = '12px system-ui, sans-serif';
    container.appendChild(close);

    const popup = L.popup({
      closeButton: false,
      autoClose: true,
      closeOnClick: true,
      offset: L.point(0, -8)
    })
      .setLatLng(marker.getLatLng())
      .setContent(container);

    close.addEventListener('click', (event) => {
      event.preventDefault();
      map.closePopup(popup);
    });

    popup.on('remove', () => {
      URL.revokeObjectURL(imageUrl);
    });

    popup.openOn(map);
  }

  function addPhoto(photo) {
    if (!photo?.location) return;
    const key = photo.id ?? `${photo.createdAt}-${photo.location.lat}-${photo.location.lon}`;
    if (markers.has(key)) return;
    const marker = L.marker([photo.location.lat, photo.location.lon], { icon }).addTo(map);
    marker.on('click', () => {
      openPhotoPopup(photo, marker);
    });
    markers.set(key, marker);
  }

  function setPhotos(photos) {
    for (const marker of markers.values()) marker.remove();
    markers.clear();
    for (const photo of photos) addPhoto(photo);
  }

  function remove() {
    for (const marker of markers.values()) marker.remove();
    markers.clear();
  }

  return { addPhoto, setPhotos, remove };
}
