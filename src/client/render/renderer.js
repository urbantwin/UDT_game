// Render loop orchestrator.

export function createRenderer({ canvas, ctx, mapView, overlays }) {
  let rafId = null;

  function renderFrame() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    mapView.render(ctx, canvas);

    for (const layer of overlays) {
      layer.render(ctx, mapView);
    }

    rafId = requestAnimationFrame(renderFrame);
  }

  function start() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(renderFrame);
  }

  function stop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  return { start, stop };
}
