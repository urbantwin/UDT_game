# UDT Game — EPFLGuessr

This game project is part of the construction of an EPFL *Digital Twin* within the class **URB-410 Urban digital twins**.

**Group members**: Rayane Kadiri Hassani, Philip Ojas Ramabadran, Maxime Steiner

LLM used for prototyping, vibe coding and structuring the project: *GPT-5.2-Codex & Claude Sonnet 4.6*


**3 objectives guiding our work**:
1. A multiplayer game that will help collect valuable data for the development of the digital twin
2. A flexible implementation to collect targeted data as needed
3. A smooth and intuitive user experience that "gamifies" scanning of the campus
 
---

## General concept

```
Gameplay for users
1. Everyday before 12 noon, players can take pictures of the campus in the app and submit them to challenge their friends
       ↓
2. Everyday at 12 noon, players can see all the pictures that were made and need to find information about them to earn points
       ↓
3. Ways to get points are mainly: take the same picture (at the same location) and pin picture location on the map
       ↓
4. The amount of points gained by players is ajusted to encourage campus scanning where the twin most need it
(e.g. points x3 if the picture is taken in the Rolex Learning Center, or +100 points if no pictures was taken inside this building before, ...)
       ↓
5. In addition to the daily challenge, users can also play a weekly challenge with a similar gameplay
(allows to collect more focussed data, e.g. food, affluence, ...)
```

All the geolocated photos of the outside and inside of the campus that are captured are stored in an internal SQLite Database to feed the twin. Complementary projects lead by other students are then supposed to use these pictures to extract information or to model campus using photogrammetry.

---

## Current state of the project

| Feature | Status |
|----------------|------|
| Basic interactive EPFL map (Leaflet + OSM) | ✅ Done |
| Real-time geolocation of users and pictures | ✅ Done |
| Taking pictures (mobile + desktop) | ✅ Done |
| Daily notification | To be adapted |
| Multiplayer synchronization (WebSocket) | ✅ Done |
| Persisting SQLite Database | ✅ Done |
| Game configuration script | ✅ Done |
| Mini-jeu Geo-pin | 🔧 À implémenter (UI) |
| Mini-jeu Re-photo | 🔧 À implémenter (UI) |
| Mini-jeu Time-guess | 🔧 À implémenter (UI) |
| Validation qualité des photos | 🔧 À implémenter |
| Système de score global | 🔧 À implémenter |

## Launch project

### Prerequisite
- Node.js installed → v24.14.1 (LTS)

### Launching game in dev mode (web interface + API server)
```cmd
npm install
npm run dev:full
```

- Web Interface → `http://localhost:5173`
- API Server → `http://localhost:3001`

### Available Commands
| Command | Purpose |
|----------|------|
| `npm run dev:full` | Launching Node Server + Vite at the same time |
| `npm run dev` | Launching Vite only (interface) |
| `npm run server` | Launching Node Server only |
| `npm run build` | Compile for production |

---

## Architecture

```
UDT_game/
│
├── game/                          ← GAME SCRIPT (edit to change rules)
│   ├── game-config.js             ← Schedule, daily locations, active mini-games, scores
│   └── epfl-locations.js          ← Database of 7 recognizable EPFL locations
│
├── src/
│   ├── client/                    ← Browser code (Vite / vanilla JS)
│   │   ├── app/
│   │   │   ├── bootstrap.js       ← Entry point: wires all modules together
│   │   │   └── state.js           ← Shared global state (map, GPS)
│   │   │
│   │   ├── map/
│   │   │   ├── map-config.js      ← Centering, zoom, EPFL map boundaries
│   │   │   └── map-view.js        ← Creates the Leaflet map
│   │   │
│   │   ├── camera/
│   │   │   ├── camera-controller.js  ← Orchestrates open/capture/save
│   │   │   └── camera-overlay.js     ← Camera UI overlay
│   │   │
│   │   ├── gallery/
│   │   │   └── gallery-view.js    ← Panel listing captured photos
│   │   │
│   │   ├── overlays/
│   │   │   ├── time-overlay.js         ← Clock, timer, notification buttons
│   │   │   ├── user-location-layer.js  ← User GPS marker on the map
│   │   │   └── photo-markers-layer.js  ← Photo markers on the map
│   │   │
│   │   ├── minigames/             ← One folder per mini-game (UI to implement)
│   │   │   ├── geo-pin/
│   │   │   │   └── geo-pin-ui.js       ← [stub] Pin the location on the map
│   │   │   ├── re-photo/
│   │   │   │   └── re-photo-ui.js      ← [stub] Return to the location and retake photo
│   │   │   └── time-guess/
│   │   │       └── time-guess-ui.js    ← [stub] Guess the time the photo was taken
│   │   │
│   │   └── services/
│   │       ├── notification-scheduler.js  ← Schedules daily notifications
│   │       ├── photo-store.js             ← Local photo storage (IndexedDB)
│   │       ├── photo-sync.js              ← Sync photos with server (REST + WebSocket)
│   │       └── geolocation.js             ← Real-time GPS
│   │
│   └── server/                    ← Node.js server (Express + WebSocket + SQLite)
│       ├── index.js               ← REST API routes + WebSocket
│       └── db.js                  ← Local SQLite database
│
├── data/
│   └── photos.db                  ← SQLite database (auto-created, git-ignored)
│
├── index.html                     ← Main HTML page
├── vite.config.js                 ← Vite config (LAN access enabled)
└── package.json
```

