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
import { createTeamSelectOverlay } from '../overlays/team-select-overlay.js';
import { createLandingOverlay } from '../overlays/landing-overlay.js';
import { startGeolocation } from '../services/geolocation.js';
import { getAllPhotos } from '../services/photo-store.js';
import { createPhotoSync } from '../services/photo-sync.js';
import { requestChallengePhoto, acceptChallenge, contributePhoto, respondToChallenge, claimRoom } from '../services/challenge-api.js';
import { getCtfRooms, getTeams } from '../services/ctf-api.js';
import { EPFL_LOCATIONS } from '../../../game/epfl-locations.js';
import { createWeeklyChallengeOverlay } from '../overlays/weekly-challenge-overlay.js';
import { createMinigamesOverlay } from '../overlays/minigames-overlay.js';
import { createCtfLeaderboardOverlay } from '../overlays/ctf-leaderboard-overlay.js';
import { createRoomListOverlay } from '../overlays/room-list-overlay.js';
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

  // Colors matching teams table seed data
  const TEAM_COLORS = { rouge: '#e74c3c', bleu: '#3498db', vert: '#2ecc71' };

  // Previous CTF state for lost-room detection
  let prevCtfRooms = [];

  const teamSelectOverlay = createTeamSelectOverlay({
    onTeamSelected: (team) => {
      state.player.teamId = team.id;
    },
  });

  const landingOverlay = createLandingOverlay({
    onUserLoaded: (user) => {
      applyUser(user);
    },
    onLogout: () => {
      applyUser(null);
      if (gameMode === 'king') switchMode('guessr');
    },
    onGameChosen: (mode, user) => {
      if (user && !user.teamId && mode === 'king') {
        getTeams()
          .then(teams => teamSelectOverlay.show(teams, { onAfterSelect: () => switchMode('king') }))
          .catch(() => switchMode('king'));
      } else {
        switchMode(mode);
      }
    },
  });

  let ctfPollInterval = null;

  function startCtfPolling() {
    if (ctfPollInterval) return;
    ctfPollInterval = setInterval(async () => {
      if (gameMode !== 'king' || !roomPinsLayer.isVisible()) return;
      try {
        const rooms = await getCtfRooms();
        handleCtfRooms(rooms);
      } catch {
        // silent — polling failure should not disrupt gameplay
      }
    }, 10_000);
  }

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
  const roomPinsLayer = createRoomPinsLayer(mapView, {
    onPinClick: (locationId) => {
      const loc = EPFL_LOCATIONS.find(l => l.id === locationId);
      const screenPos = loc ? mapView.geoToScreen(loc.lat, loc.lng) : null;
      kingOverlay.openAtLocation(locationId, screenPos);
    },
  });

  // ── Apply authenticated user to all UI modules ────────────────────────────
  function applyUser(user) {
    state.player.id     = user?.id       ?? null;
    state.player.name   = user?.username ?? null;
    state.player.teamId = user?.teamId   ?? null;
    const teamColor = user?.teamId ? (TEAM_COLORS[user.teamId] ?? null) : null;
    authOverlay.setUser(user);
    authOverlay.setTeamColor(teamColor);
    bottomNav?.setUser(user?.username ?? null, teamColor);
    settingsOverlay?.setUser(user);
    const isDev = user?.username === 'admin';
    adminGalleryView.setVisible(isDev);
    bottomNav.setAdminVisible(isDev);
    bottomNav.setLoggedIn(Boolean(user));
    if (isDev) adminGalleryView.refresh();
    notificationsOverlay.setLoggedIn(Boolean(user));
    mayorTimerOverlay.setLoggedIn(Boolean(user));
  }

  // ── CTF room update (detection pertes + compteur + carte) ─────────────────
  function handleCtfRooms(rooms) {
    const teamId = state.player.teamId;
    if (teamId && prevCtfRooms.length > 0) {
      for (const prev of prevCtfRooms) {
        if (prev.controllingTeam === teamId) {
          const now = rooms.find(r => r.locationId === prev.locationId);
          if (now && now.controllingTeam !== teamId) {
            showToast(`Salle perdue : ${prev.locationLabel || prev.locationId} !`, { color: '#ef4444', duration: 6000 });
          }
        }
      }
    }
    prevCtfRooms = rooms;
    const controlled = teamId ? rooms.filter(r => r.controllingTeam === teamId).length : null;
    bottomNav?.setRoomCount(controlled, rooms.length);
    roomPinsLayer.show(rooms);
  }

  // ── Mode switcher ─────────────────────────────────────────────────────────
  async function switchMode(mode) {
    gameMode = mode;
    bottomNav.setMode(mode);
    settingsOverlay?.setGameMode(mode);

    if (mode === 'king') {
      challengeOverlay.closePanel?.();
      minigamesOverlay.closePanel();
      try {
        const rooms = await getCtfRooms();
        handleCtfRooms(rooms);
      } catch {
        handleCtfRooms([]);
      }
      startCtfPolling();
    } else {
      kingOverlay.closePanel();
      roomListOverlay.close();
      roomPinsLayer.hide();
    }
  }

  // ── Settings overlay ──────────────────────────────────────────────────────
  settingsOverlay = createSettingsOverlay({
    onAuthChange: (user) => {
      applyUser(user);
      if (!user && gameMode === 'king') switchMode('guessr');
    },
    onLogoutToLanding: () => {
      landingOverlay.show(null);
    },
    onOpenGallery: () => galleryView.open(),
    onEnableNotifs: (callback) => scheduler.enableNotifications(callback),
    onDisableNotifs: () => {},
    onTestNotif: () => scheduler.testFire(),
    onOpenNotifications: () => notificationsOverlay.toggle(),
    onSwitchMode: () => switchMode(gameMode === 'king' ? 'guessr' : 'king'),
  });

  timeOverlay.onSettingsClick(() => settingsOverlay.toggle());

  // ── Photo sync ────────────────────────────────────────────────────────────
  const photoSync = createPhotoSync({
    onRemotePhoto: (photo) => {
      photoMarkersLayer.addPhoto(photo);
      galleryView.addPhoto(photo);
    },
    onCtfUpdate: async () => {
      if (gameMode === 'king' && roomPinsLayer.isVisible()) {
        try {
          const rooms = await getCtfRooms();
          handleCtfRooms(rooms);
        } catch {
          // silent
        }
      }
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
          // Also submit the photo as a CTF contribution for this room
          contributePhoto(photo, { locationId: locId }).catch(() => {});
          showToast('Salle revendiquee ! Le chrono est lance.', { color: '#6366f1' });
          mayorTimerOverlay.refresh();
          if (roomPinsLayer.isVisible()) {
            const rooms = await getCtfRooms();
            handleCtfRooms(rooms);
          }
        } catch (err) {
          showToast(err.message || 'Revendication echouee.', { color: '#ef4444' });
          console.warn('[room-mayor] Claim echoue:', err.message);
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
  const ctfLeaderboardOverlay = createCtfLeaderboardOverlay();
  const roomListOverlay = createRoomListOverlay();

  const bottomNav = createBottomNav({
    onCamera:          () => cameraController.open(),
    onChallenge:       () => challengeOverlay.openPanel(),
    onAdmin:           () => adminGalleryView.togglePanel(),
    onOpenLeaderboard: () => ctfLeaderboardOverlay.toggle(),
    onOpenRoomList:    () => roomListOverlay.toggle(),
  });

  // ── Landing + session restore ─────────────────────────────────────────────
  landingOverlay.show('loading');
  restoreSession()
    .then((user) => {
      applyUser(user);
      landingOverlay.show(user); // null → login form, user → game choice
    })
    .catch((err) => {
      console.warn('Failed to restore session:', err);
      landingOverlay.show(null);
    });

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
    if (ctfPollInterval) clearInterval(ctfPollInterval);
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
    roomListOverlay.remove();
    teamSelectOverlay.remove();
    landingOverlay.remove();
    ctfLeaderboardOverlay.remove();
    mapView.map.remove();
  };
}
