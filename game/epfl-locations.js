/**
 * Base des lieux EPFL reconnaissables.
 * Chaque lieu peut être utilisé comme cible de photo-mission.
 *
 * Critères de qualité d'une bonne photo (à valider côté UI plus tard) :
 *  - "dezoomed"  : au moins 3 m de recul visible
 *  - "landmark"  : un bâtiment ou structure identifiable dans le cadre
 *  - "no_wall"   : pas uniquement un mur plat
 *  - "outdoor"   : prise en extérieur (ou précisé sinon)
 */

export const EPFL_LOCATIONS = [
  {
    id: 'rolex',
    label: 'Rolex Learning Center',
    lat: 46.51875,
    lng: 6.56815,
    criteria: ['dezoomed', 'landmark', 'outdoor'],
    hint: 'Le bâtiment ondulé emblématique au centre du campus'
  },
  {
    id: 'bc',
    label: 'Bibliothèque BC',
    lat: 46.51983,
    lng: 6.56598,
    criteria: ['dezoomed', 'landmark', 'outdoor'],
    hint: 'La bibliothèque avec la grande façade vitrée'
  },
  {
    id: 'esplanade',
    label: 'Esplanade centrale',
    lat: 46.51923,
    lng: 6.56612,
    criteria: ['dezoomed', 'outdoor'],
    hint: 'La grande place au cœur du campus entre les bâtiments ME et BC'
  },
  {
    id: 'ce',
    label: 'Bâtiment CE (chimie)',
    lat: 46.52002,
    lng: 6.56432,
    criteria: ['dezoomed', 'landmark', 'outdoor'],
    hint: 'Le bâtiment de chimie avec sa tour caractéristique'
  },
  {
    id: 'sat',
    label: 'SATtélite (dôme)',
    lat: 46.51741,
    lng: 6.56637,
    criteria: ['dezoomed', 'landmark', 'outdoor'],
    hint: 'Le dôme blanc côté lac'
  },
  {
    id: 'innovation_park',
    label: 'Innovation Park (entrée)',
    lat: 46.52136,
    lng: 6.56267,
    criteria: ['dezoomed', 'landmark', 'outdoor'],
    hint: 'L\'entrée du parc d\'innovation côté autoroute'
  },
  {
    id: 'metro_epfl',
    label: 'Station métro EPFL',
    lat: 46.52090,
    lng: 6.56599,
    criteria: ['dezoomed', 'landmark'],
    hint: 'Le quai de la station de métro m1'
  }
];

/**
 * Retourne un lieu par son id.
 */
export function getLocationById(id) {
  return EPFL_LOCATIONS.find(l => l.id === id) ?? null;
}
