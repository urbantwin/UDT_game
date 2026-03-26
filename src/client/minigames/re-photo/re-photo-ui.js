/**
 * Mini-jeu : RE-PHOTO
 * L'utilisateur doit se rendre à l'endroit de la photo
 * et prendre une nouvelle photo depuis un angle différent.
 * Nécessite la géolocalisation active.
 *
 * Interface attendue :
 *  createRePhotoGame({ photo, userLocation$, cameraController, onSubmit })
 *    photo             → { id, blob, location }
 *    userLocation$     → getter function () => { lat, lon } (état GPS courant)
 *    cameraController  → instance du camera-controller
 *    onSubmit          → function(newPhoto) → validé côté serveur si assez proche
 */

export function createRePhotoGame({ photo, userLocation$, cameraController, onSubmit } = {}) {
  // TODO: afficher la photo originale en référence
  // TODO: afficher la distance entre l'utilisateur et le lieu cible
  // TODO: débloquer le bouton "Prendre la photo" quand l'utilisateur est assez proche
  // TODO: lancer cameraController.open() et capturer la nouvelle photo
  // TODO: appeler onSubmit(newPhoto) et afficher la comparaison côté-à-côté

  console.log('[RePhoto] mini-jeu à implémenter', { photo });

  return {
    remove() {}
  };
}
