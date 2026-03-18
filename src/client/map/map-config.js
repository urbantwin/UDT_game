// Map configuration.
// This first version uses a single georeferenced PNG for the map background.
// Keep this config isolated so we can swap to tiles or another renderer later.

export const mapConfig = {
  // TODO: Replace these bounds with the real georeference for EPFL_map.png.
  // These values are placeholders to keep the pipeline wired end-to-end.
  bounds: {
    minLat: 46.516,
    maxLat: 46.525,
    minLon: 6.558,
    maxLon: 6.574
  },
  imageUrl: new URL("../../../assets/images/EPFL_map.png", import.meta.url).href,
  fit: "contain" // "contain" keeps the full map visible.
};
