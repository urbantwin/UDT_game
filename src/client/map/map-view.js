import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadShapefile } from './map-shp-loader.js';
import { EPFL_LOCATIONS } from '../../../game/epfl-locations.js';

const GAME_LOCATION_IDS = new Set(EPFL_LOCATIONS.map(l => l.id));

// 'CM 0 10' → 'cm_0_10'  (matches EPFL_LOCATIONS id format)
function labelToId(label) {
  return label?.toLowerCase().replace(/\s+/g, '_') ?? null;
}

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

  // CTF state — set before shapefiles load so makeRoomsLayer picks them up on first render
  let ctfRooms = [];
  let roomClickFn = null;

  let layer2Data = null;
  let roomsLayer = null;
  let currentFloor = null;
  let floors = [];

  function makeRoomsLayer(floor) {
    if (!layer2Data) return null;
    return L.geoJSON(layer2Data, {
      filter: f => f.properties.floor === floor,
      style: f => {
        const locId = labelToId(f.properties.label_new);
        const room = ctfRooms.find(r => r.locationId === locId);
        if (room?.teamColor) {
          return { color: room.teamColor, weight: 2, fillColor: room.teamColor, fillOpacity: 0.55 };
        }
        return { color: '#888888', weight: 1.5, fillColor: '#aaaaaa', fillOpacity: 0.25 };
      },
      onEachFeature(feature, layer) {
        const label = feature.properties.label_new;
        if (label) {
          layer.bindTooltip(label, { permanent: true, direction: 'center', className: 'room-label' });
        }
        const locId = labelToId(label);
        if (locId && GAME_LOCATION_IDS.has(locId) && roomClickFn) {
          layer.on('click', () => roomClickFn(locId));
          layer.getElement?.()?.style.setProperty('cursor', 'pointer');
        }
      }
    });
  }

  function applyFloor(floor) {
    currentFloor = floor;
    if (roomsLayer) map.removeLayer(roomsLayer);
    roomsLayer = makeRoomsLayer(floor);
    if (roomsLayer) roomsLayer.addTo(map);
    const label = document.getElementById('floor-label');
    if (label) label.textContent = `Étage ${floor}`;
  }

  async function addOverlayLayers() {
    try {
      let layer1Data = null;
      let l2Data = null;

      try {
        [layer1Data, l2Data] = await Promise.all([
          loadShapefile('/data/buildings.zip'),
          loadShapefile('/data/rooms_subset.zip')
        ]);
      } catch {
        // buildings might not load — try rooms alone
        l2Data = await loadShapefile('/data/rooms_subset.zip');
      }

      let buildingsLayer = null;
      if (layer1Data) {
        buildingsLayer = L.geoJSON(layer1Data, {
          style: { color: '#8f8f8f', weight: 2, fillOpacity: 0.8 }
        }).addTo(map);
      }

      layer2Data = l2Data;

      floors = [...new Set(
        layer2Data.features
          .map(f => f.properties.floor)
          .filter(f => f != null)
      )].sort((a, b) => a - b);

      if (floors.length === 0) return;
      currentFloor = floors[0];
      roomsLayer = makeRoomsLayer(currentFloor);
      if (roomsLayer) roomsLayer.addTo(map);

      // Floor control ±
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
            if (idx < floors.length - 1) applyFloor(floors[idx + 1]);
          };
          container.querySelector('#floor-down').onclick = () => {
            const idx = floors.indexOf(currentFloor);
            if (idx > 0) applyFloor(floors[idx - 1]);
          };
          return container;
        }
      });
      new FloorControl().addTo(map);

      if (buildingsLayer) {
        L.control.layers(null, { 'Bâtiments': buildingsLayer }).addTo(map);
      }

    } catch (err) {
      console.error('[map] Erreur chargement shapefiles:', err);
    }
  }

  addOverlayLayers();

  // ── CTF room control API ──────────────────────────────────────────────────

  function setRoomControlData(rooms, clickFn) {
    ctfRooms = rooms ?? [];
    roomClickFn = clickFn ?? null;
    if (layer2Data && currentFloor !== null) applyFloor(currentFloor);
  }

  function clearRoomControl() {
    ctfRooms = [];
    roomClickFn = null;
    if (layer2Data && currentFloor !== null) applyFloor(currentFloor);
  }

  // ── Standard map API ──────────────────────────────────────────────────────

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

  return { map, geoToScreen, panTo, isReady: () => true, setRoomControlData, clearRoomControl };
}
