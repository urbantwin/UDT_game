# UDT Game — Claude Code Standing Instructions

## What This Project Is

A multiplayer web/mobile game for EPFL students that gamifies campus scanning for a **Urban Digital Twin**. Players take geolocated photos of campus locations, respond to photo challenges, and play mini-games to earn points. The photos feed into a 3D semantic model of the campus.

**Three core objectives:**
1. Collect valuable data for the digital twin
2. Flexible implementation to collect targeted data on demand
3. Smooth gamified UX using individually taken photos

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + Vite 6.0 (no framework) |
| Maps | Leaflet 1.9.4 + OpenStreetMap |
| Client Storage | IndexedDB |
| Backend | Node.js + Express 4.19 |
| Database | SQLite3 (local file: `data/photos.db`) |
| Real-time | WebSocket (`ws`) |
| Auth | express-session + bcryptjs |
| Image validation (JS) | Sharp 0.34 (Laplacian, Sobel, dHash) |
| Image validation (ML) | Python FastAPI + CLIP (transformers, port 8000) |
| Dev HTTPS | mkcert |
| Build | Vite + concurrently |

**Language policy:** UI/rules text is in **French** (campus is French-speaking). Code, variable names, and comments in **English**.


## Project Structure

```
game/
  game-config.js          ← PRIMARY config file — schedules, locations, scoring, mini-games
  epfl-locations.js        ← 7 campus locations (lat/lng)

src/
  client/
    app/bootstrap.js       ← Wires all frontend modules
    app/state.js           ← Global state (map, GPS)
    map/                   ← Leaflet map setup
    camera/                ← Camera capture UI
    gallery/               ← Photo gallery + admin review UI
    overlays/              ← All UI panels (auth, challenge, notifications, settings...)
    minigames/             ← Mini-game UI (geo-pin, re-photo, time-guess) — STUBS need impl
    services/              ← Client-side API calls + IndexedDB + WebSocket sync
  server/
    index.js               ← Main server (1055 lines) — all REST routes + WebSocket
    db.js                  ← SQLite schema + migrations + helpers
    ai-validator.js        ← Local Sharp-based validation (fallback)
    photo-validator-client.js ← Orchestrates Python CLIP → Sharp fallback
    auth.js                ← Session + password utilities
  shared/
    constants/geo.js       ← Geographic constants
    types/geo.js           ← Type definitions

photo_validator/           ← Python CLIP service (optional, port 8000)
  api.py                   ← FastAPI endpoints
  validator.py             ← CLIP validation engine
  criteria.json            ← Configurable prompts & thresholds
```

---
## In what order should the agents be used?
strategic-planner -> technical planner -> coding-agent ->  reviewer agent 
---

## Dev Commands

```bash
npm run dev:full          # Client (port 5173) + Server (port 3001) — primary dev mode
npm run dev:full:https    # Same with HTTPS (needed for mobile camera access)
npm run dev               # Vite client only
npm run server            # Express server only
npm run build             # Production build → dist/

# Python validator (optional, enhances photo validation)
cd photo_validator && python -m uvicorn api:app --host 0.0.0.0 --port 8000
# Or on Windows: start_validator.bat
```

**Default dev account:** username `dev`, password `12345678` (auto-created on server start).

---

## Database: 4-Bucket Photo System

```
Bucket 1 (pending)      ← User submits contribution photo
     ↓ AI validation (CLIP or Sharp)
Bucket 2 (validated)    ← Challenge pool — served to other players
     ↓ Player responds to challenge
Bucket 3 (pending)      ← Response photo awaiting validation
     ↓ Admin or auto-review
Bucket 4 (validated)    ← Completed challenge pair
```

**Key tables:** `users`, `photos`, `challenges`, `submissions`, `guesses`, `notifications`, `challenge_views`, `ai_thresholds`, `ai_feedback`

**photos.category:** `'contribution'` | `'response'`
**photos.status:** `'pending'` | `'validated'` | `'served'` | `'discarded'` | `'closed'`

---

## Scoring System

