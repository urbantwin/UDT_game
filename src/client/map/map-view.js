import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadShapefile } from './map-shp-loader.js';

export function createMapView({ containerId, config }) {
  const map = L.map(containerId, {
    center: [config.center.lat, config.center.lon],
    zoom: config.initialZoom,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    maxBounds: config.maxBounds,
    maxBoundsViscosity: config.maxBoundsViscosity,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer(config.tileUrl, {
    attribution: config.attribution,
    maxZoom: config.maxZoom
  }).addTo(map);

  async function addOverlayLayers() {
  try {
    const [layer1Data, layer2Data] = await Promise.all([
      loadShapefile('/data/buildings.zip'),
      loadShapefile('/data/rooms_subset.zip')
    ]);

    const layer1 = L.geoJSON(layer1Data, {
      style: { color: '#8f8f8f', weight: 2, fillOpacity: 0.8 }
    }).addTo(map);

    // Regrouper les salles par étage
    const floors = [...new Set(
      layer2Data.features
        .map(f => f.properties.floor)
        .filter(f => f != null)
    )].sort((a, b) => a - b);

    let currentFloor = floors[0];

    // Crée un GeoJSON layer filtré sur l'étage courant, avec labels
    function makeRoomsLayer(floor) {
      return L.geoJSON(layer2Data, {
        filter: f => f.properties.floor === floor,
        style: { color: '#0000ff', weight: 2, fillOpacity: 0.2 },
        onEachFeature(feature, layer) {
          const label = feature.properties.label_new;
          if (!label) return;
          layer.bindTooltip(label, {
            permanent: true,
            direction: 'center',
            className: 'room-label'
          });
        }
      });
    }

    let roomsLayer = makeRoomsLayer(currentFloor).addTo(map);

    // Contrôle +/- étage
    const FloorControl = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd() {
        const container = L.DomUtil.create('div', 'floor-control');
        container.innerHTML = `
          <button id="floor-down">−</button>
          <span id="floor-label">Étage ${currentFloor}</span>
          <button id="floor-up">+</button>
        `;
        L.DomEvent.disableClickPropagation(container);

        container.querySelector('#floor-up').onclick = () => {
          const idx = floors.indexOf(currentFloor);
          if (idx < floors.length - 1) setFloor(floors[idx + 1]);
        };
        container.querySelector('#floor-down').onclick = () => {
          const idx = floors.indexOf(currentFloor);
          if (idx > 0) setFloor(floors[idx - 1]);
        };

        return container;
      }
    });

    function setFloor(floor) {
      currentFloor = floor;
      map.removeLayer(roomsLayer);
      roomsLayer = makeRoomsLayer(floor).addTo(map);
      document.getElementById('floor-label').textContent = `Étage ${floor}`;
    }

    new FloorControl().addTo(map);

    L.control.layers(null, { 'Bâtiments': layer1 }).addTo(map);

  } catch (err) {
    console.error('Error loading shapefiles:', err);
  }
}

  addOverlayLayers();

  function geoToScreen(lat, lon) {
    const point = map.latLngToContainerPoint(L.latLng(lat, lon));
    return { x: point.x, y: point.y };
  }

  function panTo(lat, lon, zoom) {
    if (zoom !== undefined) {
      map.setView([lat, lon], zoom);
    } else {
      map.panTo([lat, lon]);
    }
  }

  return { map, geoToScreen, panTo, isReady: () => true };
}