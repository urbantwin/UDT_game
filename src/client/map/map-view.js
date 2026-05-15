// Carte interactive Leaflet + tuiles OpenStreetMap.
// Remplace l'ancienne approche Canvas PNG statique.

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function createMapView({ containerId, config }) {
  const map = L.map(containerId, {
    center: [config.center.lat, config.center.lon],
    zoom: config.initialZoom,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    maxBounds: config.maxBounds,
    maxBoundsViscosity: config.maxBoundsViscosity,
    // Désactive les contrôles par défaut — on les remettra custom plus tard
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer(config.tileUrl, {
    attribution: config.attribution,
    maxZoom: config.maxZoom
  }).addTo(map);

  // Convertit des coordonnées géo en pixels écran (utile pour les overlays Canvas futurs)
  function geoToScreen(lat, lon) {
    const point = map.latLngToContainerPoint(L.latLng(lat, lon));
    return { x: point.x, y: point.y };
  }

  // Recentre la carte sur une position
  function panTo(lat, lon, zoom) {
    if (zoom !== undefined) {
      map.setView([lat, lon], zoom);
    } else {
      map.panTo([lat, lon]);
    }
  }

  return {
    map,          // instance Leaflet brute (pour ajouter des layers/markers directement)
    geoToScreen,
    panTo,
    isReady: () => true
  };
}