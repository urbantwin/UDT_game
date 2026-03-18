// Overlay position joueur — cercle pulsant sur la carte Leaflet.

import L from 'leaflet';

export function createUserLocationLayer(map) {
  let marker = null;
  let accuracyCircle = null;

  function setLocation({ lat, lon, accuracy }) {
    const latlng = L.latLng(lat, lon);

    if (!marker) {
      // Cercle principal : position du joueur
      marker = L.circleMarker(latlng, {
        radius: 8,
        fillColor: '#e11d48',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(map);

      // Cercle de précision GPS (zone floue autour du joueur)
      accuracyCircle = L.circle(latlng, {
        radius: accuracy || 20,
        fillColor: '#e11d48',
        color: '#e11d48',
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.1
      }).addTo(map);
    } else {
      marker.setLatLng(latlng);
      accuracyCircle.setLatLng(latlng);
      if (accuracy) accuracyCircle.setRadius(accuracy);
    }
  }

  function remove() {
    marker?.remove();
    accuracyCircle?.remove();
    marker = null;
    accuracyCircle = null;
  }

  return { setLocation, remove };
}