// Floor overlay configuration.
// Each floor maps to its own MapTiler raster tile source.
// The overlay is only visible at zoom >= OVERLAY_MIN_ZOOM.

const MAPTILER_API_KEY = 'gSTCLnxh29Q78GGjrOo9';

export const OVERLAY_MIN_ZOOM = 18;

// Add or change tile IDs here to swap sources per floor.
export const floorOverlayTiles = {
  0: `https://api.maptiler.com/tiles/019e6923-3a80-75ec-8733-5a528539fe63/{z}/{x}/{y}@2x.png?key=${MAPTILER_API_KEY}`,
  1: `https://api.maptiler.com/tiles/019e6925-319f-7000-961d-291d491faf36/{z}/{x}/{y}@2x.png?key=${MAPTILER_API_KEY}`,
  2: `https://api.maptiler.com/tiles/019e692f-0f02-782d-8066-1f5baa59170e/{z}/{x}/{y}@2x.png?key=${MAPTILER_API_KEY}`,
  3: `https://api.maptiler.com/tiles/019e6930-7817-7ef2-9a04-132e892e4332/{z}/{x}/{y}@2x.png?key=${MAPTILER_API_KEY}`,
};

export const floorOverlayOptions = {
  tileSize: 512,
  zoomOffset: -1,
  crossOrigin: true,
  opacity: 1.0,       // Adjust if you want the overlay semi-transparent
  // pane is set dynamically in FloorOverlayLayer.js
};