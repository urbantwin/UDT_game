// Initialisation de l'application — câblage Leaflet + géolocalisation + state.

import { mapConfig } from '../map/map-config.js';
import { createMapView } from '../map/map-view.js';
import { createUserLocationLayer } from '../overlays/user-location-layer.js';
import { createPhotoMarkersLayer } from '../overlays/photo-markers-layer.js';
import { createTimeOverlay } from '../overlays/time-overlay.js';
import { createAuthOverlay } from '../overlays/auth-overlay.js';
import { createSettingsOverlay } from '../overlays/settings-overlay.js';
import { createChallengeOverlay } from '../overlays/challenge-overlay.js';
import { createCameraController } from '../camera/camera-controller.js';
import { createGalleryView } from '../gallery/gallery-view.js';
import { createAdminGalleryView } from '../gallery/admin-gallery-view.js';
import { startGeolocation } from '../services/geolocation.js';
import { getAllPhotos } from '../services/photo-store.js';
import { createPhotoSync } from '../services/photo-sync.js';
import { requestChallengePhoto, contributePhoto, respondToChallenge } from '../services/challenge-api.js';
import { restoreSession } from '../services/auth-api.js';
import { createNotificationScheduler } from '../services/notification-scheduler.js';
import { createNotificationsOverlay } from '../overlays/notifications-overlay.js';
import { state } from './state.js';

export function bootstrapApp() {
  const mapView = createMapView({ containerId: 'map', config: mapConfig });
  state.map = mapView.map;

  const userLocationLayer    = createUserLocationLayer(mapView.map);
  const photoMarkersLayer    = createPhotoMarkersLayer(mapView.map);
  const adminGalleryView     = createAdminGalleryView();
  const notificationsOverlay = createNotificationsOverlay();

  // ── Time overlay (top-left) ──────────────────────────────────────────────
  const timeOverlay = createTimeOverlay();

  // ── Auth compact display (top-right) ────────────────────────────────────
  const authOverlay = createAuthOverlay();

  // ── ID de la photo challenge en cours (mode réponse) ────────────────────
  // null  → prochaine photo prise = contribution (Bucket 1)
  // <id>  → prochaine photo prise = réponse au challenge (Bucket 3)
  let pendingChallengePhotoId = null;

  // ── Notification scheduler ───────────────────────────────────────────────
  const scheduler = createNotificationScheduler({
    scheduledTimes: [{ hour: 15, minute: 20 }],
    onTrigger: () => {
      timeOverlay.startTimer(60);
      cameraController.open();
    },
  });

  // ── Settings overlay (dropdown under ⚙️) ────────────────────────────────
  const settingsOverlay = createSettingsOverlay({
    onAuthChange: (user) => {
      state.player.id   = user?.id       ?? null;
      state.player.name = user?.username ?? null;
      authOverlay.setUser(user);
      const isDev = user?.username === 'dev';
      adminGalleryView.setVisible(isDev);
      if (isDev) adminGalleryView.refresh();
      notificationsOverlay.setLoggedIn(Boolean(user));
    },
    onOpenGallery: () => galleryView.open(),
    onEnableNotifs: (callback) => scheduler.enableNotifications(callback),
    onDisableNotifs: () => {},
    onTestNotif: () => scheduler.testFire(),
  });

  timeOverlay.onSettingsClick(() => settingsOverlay.toggle());

  // ── Challenge overlay ────────────────────────────────────────────────────
  const challengeOverlay = createChallengeOverlay({
    onRequest: async () => {
      if (!state.player.id) throw new Error('Connexion requise.');
      return await requestChallengePhoto();
    },
    onGoRespond: (challengePhotoId) => {
      pendingChallengePhotoId = challengePhotoId;
      cameraController.open();
    },
  });

  // ── Gallery (photos locales) ─────────────────────────────────────────────
  const galleryView = createGalleryView({
    onSubmit: async ({ photo }) => {
      if (!state.player.id) throw new Error('Connexion requise.');
      await contributePhoto(photo);
    },
  });

  // ── Photo sync (WebSocket + REST) ────────────────────────────────────────
  const photoSync = createPhotoSync({
    onRemotePhoto: (photo) => {
      photoMarkersLayer.addPhoto(photo);
      galleryView.addPhoto(photo);
    },
  });

  // ── Camera controller ────────────────────────────────────────────────────
  const cameraController = createCameraController({
    onPhotoSaved: async (photo) => {
      // Affichage local immédiat
      photoMarkersLayer.addPhoto(photo);
      galleryView.addPhoto(photo);

      if (!state.player.id) return;

      if (pendingChallengePhotoId) {
        // ── Mode réponse → Bucket 3 ──────────────────────────────────────
        const cpid = pendingChallengePhotoId;
        pendingChallengePhotoId = null;
        try {
          await respondToChallenge({ photo, challengePhotoId: cpid });
        } catch (err) {
          console.warn('[challenge] Réponse échouée:', err.message);
        }
      } else {
        // ── Mode contribution → Bucket 1 ─────────────────────────────────
        try {
          await contributePhoto(photo);
        } catch (err) {
          // Fallback si pas de GPS : tenter le sync générique
          console.warn('[challenge] Contribution échouée (GPS?):', err.message);
          photoSync.uploadPhoto(photo);
        }
      }
    },
  });

  // ── Restore session ──────────────────────────────────────────────────────
  restoreSession()
    .then((user) => {
      state.player.id   = user?.id       ?? null;
      state.player.name = user?.username ?? null;
      authOverlay.setUser(user);
      settingsOverlay.setUser(user);
      const isDev = user?.username === 'dev';
      adminGalleryView.setVisible(isDev);
      if (isDev) adminGalleryView.refresh();
      notificationsOverlay.setLoggedIn(Boolean(user));
    })
    .catch((err) => console.warn('Failed to restore session:', err));

  // ── Charger les photos locales et distantes ───────────────────────────────
  getAllPhotos()
    .then((photos) => {
      photoMarkersLayer.setPhotos(photos);
      galleryView.setPhotos(photos);
      return photoSync.loadRemotePhotos();
    })
    .catch((err) => console.warn('Failed to load photos:', err));

  // ── Géolocalisation ──────────────────────────────────────────────────────
  const stopGeolocation = startGeolocation({
    onUpdate: (location) => {
      state.userLocation = location;
      userLocationLayer.setLocation(location);
      if (!state.initialPositionSet) {
        mapView.panTo(location.lat, location.lon);
        state.initialPositionSet = true;
      }
    },
    onError: (err) => console.warn('Geolocation error:', err),
  });

  return function teardown() {
    stopGeolocation();
    scheduler.remove();
    userLocationLayer.remove();
    photoMarkersLayer.remove();
    timeOverlay.remove();
    challengeOverlay.remove();
    authOverlay.remove();
    settingsOverlay.remove();
    adminGalleryView.remove();
    galleryView.remove();
    photoSync.close();
    cameraController.remove();
    notificationsOverlay.remove();
    mapView.map.remove();
  };
}
