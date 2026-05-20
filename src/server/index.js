import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { WebSocketServer } from 'ws';
import { getDb, run, all, updateScore } from './db.js';
import {
  hashPassword,
  verifyPassword,
  requireAuth,
  createUserSession,
  destroyUserSession,
  getSessionConfig
} from './auth.js';
import {
  requireDevAccess,
  safeJsonParse,
  haversineMeters,
  uploadPhotoToStorage,
} from './utils.js';
import { CHALLENGE_WINDOW, GAME_SETTINGS, SUBMISSION_WINDOW, getTodayLocation, MINIGAMES } from '../../game/game-config.js';
import { getLocationById, EPFL_LOCATIONS } from '../../game/epfl-locations.js';
import createRoomMayorsRouter from './routes/room-mayors.js';
import ctfRouter, { startCtfCron } from './routes/ctf.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-change-me';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'udt.sid';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 7 * 24 * 60 * 60 * 1000);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const useHttps = process.env.DEV_HTTPS === '1' || process.env.DEV_HTTPS === 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certPath = path.resolve(__dirname, '../../certs/dev-cert.pem');
const keyPath = path.resolve(__dirname, '../../certs/dev-key.pem');
const distPath = path.resolve(__dirname, '../../dist');

const dbPool = await getDb();
const PgStore = connectPg(session);

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: CORS_ORIGINS.length ? CORS_ORIGINS : true,
  credentials: true
}));
app.use(session({
  store: new PgStore({
    pool: dbPool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  name: SESSION_COOKIE_NAME,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' || useHttps,
    maxAge: SESSION_TTL_MS
  }
}));
app.use(express.json({ limit: '15mb' }));

// ---- AUTH ----
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!isValidUsername(username) || !isValidPassword(password)) {
    res.status(400).json({ error: 'Invalid username or password format.' });
    return;
  }
  if (username.trim().toLowerCase() === 'admin') {
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
    await createUserSession(req, user);
    res.status(201).json({ user, session: getSessionConfig() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password, rememberMe } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Missing credentials.' });
    return;
  }
  try {
    const db = await getDb();
    const user = (await all(db, 'SELECT id, username, passwordHash, teamId FROM users WHERE username = ?', [username.trim().toLowerCase()]))[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const publicUser = { id: user.id, username: user.username, teamId: user.teamId ?? null };
    await createUserSession(req, publicUser);
    if (rememberMe) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    res.json({ user: publicUser, session: getSessionConfig() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = (await all(db, 'SELECT id, username, createdAt, teamId FROM users WHERE id = ?', [req.user.id]))[0];
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/auth/logout', async (req, res) => {
  try {
    await destroyUserSession(req);
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || useHttps
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ---- ADMIN (admin-only) ----
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
        COALESCE(p.photoUrl, p.dataUrl) AS dataUrl,
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
      dataUrl: p.photoUrl ?? p.dataUrl ?? null,
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
    const upload = await uploadPhotoToStorage(dataUrl, {
      userId: req.user.id,
      category: 'contribution',
      createdAt,
    });
    const db = await getDb();
    const result = await run(db,
      `INSERT INTO photos (userId, clientId, createdAt, width, height, type, location, dataUrl, photoUrl, storagePath, category, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'contribution', 'pending')`,
      [
        req.user.id,
        clientId ?? null,
        createdAt,
        width ?? null,
        height ?? null,
        type ?? 'image/png',
        location ? JSON.stringify(location) : null,
        null,
        upload.photoUrl,
        upload.storagePath
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
      dataUrl: upload.photoUrl,
      photoUrl: upload.photoUrl
    };
    broadcast({ type: 'photo-added', photo: record });
    res.json({ id: record.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- BUCKET ROUTES ----------------------------------------------------------

// POST /api/photos/contribute  — Bucket 1 (contribution en attente validation)
app.post('/api/photos/contribute', requireAuth, async (req, res) => {
  const { clientId, createdAt, width, height, type, location, dataUrl, floor, locationId } = req.body || {};
  if (!dataUrl || !createdAt) {
    res.status(400).json({ error: 'Missing photo payload.' });
    return;
  }
  if (!location) {
    res.status(400).json({ error: 'Location required to contribute a photo.' });
    return;
  }

  // Validate locationId when provided
  if (locationId != null) {
    const knownLoc = EPFL_LOCATIONS.find(l => l.id === locationId);
    if (!knownLoc) {
      res.status(400).json({ error: 'locationId inconnu.' });
      return;
    }
  }

  const floorVal = Number.isInteger(floor) ? floor : (floor != null ? parseInt(floor, 10) : null);
  try {
    const db = await getDb();

    // 1h cooldown per (user, locationId)
    if (locationId != null) {
      const cooldownCutoff = Date.now() - 3600000;
      const recent = (await all(db,
        `SELECT MAX(createdAt) AS lastAt FROM photos
         WHERE userId = $1 AND locationId = $2 AND createdAt > $3`,
        [req.user.id, locationId, cooldownCutoff]
      ))[0];
      if (recent?.lastAt != null) {
        const minsLeft = Math.ceil((Number(recent.lastAt) + 3600000 - Date.now()) / 60000);
        res.status(429).json({ error: `Tu as deja soumis une photo pour cette salle. Reessaie dans ${minsLeft} minute(s).` });
        return;
      }
    }

    const upload = await uploadPhotoToStorage(dataUrl, {
      userId: req.user.id,
      category: 'contribution',
      createdAt,
    });
    const result = await run(db,
      `INSERT INTO photos (userId, clientId, createdAt, width, height, type, location, dataUrl, photoUrl, storagePath, category, status, floor, locationId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'contribution', 'pending', ?, ?)`,
      [req.user.id, clientId ?? null, createdAt, width ?? null, height ?? null,
       type ?? 'image/png', JSON.stringify(location), null, upload.photoUrl, upload.storagePath, floorVal ?? null, locationId ?? null]
    );
    const photoId = result.lastID;
    res.json({ id: photoId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/photos/respond  ? Bucket 3 (r?ponse ? un challenge, en attente validation)
app.post('/api/photos/respond', requireAuth, async (req, res) => {
  const { clientId, createdAt, width, height, type, location, dataUrl, challengePhotoId, floor } = req.body || {};
  if (!dataUrl || !createdAt) {
    res.status(400).json({ error: 'Missing photo payload.' });
    return;
  }
  if (!location) {
    res.status(400).json({ error: 'Location required to respond to a challenge.' });
    return;
  }
  if (!challengePhotoId) {
    res.status(400).json({ error: 'Missing challengePhotoId.' });
    return;
  }
  try {
    const db = await getDb();
    const challengePhoto = await getPhotoById(db, Number(challengePhotoId));
    // Only accepted challenges can be answered (status = 'served').
    if (!challengePhoto || challengePhoto.category !== 'contribution'
        || challengePhoto.status !== 'served') {
      res.status(400).json({ error: 'Invalid or unavailable challenge photo.' });
      return;
    }
    const upload = await uploadPhotoToStorage(dataUrl, {
      userId: req.user.id,
      category: 'response',
      createdAt,
    });
    const floorVal = Number.isInteger(floor) ? floor : (floor != null ? parseInt(floor, 10) : null);
    const result = await run(db,
      `INSERT INTO photos (userId, clientId, createdAt, width, height, type, location, dataUrl, photoUrl, storagePath, category, status, challengePhotoId, floor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'response', 'pending', ?, ?)`,
      [req.user.id, clientId ?? null, createdAt, width ?? null, height ?? null,
       type ?? 'image/png', JSON.stringify(location), null, upload.photoUrl, upload.storagePath, Number(challengePhotoId), floorVal ?? null]
    );
    const responsePhotoId = result.lastID;
    const challengeOwnerId = Number(challengePhoto.userId);
    const challengeLocation = safeJsonParse(challengePhoto.location);
    const responseLat = Number(location?.lat);
    const responseLon = Number(location?.lon ?? location?.lng);
    const challengeLat = Number(challengeLocation?.lat);
    const challengeLon = Number(challengeLocation?.lon ?? challengeLocation?.lng);

    if (
      Number.isInteger(challengeOwnerId)
      && challengeOwnerId > 0
      && challengeOwnerId !== req.user.id
      && Number.isFinite(responseLat)
      && Number.isFinite(responseLon)
      && Number.isFinite(challengeLat)
      && Number.isFinite(challengeLon)
    ) {
      const distanceMeters = haversineMeters(challengeLat, challengeLon, responseLat, responseLon);
      if (distanceMeters < 25) {
        await updateScore(db, req.user.id, 10);
      } else if (distanceMeters < 50) {
        await updateScore(db, req.user.id, 5);
      } else if (distanceMeters <= 100) {
        await updateScore(db, req.user.id, 1);
      } else {
        await updateScore(db, challengeOwnerId, 5);
      }
    }
    res.json({ id: responsePhotoId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/photos?bucket=1|2|3|4  ? liste par bucket (admin only)
app.get('/api/admin/photos', requireAuth, requireDevAccess, async (req, res) => {
  const bucket = Number(req.query.bucket);
  const bucketMap = {
    1: { category: 'contribution', statuses: ['pending'] },
    2: { category: 'contribution', statuses: ['validated'] },
    3: { category: 'response',     statuses: ['pending'] },
    4: { category: 'response',     statuses: ['validated'] },
  };
  if (!bucketMap[bucket]) {
    res.status(400).json({ error: 'Bucket must be 1, 2, 3 or 4.' });
    return;
  }
  const { category, statuses } = bucketMap[bucket];
  const placeholders = statuses.map((_, index) => `$${index + 2}`).join(', ');
  try {
    const db = await getDb();
    const rows = await all(db,
      `SELECT p.id, p.userId, p.clientId, p.createdAt, p.width, p.height, p.type,
              p.location, COALESCE(p.photoUrl, p.dataUrl) AS dataUrl, p.category, p.status, p.challengePhotoId,
              p.photoReviewedBy, p.photoReviewedAt, p.photoReviewNote, p.floor,

              u.username  AS submitterUsername,
              COALESCE(cp.photoUrl, cp.dataUrl) AS challengeDataUrl,
              cp.location AS challengeLocation,
              cp.floor    AS challengeFloor,
              cpu.username AS challengeSubmitterUsername
       FROM photos p
       LEFT JOIN users u   ON u.id   = p.userId
       LEFT JOIN photos cp ON cp.id  = p.challengePhotoId
       LEFT JOIN users cpu ON cpu.id = cp.userId
       WHERE p.category = $1 AND p.status IN (${placeholders})
       ORDER BY p.createdAt DESC`,
      [category, ...statuses]
    );
    res.json(rows.map(r => ({
      ...r,
      location:          safeJsonParse(r.location),
      challengeLocation: safeJsonParse(r.challengeLocation),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/photos/:id/review  ? valider ou rejeter une photo (admin only)
app.post('/api/admin/photos/:id/review', requireAuth, requireDevAccess, async (req, res) => {
  const photoId = Number(req.params.id);
  const { action, note } = req.body || {};
  const normalizedAction = String(action || '').toLowerCase();
  if (!Number.isInteger(photoId) || photoId <= 0) {
    res.status(400).json({ error: 'Invalid photo id.' });
    return;
  }
  if (!['validate', 'discard'].includes(normalizedAction)) {
    res.status(400).json({ error: 'Action must be validate or discard.' });
    return;
  }
  const newStatus = normalizedAction === 'validate' ? 'validated' : 'discarded';
  const reviewNote = typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null;
  try {
    const db = await getDb();
    const existing = await getPhotoById(db, photoId);
    if (!existing) {
      res.status(404).json({ error: 'Photo not found.' });
      return;
    }
    await run(db,
      `UPDATE photos SET status = ?, photoReviewedBy = ?, photoReviewedAt = ?, photoReviewNote = ? WHERE id = ?`,
      [newStatus, req.user.id, Date.now(), reviewNote, photoId]
    );

    // Si une R?PONSE est refus?e ? remettre la photo originale en 'validated' (bucket 2)
    if (existing.category === 'response' && normalizedAction === 'discard' && existing.challengePhotoId) {
      await run(db,
        "UPDATE photos SET status = 'validated' WHERE id = ? AND category = 'contribution'",
        [existing.challengePhotoId]
      );
    }

    // Scoring rules
    const isTransitionToValidated = normalizedAction === 'validate' && existing.status !== 'validated';
    if (isTransitionToValidated && existing.userId) {
      if (existing.category === 'contribution') {
        await updateScore(db, existing.userId, 5);
      }
      if (existing.category === 'response') {
        await updateScore(db, existing.userId, 25);
      }
    }

    // Envoyer une notification au joueur proprietaire de la photo.
    if (existing.userId) {
      const notifMessage = buildReviewNotification(existing.category, normalizedAction, reviewNote);
      if (notifMessage) {
        const notifType = `${existing.category}_${normalizedAction === 'validate' ? 'validated' : 'discarded'}`;
        await run(db,
          'INSERT INTO notifications (userId, type, message, photoId, createdAt) VALUES (?, ?, ?, ?, ?)',
          [existing.userId, notifType, notifMessage, photoId, Date.now()]
        );
      }
    }

    res.json({ id: photoId, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildReviewNotification(category, action, note) {
  const noteStr = note ? ` (${note})` : '';
  if (category === 'contribution') {
    return action === 'validate'
      ? `Ta photo a ete approuvee ! +5 pts`
      : `Ta photo a ete refusee par l'admin.${noteStr}`;
  }
  if (category === 'response') {
    return action === 'validate'
      ? `Felicitations ! Tu as reussi le challenge. Ta photo a ete validee ! + 25 pts`
      : `Challenge echoue. Ta photo n'a pas ete retenue.${noteStr}`;
  }
  return null;
}

// -- CHALLENGES ----------------------------------------------

// GET /api/challenge/today  ? d�fi du jour (cr�� si inexistant)
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
    const candidate = await pickChallengePhotoForUser(db, req.user.id);
    if (!candidate) {
      res.status(404).json({ error: 'No eligible challenge photo found.' });
      return;
    }

    // Record as seen for this player
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


app.post('/api/challenge/accept', requireAuth, async (req, res) => {
  const challengePhotoId = Number(req.body?.challengePhotoId);
  if (!Number.isInteger(challengePhotoId) || challengePhotoId <= 0) {
    res.status(400).json({ error: 'Invalid challengePhotoId.' });
    return;
  }

  try {
    const db = await getDb();
    const challengePhoto = await getPhotoById(db, challengePhotoId);
    if (!challengePhoto || challengePhoto.category !== 'contribution') {
      res.status(404).json({ error: 'Challenge photo not found.' });
      return;
    }

    const seen = await all(
      db,
      'SELECT 1 FROM challenge_views WHERE userId = ? AND photoId = ? LIMIT 1',
      [req.user.id, challengePhotoId]
    );
    if (!seen.length) {
      res.status(400).json({ error: 'Challenge was not assigned to this user.' });
      return;
    }

    if (challengePhoto.status !== 'validated' && challengePhoto.status !== 'served') {
      res.status(400).json({ error: 'Challenge is no longer available.' });
      return;
    }

    await run(
      db,
      "UPDATE photos SET status = 'served' WHERE id = ? AND category = 'contribution' AND status = 'validated'",
      [challengePhotoId]
    );

    res.json({ ok: true, photoId: challengePhotoId, status: 'served' });
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
      // Le locationId par d�faut ; le client peut surcharger via game-config.js
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

// POST /api/challenge/:id/submit  ? soumettre une photo pour un d�fi
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
      'SELECT COUNT(*)::int as count FROM submissions WHERE challengeId = $1 AND userId = $2',
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

// -- MINI-JEUX (GUESSES) --------------------------------------

// GET /api/minigames/feed — photos jouables (bucket 2, pas du joueur, pas déjà jouées en time-guess)
app.get('/api/minigames/feed', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const photos = await all(db,
      `SELECT p.id, COALESCE(p.photoUrl, p.dataUrl) AS dataUrl, p.createdAt, p.location, u.username AS submitterUsername
       FROM photos p
       LEFT JOIN users u ON u.id = p.userId
       WHERE p.category = 'contribution'
         AND p.status   = 'validated'
         AND p.userId  != ?
         AND p.id NOT IN (
           SELECT g.photoId FROM guesses g
           WHERE g.userId = ? AND g.type = 'time-guess'
         )
       ORDER BY p.createdAt DESC
       LIMIT 20`,
      [req.user.id, req.user.id]
    );
    res.json(photos.map(p => ({
      id: p.id,
      dataUrl: p.dataUrl,
      location: p.location ? JSON.parse(p.location) : null,
      submitterUsername: p.submitterUsername ?? 'inconnu',
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guess — soumettre une réponse à un mini-jeu
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
    const existing = (await all(db,
      'SELECT id FROM guesses WHERE photoId = ? AND userId = ? AND type = ? LIMIT 1',
      [photoId, req.user.id, type]
    ))[0];
    if (existing) {
      res.status(409).json({ error: 'Vous avez déjà joué sur cette photo.' });
      return;
    }
    const photo = await getPhotoMeta(db, photoId);
    const score = computeScore(type, payload, photo);
    const realTime = photo ? formatRealTime(photo.createdAt) : null;
    await run(db,
      'INSERT INTO guesses (photoId, clientId, userId, type, payload, score, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [photoId, req.user.username, req.user.id, type, JSON.stringify(payload), score, Date.now()]
    );
    res.json({ score, realTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guess/:photoId  — scores existants pour une photo
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

// -- HELPERS -------------------------------------------------

async function getPhotoMeta(db, photoId) {
  return (await all(db, 'SELECT createdAt, location FROM photos WHERE id = ?', [photoId]))[0] ?? null;
}

async function getPhotoById(db, photoId) {
  return (await all(db, 'SELECT * FROM photos WHERE id = ?', [photoId]))[0] ?? null;
}

async function getChallengeById(db, challengeId) {
  return (await all(db, 'SELECT * FROM challenges WHERE id = ?', [challengeId]))[0] ?? null;
}

async function pickChallengePhotoForUser(db, userId) {
  // Bucket 2: contributions valid?es, pas prises par ce joueur, pas d?j? vues
  const rows = await all(
    db,
    `SELECT p.id, COALESCE(p.photoUrl, p.dataUrl) AS dataUrl
     FROM photos p
     WHERE p.category = 'contribution'
       AND p.status   = 'validated'
       AND (p.userId IS NULL OR p.userId != ?)
       AND NOT EXISTS (
         SELECT 1 FROM challenge_views v WHERE v.userId = ? AND v.photoId = p.id
       )`,
    [userId, userId]
  );
  if (!rows.length) return null;
  return rows[Math.floor(Math.random() * rows.length)];
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
    const cfg = MINIGAMES.timeGuess.scoring;
    let guessMinutes;
    if (payload.guessedTime) {
      const [h, m] = payload.guessedTime.split(':').map(Number);
      guessMinutes = h * 60 + m;
    } else if (payload.hour != null) {
      guessMinutes = payload.hour * 60 + (payload.minute ?? 0);
    } else return 0;
    const real = new Date(photo.createdAt);
    const realMinutes = real.getHours() * 60 + real.getMinutes();
    const rawDiff = Math.abs(guessMinutes - realMinutes);
    const diff = Math.min(rawDiff, 1440 - rawDiff); // diff circulaire (minuit)
    if (diff <= cfg.perfect) return cfg.maxPoints;
    return Math.max(0, Math.round(cfg.maxPoints * (1 - (diff - cfg.perfect) / (cfg.zero - cfg.perfect))));
  }
  if (type === 'geo-pin') {
    const cfg = MINIGAMES.geoPin.scoring;
    if (payload.lat == null || payload.lng == null) return 0;
    const loc = photo.location ? JSON.parse(photo.location) : null;
    if (!loc) return 0;
    const dist = haversineMeters(loc.lat, loc.lon ?? loc.lng, payload.lat, payload.lng);
    if (dist <= cfg.perfect) return cfg.maxPoints;
    return Math.max(0, Math.round(cfg.maxPoints * (1 - (dist - cfg.perfect) / (cfg.zero - cfg.perfect))));
  }
  return 300; // re-photo : score fixe
}

function formatRealTime(createdAtMs) {
  const d = new Date(createdAtMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// -- WEBSOCKET & SERVER ---------------------------------------

// -- SCORE & CLASSEMENT -------------------------------------------------------

// POST /api/admin/photos/:id/award-unbeaten ? +100 au soumetteur original (personne n'a trouv?)
app.post('/api/admin/photos/:id/award-unbeaten', requireAuth, requireDevAccess, async (req, res) => {
  const photoId = Number(req.params.id);
  if (!Number.isInteger(photoId) || photoId <= 0) {
    res.status(400).json({ error: 'Invalid photo id.' });
    return;
  }
  try {
    const db = await getDb();
    const photo = await getPhotoById(db, photoId);
    if (!photo) {
      res.status(404).json({ error: 'Photo not found.' });
      return;
    }
    if (photo.category !== 'contribution' || photo.status !== 'validated') {
      res.status(400).json({ error: 'Only validated contribution photos (bucket 2) can be awarded.' });
      return;
    }
    // Marquer la photo comme 'closed' (sort du bucket 2, ne sera plus servie)
    await run(db, "UPDATE photos SET status = 'closed' WHERE id = ?", [photoId]);

    // +100 pts au soumetteur original
    if (photo.userId) {
      await updateScore(db, photo.userId, 100);
      // Notification
      await run(db,
        'INSERT INTO notifications (userId, type, message, photoId, createdAt) VALUES (?, ?, ?, ?, ?)',
        [photo.userId, 'unbeaten',
         '?? Incroyable ! Personne n\'a trouve le lieu de ta photo. Tu gagnes 100 points !',
         photoId, Date.now()]
      );
    }
    res.json({ ok: true, photoId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard ? classement de tous les joueurs
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = await all(db,
      `SELECT username, score,
         ROW_NUMBER() OVER (ORDER BY score DESC) AS rank
       FROM users
       ORDER BY score DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/me/score ? score et rang du joueur connect?
app.get('/api/me/score', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const row = (await all(db,
      `SELECT score,
         (SELECT COUNT(*)::int + 1 FROM users u2 WHERE u2.score > u.score) AS rank
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    ))[0];
    if (!row) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ score: row.score, rank: row.rank });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- NOTIFICATIONS ---------------------------------------------------------

// GET /api/notifications  ? notifs du joueur connect?
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await all(db,
      `SELECT id, type, message, photoId, read, createdAt
       FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all  ? marquer tout comme lu
app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    await run(db, 'UPDATE notifications SET read = 1 WHERE userId = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read  ? marquer une notif comme lue
app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
  const notifId = Number(req.params.id);
  try {
    const db = await getDb();
    await run(db,
      'UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?',
      [notifId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/ws') {
      next();
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

function getHttpsConfig() {
  if (!useHttps) return null;
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error('HTTPS certificates not found. Run `npm run https:setup` first.');
  }
  return {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
}

const server = useHttps
  ? createHttpsServer(getHttpsConfig(), app)
  : createHttpServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

// Room-mayors and CTF routers need broadcast — mount them after broadcast is defined.
app.use(createRoomMayorsRouter({ broadcast }));
app.use(ctfRouter);

server.listen(PORT, () => {
  const protocol = useHttps ? 'https' : 'http';
  console.log(`Photo sync server listening on ${protocol}://localhost:${PORT}`);
  startCtfCron(broadcast);
});








