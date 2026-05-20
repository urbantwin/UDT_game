// Map configuration for EPFL campus.
// Uses Stadia Maps Alidade Smooth Dark raster tiles.

const STADIA_API_KEY = import.meta.env.VITE_STADIA_API_KEY?.trim();
const STADIA_TILE_BASE = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png';
const STADIA_TILE_URL = STADIA_API_KEY
  ? `${STADIA_TILE_BASE}?api_key=${encodeURIComponent(STADIA_API_KEY)}`
  : STADIA_TILE_BASE;

export const mapConfig = {
  center: { lat: 46.520444, lon: 6.567812 },
  initialZoom: 17,
  minZoom: 16,
  maxZoom: 20,
  tileUrl: STADIA_TILE_URL,
  attribution:
    '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener noreferrer">Stadia Maps</a> ' +
    '&copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> ' +
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  maxBounds: [
    [46.514899, 6.559748],
    [46.525309, 6.575161],
  ],
  maxBoundsViscosity: 0.9,
};
