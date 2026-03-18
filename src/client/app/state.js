// Centralized app state for map view, overlays, and user location.
// TODO:
// - Store current map center/zoom/bounds.
// - Store loaded map resources metadata.
// - Store interactive geometry collection.
// - Store user location (lat/lon + accuracy + timestamp).

export const state = {
  map: null,
  geometries: [],
  userLocation: null
};
