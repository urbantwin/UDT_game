// Carte interactive Leaflet + tuiles WMTS internes EPFL.
// Le service WMTS est parsé depuis le XML statique embarqué dans map-config.js,
// via les utilitaires de ogcWmts.js.

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseCapabilitiesXml, pickDefaultLayer, leafletWmtsUrl } from './ogcWmts.js';
import { epflCapabilitiesXml } from './map-config.js';

// Parse les capabilities une seule fois au chargement du module.
// En cas d'XML invalide on lève explicitement pour faciliter le debug.
let _parsedCapabilities = null;
function getCapabilities() {
  if (!_parsedCapabilities) {
    _parsedCapabilities = parseCapabilitiesXml(epflCapabilitiesXml);
  }
  return _parsedCapabilities;
}

export function createMapView({ containerId, config }) {
  // ── 1. Résolution de la couche WMTS par défaut ─────────────────────────
  const { layers } = getCapabilities();
  const defaultLayer = pickDefaultLayer(layers);

  if (!defaultLayer) {
    throw new Error('[map-view] Aucune couche WMTS valide trouvée dans les capabilities EPFL.');
  }

  let currentFloor = config.defaultFloor ?? 99;

  // ── 2. Construction de l'URL de tuiles initiale ────────────────────────
  // leafletWmtsUrl() remplace {TileMatrixSet}, {TileMatrix}, {TileRow},
  // {TileCol}, {floor} et {DATE} dans le template de la couche.
  // Leaflet prend ensuite en charge {z}/{x}/{y} nativement.
  const buildTileUrl = (floor) => leafletWmtsUrl(defaultLayer, String(floor));

  // ── 3. Initialisation de la carte Leaflet (CRS WGS84 standard) ─────────
  const map = L.map(containerId, {
    center: [config.center.lat, config.center.lon],
    zoom: config.initialZoom,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    maxBounds: config.maxBounds,
    maxBoundsViscosity: config.maxBoundsViscosity,
    zoomControl: true,
    attributionControl: true,
    // WGS84 : projection par défaut de Leaflet, compatible avec le
    // TileMatrixSet EPSG:4326 déclaré dans les capabilities.
    crs: L.CRS.EPSG4326,
  });

  // ── 4. Ajout du layer de tuiles WMTS ──────────────────────────────────
  let wmtsLayer = L.tileLayer(buildTileUrl(currentFloor), {
    attribution: config.attribution,
    maxZoom: config.maxZoom,
    // Empêche le navigateur de mettre en cache des tuiles d'un autre étage
    // quand on change de floor (le paramètre fait partie de l'URL de toute façon,
    // mais c'est une sécurité explicite).
    crossOrigin: true,
  }).addTo(map);

  // ── 5. API publique ────────────────────────────────────────────────────

  // Convertit des coordonnées géo en pixels écran (utile pour les overlays Canvas)
  function geoToScreen(lat, lon) {
    const point = map.latLngToContainerPoint(L.latLng(lat, lon));
    return { x: point.x, y: point.y };
  }

  // Recentre la carte sur une position
  function panTo(lat, lon, zoom) {
    if (zoom !== undefined) {
      map.setView([lat, lon], zoom);
    } else {
      map.panTo([lat, lon]);
    }
  }

  // Change l'étage affiché (ex: setFloor(1), setFloor(-1), setFloor(99))
  // Supprime l'ancien layer et en crée un nouveau avec la bonne URL.
  function setFloor(floor) {
    const floorStr = String(floor);
    const available = defaultLayer.dimensions.floor?.values ?? [];

    if (available.length > 0 && !available.includes(floorStr)) {
      console.warn(`[map-view] Étage "${floorStr}" non disponible. Valeurs possibles :`, available);
      return;
    }

    currentFloor = floor;
    const newUrl = buildTileUrl(floor);

    map.removeLayer(wmtsLayer);
    wmtsLayer = L.tileLayer(newUrl, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      crossOrigin: true,
    }).addTo(map);
  }

  // Retourne l'étage actuellement affiché
  function getFloor() {
    return currentFloor;
  }

  // Retourne la liste des étages disponibles selon les capabilities
  function getAvailableFloors() {
    return defaultLayer.dimensions.floor?.values?.map(Number) ?? [];
  }

  return {
    map,               // instance Leaflet brute (pour ajouter des layers/markers)
    geoToScreen,
    panTo,
    setFloor,          // nouveau : change l'étage WMTS affiché
    getFloor,          // nouveau : étage courant
    getAvailableFloors, // nouveau : liste des étages valides
    isReady: () => true,
  };
}