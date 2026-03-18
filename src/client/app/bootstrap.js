// Initialisation de l'application — câblage Leaflet + géolocalisation + state.

import { mapConfig } from '../map/map-config.js';
import { createMapView } from '../map/map-view.js';
import { createUserLocationLayer } from '../overlays/user-location-layer.js';
import { createTimeOverlay } from '../overlays/time-overlay.js';
import { startGeolocation } from '../services/geolocation.js';
import { state } from './state.js';

export function bootstrapApp() {
  const mapView = createMapView({ containerId: 'map', config: mapConfig });

  // Expose l'instance Leaflet dans le state global
  state.map = mapView.map;

  const userLocationLayer = createUserLocationLayer(mapView.map);
  const timeOverlay = createTimeOverlay(mapView.map);

  const stopGeolocation = startGeolocation({
    onUpdate: (location) => {
      state.userLocation = location;
      userLocationLayer.setLocation(location);

      // Premier fix GPS : recentre la carte sur le joueur
      if (!state.initialPositionSet) {
        mapView.panTo(location.lat, location.lon);
        state.initialPositionSet = true;
      }
    },
    onError: (error) => console.warn('Geolocation error:', error)
  });

  return function teardown() {
    stopGeolocation();
    userLocationLayer.remove();
    timeOverlay.remove();
    mapView.map.remove();
  };
}
