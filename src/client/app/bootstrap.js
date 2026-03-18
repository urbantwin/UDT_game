// App bootstrap: wire map and geolocation together.

import { mapConfig } from "../map/map-config.js";
import { createMapView } from "../map/map-view.js";
import { createUserLocationLayer } from "../overlays/user-location-layer.js";
import { startGeolocation } from "../services/geolocation.js";
import { createRenderer } from "../render/renderer.js";

export function bootstrapApp() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  document.body.style.margin = "0";
  document.body.style.background = "#111";
  document.body.style.overflow = "hidden";
  canvas.style.display = "block";
  document.body.appendChild(canvas);

  const mapView = createMapView({
    imageUrl: mapConfig.imageUrl,
    bounds: mapConfig.bounds,
    fit: mapConfig.fit
  });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    mapView.resize(canvas);
  }
  window.addEventListener("resize", resize);

  const userLocationLayer = createUserLocationLayer();
  const renderer = createRenderer({
    canvas,
    ctx,
    mapView,
    overlays: [userLocationLayer]
  });

  const stopGeolocation = startGeolocation({
    onUpdate: (location) => userLocationLayer.setLocation(location),
    onError: (error) => console.warn("Geolocation error:", error)
  });

  resize();
  renderer.start();

  return function teardown() {
    stopGeolocation();
    renderer.stop();
    window.removeEventListener("resize", resize);
  };
}