---

## Base de données (SQLite)

Le fichier `data/photos.db` est créé automatiquement au premier démarrage.

| Table | Rôle |
|-------|------|
| `photos` | Toutes les photos prises (dataUrl, GPS, timestamp) |
| `challenges` | Défis journaliers (1 lieu cible par jour) |
| `submissions` | Photos soumises pour un défi |
| `guesses` | Réponses des joueurs aux mini-jeux + scores |

---

## API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/photos` | Toutes les photos |
| `POST` | `/api/photos` | Soumettre une photo |
| `GET` | `/api/challenge/today` | Défi du jour |
| `POST` | `/api/challenge/:id/submit` | Lier une photo à un défi |
| `POST` | `/api/guess` | Soumettre une réponse à un mini-jeu |
| `GET` | `/api/guess/:photoId` | Scores d'une photo |

---

## Configurer le jeu — `game/game-config.js`

C'est **le seul fichier à éditer** pour changer le comportement du jeu sans toucher au code.

### Changer l'heure de notification
```js
export const DAILY_SCHEDULE = [
  { hour: 12, minute: 0, label: 'Mission midi' },
  // { hour: 18, minute: 30, label: 'Mission soir' },  // décommenter pour activer
];
```

### Changer le lieu ciblé par jour de la semaine
```js
export const LOCATION_BY_WEEKDAY = {
  1: 'rolex',       // Lundi   → Rolex Learning Center
  2: 'bc',          // Mardi   → Bibliothèque BC
  3: 'esplanade',   // Mercredi→ Esplanade centrale
  // ...
};
```

### Activer / désactiver un mini-jeu
```js
export const MINIGAMES = {
  geoPin:    { active: true,  ... },
  rePhoto:   { active: false, ... },  // désactivé
  timeGuess: { active: true,  ... },
};
```

---

## Ajouter un lieu EPFL — `game/epfl-locations.js`

```js
{
  id: 'mon_lieu',
  label: 'Nom affiché',
  lat: 46.XXXXX,
  lng: 6.XXXXX,
  criteria: ['dezoomed', 'landmark', 'outdoor'],
  hint: 'Description pour guider le joueur'
}
```

**Critères disponibles :**
- `dezoomed` — au moins 3 m de recul visible
- `landmark` — un bâtiment identifiable dans le cadre
- `no_wall` — pas uniquement un mur plat
- `outdoor` — prise en extérieur

---

## État du projet

| Fonctionnalité | État |
|----------------|------|
| Carte EPFL interactive (Leaflet + OSM) | ✅ Fait |
| GPS en temps réel | ✅ Fait |
| Appareil photo (mobile + desktop) | ✅ Fait |
| Notification journalière + timer | ✅ Fait |
| Synchronisation multijoueur (WebSocket) | ✅ Fait |
| Base de données SQLite persistante | ✅ Fait |
| Lieux EPFL définis | ✅ Fait (7 lieux) |
| Script de configuration du jeu | ✅ Fait |
| Mini-jeu Geo-pin | 🔧 À implémenter (UI) |
| Mini-jeu Re-photo | 🔧 À implémenter (UI) |
| Mini-jeu Time-guess | 🔧 À implémenter (UI) |
| Validation qualité des photos | 🔧 À implémenter |
| Système de score global | 🔧 À implémenter |
