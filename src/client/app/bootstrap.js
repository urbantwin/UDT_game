import { mapConfig } from '../map/map-config.js';
import { createMapView } from '../map/map-view.js';
import { createUserLocationLayer } from '../overlays/user-location-layer.js';
import { createTimeOverlay } from '../overlays/time-overlay.js';
import { createAuthOverlay } from '../overlays/auth-overlay.js';
import { createSettingsOverlay } from '../overlays/settings-overlay.js';
import { createChallengeOverlay } from '../overlays/challenge-overlay.js';
import { createBottomNav } from '../overlays/bottom-nav.js';
import { createCameraController } from '../camera/camera-controller.js';
import { createGalleryView } from '../gallery/gallery-view.js';
import { createAdminGalleryView } from '../gallery/admin-gallery-view.js';
import { createRoomPinsLayer } from '../overlays/room-pins-layer.js';
import { startGeolocation } from '../services/geolocation.js';
import { getAllPhotos } from '../services/photo-store.js';
import { createPhotoSync } from '../services/photo-sync.js';
import { requestChallengePhoto, acceptChallenge, contributePhoto, respondToChallenge, claimRoom, getRoomMayors } from '../services/challenge-api.js';
import { createWeeklyChallengeOverlay } from '../overlays/weekly-challenge-overlay.js';
import { createMinigamesOverlay } from '../overlays/minigames-overlay.js';
import { restoreSession } from '../services/auth-api.js';
import { createNotificationScheduler } from '../services/notification-scheduler.js';
import { createNotificationsOverlay } from '../overlays/notifications-overlay.js';
import { getLocationOverrides } from '../services/locations-api.js';
import { createMayorTimerOverlay } from '../overlays/mayor-timer-overlay.js';
import { state } from './state.js';

