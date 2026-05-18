// Thin adapter: delegates room coloring and click handling to mapView's
// shapefile-based polygon system instead of placing discrete markers.

export function createRoomPinsLayer(mapView, { onPinClick } = {}) {
  let visible = false;

  function show(ctfRoomsData = []) {
    visible = true;
    mapView.setRoomControlData?.(ctfRoomsData, onPinClick);
  }

  function hide() {
    visible = false;
    mapView.clearRoomControl?.();
  }

  function isVisible() { return visible; }

  function remove() { hide(); }

  return { show, hide, isVisible, remove };
}
