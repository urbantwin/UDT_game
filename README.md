# UDT_game

Prototype PWA for a georeferenced campus map. The app shows OpenStreetMap tiles, a live user location marker, a time HUD, and a lightweight camera capture UI that saves photos locally in the PWA.

**Scripts**
- `npm run dev:full` � start the Vite dev server.
- `npm run build` � build the production bundle.
- `npm run preview` � preview the production build locally.

**Files And Purpose**
- `.gitignore` � ignores local artifacts and dependencies.
- `README.md` � project overview and file map.
- `index.html` � Vite entry HTML that loads `src/client/main.js`.
- `package.json` � project metadata and npm scripts.
- `package-lock.json` � locked dependency tree for reproducible installs.
- `vite.config.js` � Vite configuration (LAN dev server enabled).
- `public/maps/README.md` � placeholder notes for map assets.
- `assets/images/EPFL_map.png` � optional local PNG map (legacy single-image test).
- `src/client/main.js` � app entry point; calls `bootstrapApp`.
- `src/client/app/bootstrap.js` � wires Leaflet map, geolocation, time overlay, and camera UI.
- `src/client/app/state.js` � shared runtime state for map and user location.
- `src/client/map/map-config.js` � map settings (center, zoom, bounds, tile URL).
- `src/client/map/map-view.js` � Leaflet map creation and map helper utilities.
- `src/client/map/map-geo.js` � geo conversion helpers (legacy image mapping).
- `src/client/map/map-tiles.js` � stub for future custom tile management.
- `src/client/overlays/user-location-layer.js` � Leaflet layer for user location marker and accuracy ring.
- `src/client/overlays/time-overlay.js` � Leaflet overlay that shows current time and timer.
- `src/client/overlays/geometry-layer.js` � stub for future interactive geometry overlays.
- `src/client/render/renderer.js` � stub for a custom render loop (unused with Leaflet).
- `src/client/render/layers.js` � stub for future layer composition (unused with Leaflet).
- `src/client/input/gestures.js` � stub for custom gesture handling (unused with Leaflet).
- `src/client/input/hit-test.js` � stub for geometry hit testing (unused with Leaflet).
- `src/client/services/geolocation.js` � wrapper for browser geolocation updates.
- `src/client/services/camera.js` � camera start/stop/capture helpers.
- `src/client/services/assets.js` � stub for future map asset preloading.
- `src/client/camera/camera-controller.js` � orchestrates camera UI, capture, and local saving.
- `src/client/camera/camera-overlay.js` � camera UI panel and controls.
- `src/shared/constants/geo.js` � shared geo constants.
- `src/shared/types/geo.js` � shared geo types (placeholders).
