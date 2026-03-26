import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { getDb, run, all } from './db.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/api/photos', async (_req, res) => {
  try {
    const db = await getDb();
    const photos = await all(db, 'SELECT * FROM photos ORDER BY createdAt DESC');
    res.json(photos.map(p => ({
      ...p,
      location: p.location ? JSON.parse(p.location) : null
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/photos', async (req, res) => {
  const { clientId, createdAt, width, height, type, location, dataUrl } = req.body || {};
  if (!dataUrl || !createdAt) {
    res.status(400).json({ error: 'Missing photo payload.' });
    return;
  }
  try {
    const db = await getDb();
    const result = await run(db,
      `INSERT INTO photos (clientId, createdAt, width, height, type, location, dataUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId ?? null,
        createdAt,
        width ?? null,
        height ?? null,
        type ?? 'image/png',
        location ? JSON.stringify(location) : null,
        dataUrl
      ]
    );
    const record = {
      id: result.lastID,
      clientId: clientId ?? null,
      createdAt,
      width: width ?? null,
      height: height ?? null,
      type: type ?? 'image/png',
      location: location ?? null,
      dataUrl
    };
    broadcast({ type: 'photo-added', photo: record });
    res.json({ id: record.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CHALLENGES ──────────────────────────────────────────────

// GET /api/challenge/today  → défi du jour (créé si inexistant)
app.get('/api/challenge/today', async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    let challenge = (await all(db, 'SELECT * FROM challenges WHERE date = ?', [today]))[0];
    if (!challenge) {
      // Le locationId par défaut ; le client peut surcharger via game-config.js
      const defaultLocationId = req.query.locationId ?? 'rolex';
      const result = await run(db,
        'INSERT INTO challenges (date, locationId, createdAt) VALUES (?, ?, ?)',
        [today, defaultLocationId, Date.now()]
      );
      challenge = { id: result.lastID, date: today, locationId: defaultLocationId };
    }
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/challenge/:id/submit  → soumettre une photo pour un défi
app.post('/api/challenge/:id/submit', async (req, res) => {
  const challengeId = Number(req.params.id);
  const { photoId, clientId } = req.body || {};
  if (!photoId) { res.status(400).json({ error: 'Missing photoId.' }); return; }
  try {
    const db = await getDb();
    const result = await run(db,
      'INSERT INTO submissions (challengeId, photoId, clientId, createdAt) VALUES (?, ?, ?, ?)',
      [challengeId, photoId, clientId ?? null, Date.now()]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MINI-JEUX (GUESSES) ──────────────────────────────────────

// POST /api/guess  → soumettre une réponse à un mini-jeu
app.post('/api/guess', async (req, res) => {
  const { photoId, clientId, type, payload } = req.body || {};
  if (!photoId || !type || !payload) {
    res.status(400).json({ error: 'Missing fields.' }); return;
  }
  if (!['geo-pin', 'time-guess', 're-photo'].includes(type)) {
    res.status(400).json({ error: 'Unknown guess type.' }); return;
  }
  try {
    const db = await getDb();
    const score = computeScore(type, payload, await getPhotoMeta(db, photoId));
    const result = await run(db,
      'INSERT INTO guesses (photoId, clientId, type, payload, score, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [photoId, clientId ?? null, type, JSON.stringify(payload), score, Date.now()]
    );
    res.json({ id: result.lastID, score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guess/:photoId  → scores existants pour une photo
app.get('/api/guess/:photoId', async (req, res) => {
  try {
    const db = await getDb();
    const guesses = await all(db,
      'SELECT id, clientId, type, score, createdAt FROM guesses WHERE photoId = ? ORDER BY createdAt DESC',
      [Number(req.params.photoId)]
    );
    res.json(guesses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HELPERS ─────────────────────────────────────────────────

async function getPhotoMeta(db, photoId) {
  return (await all(db, 'SELECT createdAt, location FROM photos WHERE id = ?', [photoId]))[0] ?? null;
}

function computeScore(type, payload, photo) {
  if (!photo) return 0;
  if (type === 'time-guess') {
    if (payload.hour == null || payload.minute == null) return 0;
    const real = new Date(photo.createdAt);
    const guessMinutes = payload.hour * 60 + payload.minute;
    const realMinutes  = real.getHours() * 60 + real.getMinutes();
    const diff = Math.abs(guessMinutes - realMinutes);
    // 0–5 min → 500 pts, 120+ min → 0 pts
    return Math.max(0, Math.round(500 * (1 - diff / 120)));
  }
  if (type === 'geo-pin') {
    if (payload.lat == null || payload.lng == null) return 0;
    const loc = photo.location ? JSON.parse(photo.location) : null;
    if (!loc) return 0;
    const dist = haversineMeters(loc.lat, loc.lon ?? loc.lng, payload.lat, payload.lng);
    // 0–10 m → 1000 pts, 500+ m → 0 pts
    return Math.max(0, Math.round(1000 * (1 - dist / 500)));
  }
  // re-photo : validé par présence (score fixe = 300)
  return 300;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── WEBSOCKET & SERVER ───────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Photo sync server listening on http://localhost:${PORT}`);
});
