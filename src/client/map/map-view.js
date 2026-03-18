// Map view: handles rendering the georeferenced map background.
// TODO:
// - Create canvas or WebGL surface for map tiles.
// - Draw visible tiles or base image based on current view.
// - Expose methods to update viewport and redraw.

export function createMapView() {
  return {
    resize() {},
    render() {}
  };
}
