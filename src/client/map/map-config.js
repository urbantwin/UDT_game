// Map configuration for EPFL campus.
// Uses Stadia Maps Alidade Smooth Dark raster tiles.



const MAPTILER_API_KEY = 'gSTCLnxh29Q78GGjrOo9';
const MAPTILER_TILE_URL = `https://api.maptiler.com/tiles/019e6879-f24c-70e1-b4bb-d7751e248a6a/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`;

export const mapConfig = {
  center: { lat: 46.520444, lon: 6.567812 },
  initialZoom: 17,
  minZoom: 16,
  maxZoom: 20,
  tileUrl: MAPTILER_TILE_URL,
  tileOptions: {
    tileSize: 512,
    zoomOffset: -1,
    crossOrigin: true,
  },
  attribution:
    '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
    '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
  maxBounds: [
    [46.514899, 6.559748],
    [46.525309, 6.575161],
  ],
  maxBoundsViscosity: 0.9,
};
