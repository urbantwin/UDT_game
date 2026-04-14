// Initialisation de l'application â€” cÃ¢blage Leaflet + gÃ©olocalisation + state.
// Multiplayer note:
// - Wire a real-time gallery service here (WebSocket/SSE) to keep photos in sync.

import { mapConfig } from '../map/map-config.js';
import { createMapView } from '../map/map-view.js';
import { createUserLocationLayer } from '../overlays/user-location-layer.js';
import { createPhotoMarkersLayer } from '../overlays/photo-markers-layer.js';
import { createTimeOverlay } from '../overlays/time-overlay.js';
import { createAuthOverlay } from '../overlays/auth-overlay.js';
import { createCameraController } from '../camera/camera-controller.js';
import { createGalleryView } from '../gallery/gallery-view.js';
import { createAdminGalleryView } from '../gallery/admin-gallery-view.js';
import { startGeolocation } from '../services/geolocation.js';
import { getAllPhotos } from '../services/photo-store.js';
import { createPhotoSync } from '../services/photo-sync.js';
import { getTodayChallenge, submitPhotoToChallenge } from '../services/challenge-api.js';
import { restoreSession } from '../services/auth-api.js';
import { createNotificationScheduler } from '../services/notification-scheduler.js';
import { state } from './state.js';

export function bootstrapApp() {
  const mapView = createMapView({ containerId: 'map', config: mapConfig });

  // Expose l'instance Leaflet dans le state global
  state.map = mapView.map;

  const userLocationLayer = createUserLocationLayer(mapView.map);
  const photoMarkersLayer = createPhotoMarkersLayer(mapView.map);
  const timeOverlay = createTimeOverlay(mapView.map);
  const adminGalleryView = createAdminGalleryView();
  const authOverlay = createAuthOverlay({
    onAuthChange: (user) => {
      state.player.id = user?.id ?? null;
      state.player.name = user?.username ?? null;
      const isDev = user?.username === 'dev';
      adminGalleryView.setVisible(isDev);
      if (isDev) {
        adminGalleryView.refresh();
      }
    }
  });
  const galleryView = createGalleryView({
    onSubmit: async ({ photo }) => {
      if (!state.player.id) {
        throw new Error('Login required');
      }
      const challenge = await getTodayChallenge();
      let remoteId = photo.remoteId ?? null;
      if (!remoteId) {
        remoteId = await photoSync.uploadPhoto(photo);
      }
      if (!remoteId) {
        throw new Error('Photo sync failed');
      }
      await submitPhotoToChallenge({
        challengeId: challenge.id,
        photoId: remoteId
      });
    }
  });
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
      if (state.player.id) {
        photoSync.uploadPhoto(photo);
      }
    }
  });

  restoreSession()
    .then((user) => {
      state.player.id = user?.id ?? null;
      state.player.name = user?.username ?? null;
      authOverlay.setUser(user);
      const isDev = user?.username === 'dev';
      adminGalleryView.setVisible(isDev);
      if (isDev) {
        adminGalleryView.refresh();
      }
    })
    .catch((error) => {
      console.warn('Failed to restore session:', error);
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
    authOverlay.remove();
    adminGalleryView.remove();
    galleryView.remove();
    photoSync.close();
    cameraController.remove();
    mapView.map.remove();
  };
}
