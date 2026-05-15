// Configuration de la carte — campus EPFL.
// Utilise les tuiles OpenStreetMap (gratuites, aucune clé API requise).

export const mapConfig = {
  // Centre du campus EPFL (Rolex Learning Center)
  center: { lat: 46.520444, lon: 6.567812 },


  // Zoom initial : 17 = vue campus complet, 19 = détail bâtiment
  initialZoom: 17,
  minZoom: 16,   // En dessous : trop dézoomé, sort du campus
  maxZoom: 19,   // Maximum supporté par OSM standard

  // Tuiles OpenStreetMap (licence ODbL)
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

  // Limite de panoramique : empêche de sortir de la zone EPFL/Ecublens
  maxBounds: [
    [46.514899, 6.559748], // Sud-Ouest
    [46.525309, 6.575161]  // Nord-Est
  ],
  maxBoundsViscosity: 0.9  // 1 = frontière rigide, 0 = libre
};