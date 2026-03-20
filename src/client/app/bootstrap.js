// Initialisation de l'application â€” cÃ¢blage Leaflet + gÃ©olocalisation + state.
// Multiplayer note:
// - Wire a real-time gallery service here (WebSocket/SSE) to keep photos in sync.

import { mapConfig } from '../map/map-config.js';
import { createMapView } from '../map/map-view.js';
import { createUserLocationLayer } from '../overlays/user-location-layer.js';
import { createPhotoMarkersLayer } from '../overlays/photo-markers-layer.js';
import { createTimeOverlay } from '../overlays/time-overlay.js';
import { createCameraController } from '../camera/camera-controller.js';
import { createGalleryView } from '../gallery/gallery-view.js';
import { startGeolocation } from '../services/geolocation.js';
import { getAllPhotos } from '../services/photo-store.js';
import { createPhotoSync } from '../services/photo-sync.js';
import { createNotificationScheduler } from '../services/notification-scheduler.js';
import { state } from './state.js';

export function bootstrapApp() {
  const mapView = createMapView({ containerId: 'map', config: mapConfig });

  // Expose l'instance Leaflet dans le state global
  state.map = mapView.map;

  const userLocationLayer = createUserLocationLayer(mapView.map);
  const photoMarkersLayer = createPhotoMarkersLayer(mapView.map);
  const timeOverlay = createTimeOverlay(mapView.map);
  const galleryView = createGalleryView();
  const photoSync = createPhotoSync({
    onRemotePhoto: (photo) => {
      photoMarkersLayer.addPhoto(photo);
      galleryView.addPhoto(photo);
    }
  });
  const cameraController = createCameraController({
    onPhotoSaved: (photo) => {
      photoMarkersLayer.addPhoto(photo);
      galleryView.addPhoto(photo);
      photoSync.uploadPhoto(photo);
    }
  });

  getAllPhotos()
    .then((photos) => {
      photoMarkersLayer.setPhotos(photos);
      galleryView.setPhotos(photos);
      return photoSync.loadRemotePhotos();
    })
    .catch((error) => {
      console.warn('Failed to load photos:', error);
    });

  // Le scheduler programme le dÃ©clenchement dÃ¨s la crÃ©ation.
  // Le timer et la camÃ©ra se lancent automatiquement Ã  l'heure â€” pas besoin de clic.
  // "Activer notifs" ne sert qu'Ã  autoriser la popup de notification systÃ¨me.
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
    // La permission navigateur ne peut pas Ãªtre rÃ©voquÃ©e par JS,
    // mais on ne montrera plus la popup systÃ¨me lors du prochain dÃ©clenchement.
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
    photoMarkersLayer.remove();
    timeOverlay.remove();
    galleryView.remove();
    photoSync.close();
    cameraController.remove();
    mapView.map.remove();
  };
}
