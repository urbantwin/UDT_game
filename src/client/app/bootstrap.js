// Initialisation de l'application — câblage Leaflet + géolocalisation + state.

import { mapConfig } from '../map/map-config.js';
import { createMapView } from '../map/map-view.js';
import { createUserLocationLayer } from '../overlays/user-location-layer.js';
import { createTimeOverlay } from '../overlays/time-overlay.js';
import { createCameraController } from '../camera/camera-controller.js';
import { startGeolocation } from '../services/geolocation.js';
import { createNotificationScheduler } from '../services/notification-scheduler.js';
import { state } from './state.js';

export function bootstrapApp() {
  const mapView = createMapView({ containerId: 'map', config: mapConfig });

  // Expose l'instance Leaflet dans le state global
  state.map = mapView.map;

  const userLocationLayer = createUserLocationLayer(mapView.map);
  const timeOverlay = createTimeOverlay(mapView.map);
  const cameraController = createCameraController();

  // Le scheduler programme le déclenchement dès la création.
  // Le timer et la caméra se lancent automatiquement à l'heure — pas besoin de clic.
  // "Activer notifs" ne sert qu'à autoriser la popup de notification système.
  const scheduler = createNotificationScheduler({
    scheduledTimes: [{ hour: 15, minute: 20 }],
    onTrigger: () => {
      timeOverlay.startTimer(60);
      cameraController.open();
    }
  });

  timeOverlay.onEnableNotifs((callback) => {
    scheduler.enableNotifications(callback);
  });

  timeOverlay.onDisableNotifs(() => {
    // La permission navigateur ne peut pas être révoquée par JS,
    // mais on ne montrera plus la popup système lors du prochain déclenchement.
  });

  timeOverlay.onTestNotif(() => {
    scheduler.testFire();
  });

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
    scheduler.remove();
    userLocationLayer.remove();
    timeOverlay.remove();
    cameraController.remove();
    mapView.map.remove();
  };
}
