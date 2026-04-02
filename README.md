# UDT Game — EPFLGuessr

This game project is part of the construction of an EPFL *Digital Twin* within the class **URB-410 Urban digital twins**.

Group members: Rayane Kadiri Hassani, Philip Ojas Ramabadran, Maxime Steiner

LLM used for prototyping, vibe coding and structuring the project: GPT-5.2-Codex & Claude Sonnet 4.6

3 objectives guiding our work:
1. A multiplayer game that will help collect valuable data for the development of the digital twin
2. A flexible implementation to collect targeted data as needed
3. A smooth and intuitive user experience that "gamifies" scanning of the campus

## General idea

```
1. Notification journalière
       ↓
2. Timer 60s + appareil photo s'ouvrent automatiquement
       ↓
3. Le joueur prend une photo du lieu ciblé
       ↓
4. La photo est synchronisée sur le serveur (visible par tous)
       ↓
5. Les autres joueurs jouent avec la photo (3 mini-jeux)
```

### Mini-jeux disponibles

| Mini-jeu | Description | Score max |
|----------|-------------|-----------|
| **Où est-ce ?** (Geo-pin) | Placer une épingle sur la carte EPFL pour deviner où la photo a été prise | 1000 pts |
| **Refais-la !** (Re-photo) | Se rendre au même endroit et prendre une photo sous un angle différent | 300 pts |
| **À quelle heure ?** (Time-guess) | Deviner à quelle heure la photo a été prise | 500 pts |

---

## Lancer le projet

### Prérequis
- Node.js installé
- Lancer depuis **cmd** (pas PowerShell)

### Démarrage complet (serveur + interface)
```cmd
npm install
npm run dev:full
```

- Interface web → `http://localhost:5173`
- Serveur API  → `http://localhost:3001`

### Commandes disponibles
| Commande | Rôle |
|----------|------|
| `npm run dev:full` | Lance le serveur Node + Vite en même temps |
| `npm run dev` | Lance uniquement Vite (interface) |
| `npm run server` | Lance uniquement le serveur Node |
| `npm run build` | Compile pour la production |

---

## Architecture

```
UDT_game/
│
├── game/                          ← SCRIPT DU JEU (à éditer pour changer les règles)
│   ├── game-config.js             ← Horaires, lieux par jour, mini-jeux actifs, scores
│   └── epfl-locations.js          ← Base des 7 lieux EPFL reconnaissables
│
├── src/
│   ├── client/                    ← Code navigateur (Vite / JS vanilla)
│   │   ├── app/
│   │   │   ├── bootstrap.js       ← Point d'entrée : câble tous les modules ensemble
│   │   │   └── state.js           ← État global partagé (carte, GPS)
│   │   │
│   │   ├── map/
│   │   │   ├── map-config.js      ← Centrage, zoom, limites de la carte EPFL
│   │   │   └── map-view.js        ← Création de la carte Leaflet
│   │   │
│   │   ├── camera/
│   │   │   ├── camera-controller.js  ← Orchestre l'ouverture/capture/sauvegarde
│   │   │   └── camera-overlay.js     ← Interface visuelle de l'appareil photo
│   │   │
│   │   ├── gallery/
│   │   │   └── gallery-view.js    ← Panneau qui liste les photos prises
│   │   │
│   │   ├── overlays/
│   │   │   ├── time-overlay.js         ← Horloge, timer, boutons notifs
│   │   │   ├── user-location-layer.js  ← Marqueur GPS de l'utilisateur sur la carte
│   │   │   └── photo-markers-layer.js  ← Marqueurs des photos sur la carte
│   │   │
│   │   ├── minigames/             ← Un dossier par mini-jeu (UI à implémenter)
│   │   │   ├── geo-pin/
│   │   │   │   └── geo-pin-ui.js       ← [stub] Épingler la position sur la carte
│   │   │   ├── re-photo/
│   │   │   │   └── re-photo-ui.js      ← [stub] Retourner au lieu et rephotographier
│   │   │   └── time-guess/
│   │   │       └── time-guess-ui.js    ← [stub] Deviner l'heure de la photo
│   │   │
│   │   └── services/
│   │       ├── notification-scheduler.js  ← Planifie les notifications journalières
│   │       ├── photo-store.js             ← Stockage local des photos (IndexedDB)
│   │       ├── photo-sync.js              ← Sync photos avec le serveur (REST + WebSocket)
│   │       └── geolocation.js             ← GPS en temps réel
│   │
│   └── server/                    ← Serveur Node.js (Express + WebSocket + SQLite)
│       ├── index.js               ← Routes API REST + WebSocket
│       └── db.js                  ← Base de données SQLite locale
│
├── data/
│   └── photos.db                  ← Base SQLite (créée auto, ignorée par git)
│
├── index.html                     ← Page HTML principale
├── vite.config.js                 ← Config Vite (accès LAN activé)
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
