import { EPFL_LOCATIONS } from '../../../game/epfl-locations.js';

export function createRoomPinsLayer(map, { onPinClick } = {}) {
  const markers = [];
  let visible = false;

  const pinIcon = (label, isClaimed) => L.divIcon({
    className: '',
    html: `
      <div style="
        background:${isClaimed ? 'rgba(99,102,241,0.92)' : 'rgba(30,30,30,0.88)'};
        color:#fff; padding:5px 9px; border-radius:20px;
        font:700 11px system-ui,sans-serif; white-space:nowrap;
        border:2px solid ${isClaimed ? '#818cf8' : 'rgba(255,255,255,0.25)'};
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        cursor:pointer; display:flex; align-items:center; gap:5px;
      ">
        ${isClaimed ? '👑' : '🏛️'} ${label}
      </div>`,
    iconAnchor: [0, 0],
  });

  function show(roomMayorsData = [], overrides = []) {
    hide();
    visible = true;
    EPFL_LOCATIONS.forEach(loc => {
      const ov = overrides.find(o => o.locationId === loc.id);
      const lat   = ov?.lat   ?? loc.lat;
      const lng   = ov?.lng   ?? loc.lng;
      const label = ov?.label ?? loc.label;
      const mayorData = roomMayorsData.find(r => r.locationId === loc.id);
      const isClaimed = Boolean(mayorData?.mayor);
      const marker = L.marker([lat, lng], {
        icon: pinIcon(label, isClaimed),
        zIndexOffset: 500,
      });

      marker.on('click', () => onPinClick?.(loc.id));
      marker.addTo(map);
      markers.push(marker);
    });
  }

  function hide() {
    markers.forEach(m => m.remove());
    markers.length = 0;
    visible = false;
  }

  function isVisible() { return visible; }

  function remove() { hide(); }

  return { show, hide, isVisible, remove };
}
