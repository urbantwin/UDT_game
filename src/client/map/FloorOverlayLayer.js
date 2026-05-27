import L from 'leaflet';
import {
  floorOverlayTiles,
  floorOverlayOptions,
  OVERLAY_MIN_ZOOM,
} from './floorOverlayConfig';

// Name of the custom Leaflet pane that sits above the base tiles
// but strictly below the roomsLayer pane.
const OVERLAY_PANE = 'floorOverlayPane';

// roomsLayer must use a pane with a higher z-index than this.
// Leaflet default tile pane z-index is 200; overlayPane is 400.
// We place our custom pane at 300 — above tiles, below vectors/rooms.
const OVERLAY_PANE_Z = 300;

export class FloorOverlayLayer {
  /**
   * @param {L.Map} map  - The Leaflet map instance.
   */
  constructor(map) {
    this._map = map;
    this._currentLayer = null;
    this._currentFloor = null;

    this._ensurePane();
    this._bindZoomHandler();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Call this whenever the user selects a different floor.
   * @param {number|string} floor  e.g. 0, 1, 2, 3
   */
  setFloor(floor) {
    const floorKey = Number(floor);

    if (this._currentFloor === floorKey) return; // no change
    this._currentFloor = floorKey;

    this._removeCurrentLayer();

    if (!floorOverlayTiles[floorKey]) {
      // Floor has no overlay defined — just leave the base map showing.
      return;
    }

    this._addLayer(floorKey);
  }

  /**
   * Fully remove the overlay and stop listening to zoom events.
   * Call this when unmounting the map component.
   */
  destroy() {
    this._removeCurrentLayer();
    this._map.off('zoomend', this._onZoomEnd, this);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _ensurePane() {
    // Leaflet silently ignores duplicate createPane calls, but guard anyway.
    if (!this._map.getPane(OVERLAY_PANE)) {
      const pane = this._map.createPane(OVERLAY_PANE);
      pane.style.zIndex = OVERLAY_PANE_Z;
      // Prevent the pane from swallowing pointer events meant for rooms.
      pane.style.pointerEvents = 'none';
    }
  }

  _bindZoomHandler() {
    this._map.on('zoomend', this._onZoomEnd, this);
  }

  _onZoomEnd() {
    if (this._currentLayer === null) return;

    const zoom = this._map.getZoom();
    const container = this._currentLayer.getContainer?.();

    if (zoom >= OVERLAY_MIN_ZOOM) {
      // Show — restore visibility.
      if (container) container.style.display = '';
    } else {
      // Hide — keep the layer object alive to avoid re-fetching tiles.
      if (container) container.style.display = 'none';
    }
  }

  _addLayer(floorKey) {
    const url = floorOverlayTiles[floorKey];
    const zoom = this._map.getZoom();

    this._currentLayer = L.tileLayer(url, {
      ...floorOverlayOptions,
      pane: OVERLAY_PANE,
    });

    this._currentLayer.addTo(this._map);

    // Immediately honour the zoom threshold without waiting for a zoomend.
    const container = this._currentLayer.getContainer?.();
    if (container && zoom < OVERLAY_MIN_ZOOM) {
      container.style.display = 'none';
    }
  }

  _removeCurrentLayer() {
    if (this._currentLayer) {
      this._map.removeLayer(this._currentLayer);
      this._currentLayer = null;
    }
  }
}