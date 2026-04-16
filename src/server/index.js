import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { getDb, run, all } from './db.js';
import { hashPassword, verifyPassword, createToken, requireAuth, getTokenConfig } from './auth.js';
import { CHALLENGE_WINDOW, GAME_SETTINGS, SUBMISSION_WINDOW, getTodayLocation } from '../../game/game-config.js';
import { getLocationById } from '../../game/epfl-locations.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

function requireDevAccess(req, res, next) {
  if (req.user?.username !== 'dev') {
    res.status(403).json({ error: 'Admin access denied.' });
    return;
  }
  next();
}

// ---- AUTH ----
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!isValidUsername(username) || !isValidPassword(password)) {
    res.status(400).json({ error: 'Invalid username or password format.' });
    return;
  }
  if (username.trim().toLowerCase() === 'dev') {
    res.status(403).json({ error: 'Reserved username.' });
    return;
  }
  try {
    const db = await getDb();
    const existing = await all(db, 'SELECT id FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (existing.length) {
      res.status(409).json({ error: 'Username already exists.' });
      return;
    }
    const passwordHash = await hashPassword(password);
    const result = await run(
      db,
      'INSERT INTO users (username, passwordHash, createdAt) VALUES (?, ?, ?)',
      [username.trim().toLowerCase(), passwordHash, Date.now()]
    );
    const user = { id: result.lastID, username: username.trim().toLowerCase() };
    const token = createToken(user);
    res.status(201).json({ token, user, session: getTokenConfig() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Missing credentials.' });
    return;
  }
  try {
    const db = await getDb();
    const user = (await all(db, 'SELECT id, username, passwordHash FROM users WHERE username = ?', [username.trim().toLowerCase()]))[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const publicUser = { id: user.id, username: user.username };
    const token = createToken(publicUser);
    res.json({ token, user: publicUser, session: getTokenConfig() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = (await all(db, 'SELECT id, username, createdAt FROM users WHERE id = ?', [req.user.id]))[0];
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- ADMIN (dev-only) ----
app.get('/api/admin/submissions', requireAuth, requireDevAccess, async (_req, res) => {
  try {
    const db = await getDb();
    const rows = await all(
      db,
      `SELECT
        s.id AS submissionId,
        s.challengeId,
        s.photoId,
        s.userId AS submitterUserId,
        s.reviewStatus,
        s.reviewedBy,
        s.reviewedAt,
        s.reviewNote,
        s.createdAt AS submittedAt,
        c.date AS challengeDate,
        c.locationId AS challengeLocationId,
        p.clientId,
        p.createdAt AS photoCreatedAt,
        p.width,
        p.height,
        p.type,
        p.location,
        p.dataUrl,
        u.username AS submitterUsername,
        reviewer.username AS reviewedByUsername
      FROM submissions s
      JOIN photos p ON p.id = s.photoId
      LEFT JOIN challenges c ON c.id = s.challengeId
      LEFT JOIN users u ON u.id = s.userId
      LEFT JOIN users reviewer ON reviewer.id = s.reviewedBy
      ORDER BY s.createdAt DESC`
    );

    res.json(
      rows.map((row) => ({
        ...row,
        location: safeJsonParse(row.location)
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/submissions/:id/review', requireAuth, requireDevAccess, async (req, res) => {
  const submissionId = Number(req.params.id);
  const { action, note } = req.body || {};
  const normalizedAction = String(action || '').toLowerCase();
  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    res.status(400).json({ error: 'Invalid submission id.' });
    return;
  }
  if (!['validate', 'discard'].includes(normalizedAction)) {
    res.status(400).json({ error: 'Action must be validate or discard.' });
    return;
  }

  const nextStatus = normalizedAction === 'validate' ? 'validated' : 'discarded';
  const reviewNote = typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null;

  try {
    const db = await getDb();
    const existing = await all(
      db,
      'SELECT id, reviewStatus FROM submissions WHERE id = ?',
      [submissionId]
    );
    if (!existing.length) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }

    const result = await run(
      db,
      `UPDATE submissions
       SET reviewStatus = ?, reviewedBy = ?, reviewedAt = ?, reviewNote = ?
       WHERE id = ?`,
      [nextStatus, req.user.id, Date.now(), reviewNote, submissionId]
    );
    if (result.changes === 0) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }

    const row = (
      await all(
        db,
        `SELECT
          s.id AS submissionId,
          s.reviewStatus,
          s.reviewedBy,
          s.reviewedAt,
          s.reviewNote,
          u.username AS reviewedByUsername
         FROM submissions s
         LEFT JOIN users u ON u.id = s.reviewedBy
         WHERE s.id = ?`,
        [submissionId]
      )
    )[0];

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.post('/api/photos', requireAuth, async (req, res) => {
  const { clientId, createdAt, width, height, type, location, dataUrl } = req.body || {};
  if (!dataUrl || !createdAt) {
    res.status(400).json({ error: 'Missing photo payload.' });
    return;
  }
  try {
    const db = await getDb();
    const result = await run(db,
      `INSERT INTO photos (userId, clientId, createdAt, width, height, type, location, dataUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
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
      userId: req.user.id,
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

// â”€â”€ CHALLENGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/challenge/today  â†’ dÃ©fi du jour (crÃ©Ã© si inexistant)
// POST /api/challenge/request -> give one challenge photo to the current player.
// Rules:
// - only between 12:00 and 23:59
// - only validated photos
// - prioritize today, then up to 4 days before
// - exclude already seen photos for this player
// - exclude photos submitted by this player
app.post('/api/challenge/request', requireAuth, async (req, res) => {
  const now = new Date();
  if (!isChallengeRequestWindow(now)) {
    res.status(400).json({ error: 'Challenge is only available between 12:00 and 23:59.' });
    return;
  }

  try {
    const db = await getDb();
    const candidate = await pickChallengePhotoForUser(db, req.user.id, now);
    if (!candidate) {
      res.status(404).json({ error: 'No eligible challenge photo found.' });
      return;
    }

    // Record as seen for this player before returning it.
    await run(
      db,
      'INSERT INTO challenge_views (userId, photoId, servedDate, createdAt) VALUES (?, ?, ?, ?)',
      [req.user.id, candidate.id, formatLocalDate(now), Date.now()]
    );

    res.json({ photoId: candidate.id, dataUrl: candidate.dataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/challenge/today', async (req, res) => {
  try {
    const db = await getDb();
    const today = formatLocalDate(new Date());
    let challenge = (await all(db, 'SELECT * FROM challenges WHERE date = ?', [today]))[0];
    if (!challenge) {
      // Le locationId par dÃ©faut ; le client peut surcharger via game-config.js
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

// POST /api/challenge/:id/submit  â†’ soumettre une photo pour un dÃ©fi
app.post('/api/challenge/:id/submit', requireAuth, async (req, res) => {
  const challengeId = Number(req.params.id);
  const { photoId } = req.body || {};
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

    if (photo.userId !== req.user.id) {
      res.status(403).json({ error: 'Photo does not belong to current user.' });
      return;
    }

    const existing = await all(db,
      'SELECT COUNT(*) as count FROM submissions WHERE challengeId = ? AND userId = ?',
      [challengeId, req.user.id]
    );
    if ((existing[0]?.count ?? 0) >= GAME_SETTINGS.maxPhotosPerDay) {
      res.status(400).json({ error: 'Submission limit reached.' });
      return;
    }

    const result = await run(db,
      'INSERT INTO submissions (challengeId, photoId, clientId, playerId, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [challengeId, photoId, req.user.username, String(req.user.id), req.user.id, Date.now()]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ MINI-JEUX (GUESSES) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// POST /api/guess  â†’ soumettre une rÃ©ponse Ã  un mini-jeu
app.post('/api/guess', requireAuth, async (req, res) => {
  const { photoId, type, payload } = req.body || {};
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
      'INSERT INTO guesses (photoId, clientId, userId, type, payload, score, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [photoId, req.user.username, req.user.id, type, JSON.stringify(payload), score, Date.now()]
    );
    res.json({ id: result.lastID, score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guess/:photoId  â†’ scores existants pour une photo
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

// â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function getPhotoMeta(db, photoId) {
  return (await all(db, 'SELECT createdAt, location FROM photos WHERE id = ?', [photoId]))[0] ?? null;
}

async function getPhotoById(db, photoId) {
  return (await all(db, 'SELECT * FROM photos WHERE id = ?', [photoId]))[0] ?? null;
}

async function getChallengeById(db, challengeId) {
  return (await all(db, 'SELECT * FROM challenges WHERE id = ?', [challengeId]))[0] ?? null;
}

async function pickChallengePhotoForUser(db, userId, now = new Date()) {
  const servedToday = await all(
    db,
    'SELECT photoId, COUNT(*) as count FROM challenge_views WHERE servedDate = ? GROUP BY photoId',
    [formatLocalDate(now)]
  );
  const servedTodayCount = new Map(servedToday.map((row) => [row.photoId, Number(row.count) || 0]));

  for (let dayOffset = 0; dayOffset <= 4; dayOffset += 1) {
    const { startMs, endMs } = getLocalDayRange(now, dayOffset);
    const rows = await all(
      db,
      `SELECT DISTINCT p.id, p.dataUrl, p.createdAt
       FROM photos p
       JOIN submissions s ON s.photoId = p.id AND s.reviewStatus = 'validated'
       WHERE p.createdAt BETWEEN ? AND ?
         AND (p.userId IS NULL OR p.userId != ?)
         AND NOT EXISTS (
           SELECT 1 FROM challenge_views v WHERE v.userId = ? AND v.photoId = p.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM submissions own WHERE own.userId = ? AND own.photoId = p.id
         )`,
      [startMs, endMs, userId, userId, userId]
    );

    if (!rows.length) continue;

    const minAssignments = Math.min(
      ...rows.map((row) => servedTodayCount.get(row.id) ?? 0)
    );
    const pool = rows.filter((row) => (servedTodayCount.get(row.id) ?? 0) === minAssignments);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return null;
}

function getLocalDayRange(now, dayOffset) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - dayOffset);
  const startMs = day.getTime();
  const endMs = startMs + (24 * 60 * 60 * 1000) - 1;
  return { startMs, endMs };
}

function isChallengeRequestWindow(now = new Date()) {
  return isWithinWindow(CHALLENGE_WINDOW, now);
}

function isSameDay(date, dateStr) {
  if (!(date instanceof Date)) return false;
  return formatLocalDate(date) === dateStr;
}

function isWithinSubmissionWindow(dateStr, now = new Date()) {
  return isWithinWindow(SUBMISSION_WINDOW, now);
}

function isWithinWindow(windowConfig, now = new Date()) {
  const start = windowConfig?.start ?? { hour: 0, minute: 0 };
  const end = windowConfig?.end ?? { hour: 23, minute: 59 };
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

function isValidUsername(value) {
  if (typeof value !== 'string') return false;
  const username = value.trim().toLowerCase();
  return /^[a-z0-9_]{3,24}$/.test(username);
}

function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

function computeScore(type, payload, photo) {
  if (!photo) return 0;
  if (type === 'time-guess') {
    if (payload.hour == null || payload.minute == null) return 0;
    const real = new Date(photo.createdAt);
    const guessMinutes = payload.hour * 60 + payload.minute;
    const realMinutes  = real.getHours() * 60 + real.getMinutes();
    const diff = Math.abs(guessMinutes - realMinutes);
    // 0â€“5 min â†’ 500 pts, 120+ min â†’ 0 pts
    return Math.max(0, Math.round(500 * (1 - diff / 120)));
  }
  if (type === 'geo-pin') {
    if (payload.lat == null || payload.lng == null) return 0;
    const loc = photo.location ? JSON.parse(photo.location) : null;
    if (!loc) return 0;
    const dist = haversineMeters(loc.lat, loc.lon ?? loc.lng, payload.lat, payload.lng);
    // 0â€“10 m â†’ 1000 pts, 500+ m â†’ 0 pts
    return Math.max(0, Math.round(1000 * (1 - dist / 500)));
  }
  // re-photo : validÃ© par prÃ©sence (score fixe = 300)
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

// â”€â”€ WEBSOCKET & SERVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

