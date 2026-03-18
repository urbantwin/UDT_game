// Overlay for user's geolocation (red dot).

export function createUserLocationLayer() {
  let location = null;

  function setLocation(nextLocation) {
    location = nextLocation;
  }

  function render(ctx, mapView) {
    if (!location || !mapView) return;
    const screen = mapView.geoToScreen(location.lat, location.lon);
    if (!screen) return;

    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    setLocation,
    render
  };
}