function showToast(message, { color = '#ef4444', duration = 4000 } = {}) {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = `
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    background:${color}; color:#fff; padding:10px 18px; border-radius:8px;
    font:600 13px system-ui,sans-serif; z-index:9999;
    box-shadow:0 4px 16px rgba(0,0,0,0.4); max-width:80vw; text-align:center;
    animation:fadeInUp 0.2s ease;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function bootstrapApp() {
  const mapView = createMapView({ containerId: 'map', config: mapConfig });
  state.map = mapView.map;

  const userLocationLayer = createUserLocationLayer(mapView.map);
  const photoMarkersLayer = { addPhoto: () => {}, setPhotos: () => {}, remove: () => {} };

  let locationOverrides = [];
  getLocationOverrides()
    .then(ov => { locationOverrides = ov; })
    .catch(() => {});

  const mayorTimerOverlay = createMayorTimerOverlay();

  const adminGalleryView  = createAdminGalleryView({
    map: mapView.map,
    onOverridesSaved: (overrides) => { locationOverrides = overrides; },
  });
  let settingsOverlay = null;
  const notificationsOverlay = createNotificationsOverlay({
    onBadgeChange: (count) => settingsOverlay?.setNotifBadge(count),
  });

  const timeOverlay = createTimeOverlay();
  const authOverlay = createAuthOverlay();

  let pendingChallengePhotoId    = null;
  let pendingRoomClaimLocationId = null;
  let gameMode = 'guessr'; // 'guessr' | 'king'

  // ── Scheduler ────────────────────────────────────────────────────────────
  const scheduler = createNotificationScheduler({
    scheduledTimes: [{ hour: 15, minute: 20 }],
    onTrigger: () => { timeOverlay.startTimer(60); cameraController.open(); },
  });

  // ── Gallery ───────────────────────────────────────────────────────────────
  const galleryView = createGalleryView({
    onSubmit: async ({ photo }) => {
      if (!state.player.id) throw new Error('Connexion requise.');
      await contributePhoto(photo);
    },
  });

  // ── Overlays ──────────────────────────────────────────────────────────────
  const minigamesOverlay = createMinigamesOverlay();

  const kingOverlay = createWeeklyChallengeOverlay({
    onClaimRoom: async (locationId) => {
      pendingRoomClaimLocationId = locationId;
      cameraController.open({ skipFloor: true });
    },
  });

  const challengeOverlay = createChallengeOverlay({
    onRequest: async () => {
      if (!state.player.id) throw new Error('Connexion requise.');
      return await requestChallengePhoto();
    },
    onGoRespond: async (challengePhotoId) => {
      await acceptChallenge({ challengePhotoId });
      pendingChallengePhotoId = challengePhotoId;
      cameraController.open();
    },
  });

  // ── Room pins (King mode) ─────────────────────────────────────────────────
  const roomPinsLayer = createRoomPinsLayer(mapView.map, {
    onPinClick: (locationId) => {
      kingOverlay.openAtLocation(locationId);
    },
  });

  // ── Mode switcher ─────────────────────────────────────────────────────────
  async function switchMode(mode) {
    gameMode = mode;
    bottomNav.setMode(mode);
    settingsOverlay?.setGameMode(mode);

    if (mode === 'king') {
      challengeOverlay.closePanel?.();
      minigamesOverlay.closePanel();
      try {
        const mayors = await getRoomMayors();
        roomPinsLayer.show(mayors, locationOverrides);
      } catch {
        roomPinsLayer.show([], locationOverrides);
      }
    } else {
      kingOverlay.closePanel();
      roomPinsLayer.hide();
    }
  }

  // ── Settings overlay ──────────────────────────────────────────────────────
  settingsOverlay = createSettingsOverlay({
    onAuthChange: (user) => {
      state.player.id   = user?.id       ?? null;
      state.player.name = user?.username ?? null;
      authOverlay.setUser(user);
      const isDev = user?.username === 'dev';
      adminGalleryView.setVisible(isDev);
      bottomNav.setAdminVisible(isDev);
      bottomNav.setLoggedIn(Boolean(user));
      if (isDev) adminGalleryView.refresh();
      notificationsOverlay.setLoggedIn(Boolean(user));
      mayorTimerOverlay.setLoggedIn(Boolean(user));
      if (!user && gameMode === 'king') switchMode('guessr');
    },
    onOpenGallery: () => galleryView.open(),
    onEnableNotifs: (callback) => scheduler.enableNotifications(callback),
    onDisableNotifs: () => {},
    onTestNotif: () => scheduler.testFire(),
    onOpenNotifications: () => notificationsOverlay.toggle(),
  });

  timeOverlay.onSettingsClick(() => settingsOverlay.toggle());

  // ── Photo sync ────────────────────────────────────────────────────────────
  const photoSync = createPhotoSync({
    onRemotePhoto: (photo) => {
      photoMarkersLayer.addPhoto(photo);
      galleryView.addPhoto(photo);
    },
  });

  // ── Camera controller ─────────────────────────────────────────────────────
  const cameraController = createCameraController({
    onPhotoSaved: async (photo) => {
      photoMarkersLayer.addPhoto(photo);
      galleryView.addPhoto(photo);
      if (!state.player.id) return;

      if (pendingChallengePhotoId) {
        const cpid = pendingChallengePhotoId;
        pendingChallengePhotoId = null;
        try { await respondToChallenge({ photo, challengePhotoId: cpid }); }
        catch (err) { console.warn('[challenge] Réponse échouée:', err.message); }
      } else if (pendingRoomClaimLocationId) {
        const locId = pendingRoomClaimLocationId;
        pendingRoomClaimLocationId = null;
        try {
          await claimRoom({ locationId: locId, photo });
          showToast('👑 Salle revendiquée ! Le chrono est lancé.', { color: '#6366f1' });
          mayorTimerOverlay.refresh();
          if (roomPinsLayer.isVisible()) {
            const mayors = await getRoomMayors();
            roomPinsLayer.show(mayors, locationOverrides);
          }
        } catch (err) {
          showToast(err.message || 'Revendication échouée.', { color: '#ef4444' });
          console.warn('[room-mayor] Claim échoué:', err.message);
        }
      } else {
        try { await contributePhoto(photo); }
        catch (err) {
          console.warn('[challenge] Contribution échouée (GPS?):', err.message);
          photoSync.uploadPhoto(photo);
        }
      }
    },
  });

  // ── Bottom nav ────────────────────────────────────────────────────────────
  const bottomNav = createBottomNav({
    onCamera:        () => cameraController.open(),
    onChallenge:     () => challengeOverlay.openPanel(),
    onSwitchMode:    (newMode) => switchMode(newMode),
    onOpenRoomList:  () => kingOverlay.openPanel(),
    onAdmin:         () => adminGalleryView.togglePanel(),
  });

  // ── Restore session ───────────────────────────────────────────────────────
  restoreSession()
    .then((user) => {
      state.player.id   = user?.id       ?? null;
      state.player.name = user?.username ?? null;
      authOverlay.setUser(user);
      settingsOverlay.setUser(user);
      const isDev = user?.username === 'dev';
      adminGalleryView.setVisible(isDev);
      bottomNav.setAdminVisible(isDev);
      bottomNav.setLoggedIn(Boolean(user));
      if (isDev) adminGalleryView.refresh();
      notificationsOverlay.setLoggedIn(Boolean(user));
      mayorTimerOverlay.setLoggedIn(Boolean(user));
    })
    .catch((err) => console.warn('Failed to restore session:', err));

  // ── Photos locales ────────────────────────────────────────────────────────
  getAllPhotos()
    .then((photos) => {
      photoMarkersLayer.setPhotos(photos);
      galleryView.setPhotos(photos);
      return photoSync.loadRemotePhotos();
    })
    .catch((err) => console.warn('Failed to load photos:', err));

  // ── Géolocalisation ───────────────────────────────────────────────────────
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
    kingOverlay.remove();
    minigamesOverlay.remove();
    roomPinsLayer.remove();
    authOverlay.remove();
    settingsOverlay.remove();
    adminGalleryView.remove();
    galleryView.remove();
    photoSync.close();
    cameraController.remove();
    notificationsOverlay.remove();
    mayorTimerOverlay.remove();
    bottomNav.remove();
    mapView.map.remove();
  };
}
