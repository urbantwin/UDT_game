import shp from 'shpjs';

// shpjs lit le .prj et reprojette automatiquement en WGS84 (EPSG:4326)
// Aucune reprojection manuelle nécessaire

export async function loadShapefile(url) {
  const geojson = await shp(url);

  // Garde défensive contre les géométries nulles
  geojson.features = geojson.features.filter(
    f => f.geometry && f.geometry.coordinates
  );

  return geojson;
}