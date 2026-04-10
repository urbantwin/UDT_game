import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { getDb, run, all } from './db.js';
import { GAME_SETTINGS, SUBMISSION_WINDOW, getTodayLocation } from '../../game/game-config.js';
import { getLocationById } from '../../game/epfl-locations.js';

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
    const today = formatLocalDate(new Date());
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
  const { photoId, clientId, playerId } = req.body || {};
  if (!photoId) { res.status(400).json({ error: 'Missing photoId.' }); return; }
  try {
    const db = await getDb();
    const challenge = await getChallengeById(db, challengeId);
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    const now = new Date();
    if (!isSameDay(now, challenge.date) || !isWithinSubmissionWindow(challenge.date, now)) {
      res.status(400).json({ error: 'Submission window closed.' });
      return;
    }

    const photo = await getPhotoById(db, photoId);
    if (!photo) {
      res.status(404).json({ error: 'Photo not found.' });
      return;
    }

    const photoLocation = safeJsonParse(photo.location);
    if (!photoLocation) {
      res.status(400).json({ error: 'Photo has no location.' });
      return;
    }

    if (!isSameDay(new Date(photo.createdAt), challenge.date)) {
      res.status(400).json({ error: 'Photo was not taken today.' });
      return;
    }

    const targetLocation = getLocationById(challenge.locationId) ?? getTodayLocation();
    const targetLat = targetLocation?.lat;
    const targetLon = targetLocation?.lng;
    if (targetLat == null || targetLon == null) {
      res.status(400).json({ error: 'Challenge target not configured.' });
      return;
    }

   // Default:  do not restrict the photo location to a specific target area
   // const dist = haversineMeters(targetLat, targetLon, photoLocation.lat, photoLocation.lon ?? photoLocation.lng);
   // if (dist > GAME_SETTINGS.validPhotoRadiusMeters) {
   //   res.status(400).json({ error: 'Photo is outside target area.' });
   //   return;
   // }

    const playerKey = playerId ?? clientId ?? null;
    if (playerKey) {
      const existing = await all(db,
        'SELECT COUNT(*) as count FROM submissions WHERE challengeId = ? AND playerId = ?',
        [challengeId, playerKey]
      );
      if ((existing[0]?.count ?? 0) >= GAME_SETTINGS.maxPhotosPerDay) {
        res.status(400).json({ error: 'Submission limit reached.' });
        return;
      }
    }

    const result = await run(db,
      'INSERT INTO submissions (challengeId, photoId, clientId, playerId, createdAt) VALUES (?, ?, ?, ?, ?)',
      [challengeId, photoId, clientId ?? null, playerKey, Date.now()]
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

async function getPhotoById(db, photoId) {
  return (await all(db, 'SELECT * FROM photos WHERE id = ?', [photoId]))[0] ?? null;
}

async function getChallengeById(db, challengeId) {
  return (await all(db, 'SELECT * FROM challenges WHERE id = ?', [challengeId]))[0] ?? null;
}

function isSameDay(date, dateStr) {
  if (!(date instanceof Date)) return false;
  return formatLocalDate(date) === dateStr;
}

function isWithinSubmissionWindow(dateStr, now = new Date()) {
  const start = SUBMISSION_WINDOW?.start ?? { hour: 0, minute: 0 };
  const end = SUBMISSION_WINDOW?.end ?? { hour: 23, minute: 59 };
  const toMinutes = (t) => t.hour * 60 + t.minute;
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const currentMin = now.getHours() * 60 + now.getMinutes();

  if (startMin <= endMin) {
    return currentMin >= startMin && currentMin <= endMin;
  }
  return currentMin >= startMin || currentMin <= endMin;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
