// Map view: handles rendering the georeferenced map background.
// This first version draws a single PNG image.

import { geoToMapPixels } from "./map-geo.js";

export function createMapView({ imageUrl, bounds, fit = "contain" }) {
  const image = new Image();
  let ready = false;
  let drawRect = { x: 0, y: 0, width: 0, height: 0, scale: 1 };

  image.onload = () => {
    ready = true;
  };
  image.src = imageUrl;

  function computeDrawRect(canvas) {
    if (!ready || !canvas) return;
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const scale = fit === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (canvas.width - width) * 0.5;
    const y = (canvas.height - height) * 0.5;
    drawRect = { x, y, width, height, scale };
  }

  function resize(canvas) {
    computeDrawRect(canvas);
  }

  function render(ctx, canvas) {
    if (!canvas || !ctx) return;
    if (!ready) {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    computeDrawRect(canvas);
    ctx.drawImage(image, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
  }

  function geoToScreen(lat, lon) {
    if (!ready) return null;
    const mapPixels = geoToMapPixels(lat, lon, bounds, image.width, image.height);
    if (!mapPixels) return null;
    return {
      x: drawRect.x + mapPixels.x * drawRect.scale,
      y: drawRect.y + mapPixels.y * drawRect.scale
    };
  }

  return {
    resize,
    render,
    geoToScreen,
    isReady: () => ready
  };
}
