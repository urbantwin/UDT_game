// Map tiles/data loader.
// TODO:
// - Resolve tile URLs from map config.
// - Load tile images with caching.
// - Provide tile lookup for current zoom and bounds.

export function createTileSource() {
  return {
    getTile() { return null; }
  };
}
