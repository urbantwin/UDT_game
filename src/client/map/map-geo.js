// Georeferencing utilities: convert lat/lon to map pixel space.
// This is a simple linear mapping for a single georeferenced image.
// It can be swapped for a projection-based approach later.

export function geoToMapPixels(lat, lon, bounds, imageWidth, imageHeight) {
  if (!bounds || !imageWidth || !imageHeight) return null;

  const { minLat, maxLat, minLon, maxLon } = bounds;
  const lonRange = maxLon - minLon;
  const latRange = maxLat - minLat;
  if (lonRange === 0 || latRange === 0) return null;

  const x = ((lon - minLon) / lonRange) * imageWidth;
  // Latitude decreases down the screen, so invert Y.
  const y = ((maxLat - lat) / latRange) * imageHeight;

  return { x, y };
}
