/**
 * Mini-jeu : GEO-PIN
 * L'utilisateur place une épingle sur la carte EPFL
 * pour deviner où la photo a été prise.
 *
 * Interface attendue :
 *  createGeoPinGame({ map, photo, onSubmit })
 *    map       → instance Leaflet
 *    photo     → { id, blob, location (caché au joueur) }
 *    onSubmit  → function({ lat, lng }) → score retourné par le serveur
 */

export function createGeoPinGame({ map, photo, onSubmit } = {}) {
  // TODO: afficher la photo en overlay
  // TODO: permettre au joueur de cliquer sur la carte pour poser une épingle
  // TODO: bouton "Valider" qui appelle onSubmit({ lat, lng })
  // TODO: afficher le score et la vraie position après soumission

  console.log('[GeoPin] mini-jeu à implémenter', { photo });

  return {
    remove() {}
  };
}