- Contribution accepted by AI: +10 pts
- Response validated by admin: +25 pts
- GPS proximity bonus (response): +10 pts (<25m), +5 pts (<50m), +1 pt (<100m)
- Mini-games: geoPin up to 1000 pts, rePhoto 300 pts fixed, timeGuess up to 500 pts
- Undefeated photo award: +100 pts (admin grants)

---

## REST API Summary

```
POST /api/auth/register|login|logout
GET  /api/auth/me

POST /api/photos/contribute           ← Submit contribution photo (triggers async AI validation)
POST /api/photos/respond              ← Submit response photo (GPS + visual check)

POST /api/challenge/request           ← Get random validated photo to respond to
POST /api/challenge/accept

POST /api/guess                       ← Submit mini-game answer
GET  /api/guess/:photoId

GET  /api/leaderboard
GET  /api/me/score

GET  /api/notifications
POST /api/notifications/read-all
POST /api/notifications/:id/read

GET  /api/admin/photos?bucket=1|2|3|4
POST /api/admin/photos/:id/review
GET  /api/admin/submissions
POST /api/admin/submissions/:id/review
POST /api/admin/photos/:id/award-unbeaten
```

---


**Admin interface:** [src/client/gallery/admin-gallery-view.js](src/client/gallery/admin-gallery-view.js) — allows setting challenge type, location, time window.

Weekly challenges are stored in the `challenges` table linked to a date and `locationId`.

---

## Roadmap (from project brief)

### In Progress
- [ ] Photo validation automation (Python CLIP service — infrastructure done, needs tuning)
- [ ] New geolocation logic (pin validation within GPS radius)
- [ ] Weekly challenge admin UI

### Partially Done
- [~] Login page (logic done, design/consent needed)
- [~] Floor/basemap system (locations defined, floor selection UI pending)

### Not Started
- [ ] Mini-game UI implementations (stubs exist in `src/client/minigames/`)
- [ ] Face detection / image consent mechanism
- [ ] Food theme scenarios for final presentation
- [ ] Full mobile UI test pass

### Low Priority
- [ ] Face detection / auto-blur / consent for saved images

---

## Standing Instructions for AI Assistance

### When editing game rules or scoring
Always update **both** the server logic (`src/server/index.js`) and the game config (`game/game-config.js`). Never hardcode values in routes that belong in config.

### When adding new DB columns
Add a migration in `src/server/db.js` using the existing `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern. Never drop or rename columns — use soft migrations only.

### When adding new REST routes
- Authenticated routes: wrap with `requireAuth` middleware from `auth.js`
- Admin routes: also check `req.session.user.username === 'dev'` (or future role check)
- Always return JSON, never HTML from API routes
- Broadcast via WebSocket when state changes affect other players

### When touching validation logic
- `src/server/photo-validator-client.js` is the entry point — it tries Python first, falls back to Sharp
- Don't change validation thresholds directly in code — they're in `data/ai_thresholds` (DB) and `photo_validator/criteria.json`
- Admin corrections feed into `ai_feedback` table for adaptive learning

### When implementing mini-games
- UI stubs are in `src/client/minigames/` — implement there
- Backend guess endpoint already exists: `POST /api/guess`
- Scoring formula lives in `game/game-config.js` under `MINIGAMES`

### Code style
- No comments unless the WHY is non-obvious
- No TypeScript — vanilla JS throughout
- No React/Vue/Angular — vanilla JS + DOM manipulation
- Keep server routes in `index.js` (do not split into separate route files unless it grows past 1500 lines)
- Prefer editing existing files over creating new ones

### Mobile-first considerations
- Camera requires HTTPS on real devices → use `npm run dev:full:https` for device testing
- Touch targets: minimum 44px
- Test on both portrait and landscape orientations

---

## Environment Variables (.env)

```
SESSION_SECRET=         ← Required for auth
SESSION_COOKIE_NAME=    ← Cookie name
CORS_ORIGINS=           ← Comma-separated allowed origins (default: http://localhost:5173)
ANTHROPIC_API_KEY=      ← Optional, for future Claude API integration
```

Copy `.env.example` → `.env` and fill values before starting.

---

## Final Presentation Requirements

1. **Food theme scenario** — design and demo a scenario around food on campus
2. **Working weekly challenge** — admin sets it, players complete it
3. **Test run with real users** — game must be stable enough for a live demo
