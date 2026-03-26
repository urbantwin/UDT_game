/**
 * Mini-jeu : TIME-GUESS
 * L'utilisateur doit deviner à quelle heure la photo a été prise.
 * L'heure réelle est cachée dans les métadonnées (non affichée).
 *
 * Interface attendue :
 *  createTimeGuessGame({ photo, onSubmit })
 *    photo     → { id, blob }  (createdAt caché)
 *    onSubmit  → function({ hour, minute }) → score retourné par le serveur
 */

export function createTimeGuessGame({ photo, onSubmit } = {}) {
  // TODO: afficher la photo
  // TODO: afficher un sélecteur heure/minute (style roue ou slider)
  // TODO: bouton "Valider" qui appelle onSubmit({ hour, minute })
  // TODO: révéler l'heure réelle et afficher le score + l'écart

  console.log('[TimeGuess] mini-jeu à implémenter', { photo });

  return {
    remove() {}
  };
}
