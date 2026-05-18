// State global de l'application.
// Contient les données runtime — ne pas y stocker de logique.

export const state = {
  // Instance Leaflet (initialisée dans bootstrap)
  map: null,

  // Position GPS courante du joueur : { lat, lon, accuracy, timestamp }
  userLocation: null,

  // Flag interne : la carte a-t-elle déjà été centrée sur le joueur ?
  initialPositionSet: false,

  // Profil du joueur connecté (sera rempli après auth — Étape 3)
  player: {
    id: null,
    name: null,
    score: 0,
    rank: null,
    teamId: null
  },

  // Événement de jeu actif (null = pas d'event en cours)
  // Structure attendue : { id, title, location, expiresAt, type }
  currentEvent: null,

  // Collection de géométries interactives sur la carte (zones d'events, POI, etc.)
  geometries: []
};