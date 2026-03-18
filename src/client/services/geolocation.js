// Browser geolocation wrapper.
// TODO:
// - Start/stop navigator.geolocation.watchPosition.
// - Normalize output to { lat, lon, accuracy, timestamp }.
// - Handle permission errors.

export function startGeolocation() {
  return function stop() {};
}
