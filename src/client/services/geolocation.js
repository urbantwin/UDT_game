// Browser geolocation wrapper.

export function startGeolocation({ onUpdate, onError, enableHighAccuracy = true } = {}) {
  if (!("geolocation" in navigator)) {
    if (onError) onError(new Error("Geolocation not supported by this browser."));
    return function stop() {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      if (!onUpdate) return;
      const { latitude, longitude, accuracy } = position.coords;
      onUpdate({
        lat: latitude,
        lon: longitude,
        accuracy,
        timestamp: position.timestamp
      });
    },
    (error) => {
      if (onError) onError(error);
    },
    {
      enableHighAccuracy,
      maximumAge: 10_000,
      timeout: 10_000
    }
  );

  return function stop() {
    navigator.geolocation.clearWatch(watchId);
  };
}
