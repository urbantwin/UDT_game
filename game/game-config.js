/**
 * ╔══════════════════════════════════════════════════════╗
 * ║              SCRIPT PRINCIPAL DU JEU                ║
 * ║  Modifie ce fichier pour changer le déroulement     ║
 * ║  des événements et les mini-jeux proposés.          ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Structure :
 *  - DAILY_SCHEDULE   → quand les notifications/missions se déclenchent
 *  - DAILY_LOCATIONS  → quel lieu est ciblé quel jour (ou 'random')
 *  - MINIGAMES        → quels mini-jeux sont actifs et leurs règles
 *  - SCORING          → combien de points par action
 */

import { EPFL_LOCATIONS } from './epfl-locations.js';

// ─────────────────────────────────────────────
// 1. HORAIRE JOURNALIER
//    Liste des heures auxquelles les joueurs
//    reçoivent une notif pour prendre une photo.
// ─────────────────────────────────────────────
export const DAILY_SCHEDULE = [
  { hour: 12, minute: 0,  label: 'Mission midi' },
  { hour: 16, minute: 29, label: 'Evening mission' }
  // { hour: 18, minute: 30, label: 'Mission fin de journée' },  // décommenter pour activer
];

// ─────────────────────────────────────────────
// 2. LIEUX PAR JOUR DE LA SEMAINE
//    0 = Dimanche … 6 = Samedi
//    Mettre 'random' pour piocher aléatoirement.
// ─────────────────────────────────────────────
export const LOCATION_BY_WEEKDAY = {
  0: 'random',
  1: 'rolex',          // Lundi   → Rolex Learning Center
  2: 'bc',             // Mardi   → Bibliothèque BC
  3: 'esplanade',      // Mercredi→ Esplanade
  4: 'ce',             // Jeudi   → Bâtiment CE
  5: 'sat',            // Vendredi→ SATtélite
  6: 'random',
};

/**
 * Retourne le lieu cible du jour.
 * @param {Date} date
 * @returns {import('./epfl-locations.js').EPFL_LOCATIONS[number]}
 */
export function getTodayLocation(date = new Date()) {
  const day = date.getDay();
  const id = LOCATION_BY_WEEKDAY[day];
  if (id === 'random') {
    const idx = date.getDate() % EPFL_LOCATIONS.length; // pseudo-random stable sur la journée
    return EPFL_LOCATIONS[idx];
  }
  return EPFL_LOCATIONS.find(l => l.id === id) ?? EPFL_LOCATIONS[0];
}

// ─────────────────────────────────────────────
// 3. MINI-JEUX DISPONIBLES
//    Pour chaque photo soumise par un joueur,
//    les autres peuvent choisir un mini-jeu.
//    active: false → le mini-jeu ne s'affiche pas.
// ─────────────────────────────────────────────
export const MINIGAMES = {

  /**
   * GEO-PIN : Placer un marqueur sur la carte EPFL
   * pour deviner où la photo a été prise.
   * Score basé sur la distance à la vraie position.
   */
  geoPin: {
    active: true,
    label: 'Où est-ce ?',
    description: 'Place une épingle sur la carte pour deviner le lieu de la photo.',
    scoring: {
      maxPoints: 1000,
      // Distance en mètres → points (interpolation linéaire)
      perfect: 10,    // < 10 m  → 1000 pts
      zero:    500,   // > 500 m → 0 pts
    }
  },

  /**
   * RE-PHOTO : Se rendre au même endroit et
   * prendre une photo depuis un autre angle.
   * Nécessite la géolocalisation active.
   */
  rePhoto: {
    active: true,
    label: 'Refais-la !',
    description: 'Va à cet endroit et prends une photo sous un angle différent.',
    maxDistanceMeters: 30, // doit être à moins de 30 m du lieu cible
  },

  /**
   * TIME-GUESS : Deviner à quelle heure la photo
   * a été prise (heure cachée au joueur).
   * Score basé sur l'écart en minutes.
   */
  timeGuess: {
    active: true,
    label: 'À quelle heure ?',
    description: 'Devine à quelle heure cette photo a été prise.',
    scoring: {
      maxPoints: 500,
      perfect: 5,    // < 5 min d'écart  → 500 pts
      zero:    120,  // > 2 h d'écart    → 0 pts
    }
  },

};

// ─────────────────────────────────────────────
// 4. ORDRE DE PRÉSENTATION DES MINI-JEUX
//    Modifie cet ordre pour changer ce qui
//    apparaît en premier dans l'interface.
// ─────────────────────────────────────────────
export const MINIGAME_ORDER = ['geoPin', 'rePhoto', 'timeGuess'];

// ─────────────────────────────────────────────
// 5. DURÉE DU TIMER DE PHOTO (secondes)
//    Temps laissé au joueur pour prendre la photo
//    une fois la notification reçue.
// ─────────────────────────────────────────────
export const PHOTO_TIMER_SECONDS = 60;

// ─────────────────────────────────────────────
// 6. PARAMÈTRES AVANCÉS
// ─────────────────────────────────────────────
export const GAME_SETTINGS = {
  // Rayon autour du lieu cible dans lequel la photo est considérée valide (en mètres)
  validPhotoRadiusMeters: 100,

  // Nombre maximum de photos par joueur par jour
  maxPhotosPerDay: 1,

  // Afficher le lieu cible aux joueurs avant la mission ?
  showTargetBeforeMission: false,
};

// ───────────────────────────────────────────────────────────────────────────────
// 7. FENÊTRE D'AUTORISATION DES SOUMISSIONS
//    Les joueurs peuvent soumettre leurs photos uniquement dans ce créneau.
// ───────────────────────────────────────────────────────────────────────────────
export const SUBMISSION_WINDOW = {
  start: { hour: 0, minute: 0 },   // 00:00
  end:   { hour: 11, minute: 59 }, // 11:59
};

// -----------------------------------------------------------------------------
// 8. CHALLENGE REQUEST WINDOW
//    Players can request challenge photos only during this time range.
// -----------------------------------------------------------------------------
export const CHALLENGE_WINDOW = {
  start: { hour: 9, minute: 0 },   // 12:00
  end:   { hour: 23, minute: 59 },  // 23:59
};

// ─────────────────────────────────────────────
// 9. ROOM MAYOR — protection window (seconds)
// -----------------------------------------------------------------------------
export const ROOM_MAYOR_PROTECTION_SECONDS = 600;
