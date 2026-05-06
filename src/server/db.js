import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { hashPassword } from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/photos.db');

// Wrap sqlite3 callbacks in promises
function openDb(path) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(path, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

let _db = null;

export async function getDb() {
  if (_db) return _db;
  _db = await openDb(DB_PATH);

  await run(_db, `CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    NOT NULL UNIQUE,
    passwordHash TEXT    NOT NULL,
    createdAt    INTEGER NOT NULL
  )`);

  await run(_db, `CREATE TABLE IF NOT EXISTS photos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    userId           INTEGER REFERENCES users(id),
    clientId         TEXT,
    createdAt        INTEGER NOT NULL,
    width            INTEGER,
    height           INTEGER,
    type             TEXT    DEFAULT 'image/png',
    location         TEXT,
    dataUrl          TEXT    NOT NULL,
    category         TEXT    NOT NULL DEFAULT 'contribution',
    status           TEXT    NOT NULL DEFAULT 'pending',
    challengePhotoId INTEGER REFERENCES photos(id),
    photoReviewedBy  INTEGER REFERENCES users(id),
    photoReviewedAt  INTEGER,
    photoReviewNote  TEXT
  )`);

  // Defis journaliers : un lieu cible par jour
  await run(_db, `CREATE TABLE IF NOT EXISTS challenges (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT    NOT NULL UNIQUE,
    locationId TEXT    NOT NULL,
    createdAt  INTEGER NOT NULL
  )`);
  // Ligne sentinelle : cible FK stable pour les soumissions du defi de la semaine (challengeId=0)
  await run(_db, `INSERT OR IGNORE INTO challenges (id, date, locationId, createdAt) VALUES (0, '__weekly__', '__weekly__', 0)`);

  // Challenge requests already seen by each player.
  // Unique (userId, photoId) ensures the same photo is never served twice to a player.
  await run(_db, `CREATE TABLE IF NOT EXISTS challenge_views (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    userId     INTEGER NOT NULL REFERENCES users(id),
    photoId    INTEGER NOT NULL REFERENCES photos(id),
    servedDate TEXT    NOT NULL,
    createdAt  INTEGER NOT NULL,
    UNIQUE(userId, photoId)
  )`);

  // Soumissions : photos liees a un defi
  await run(_db, `CREATE TABLE IF NOT EXISTS submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    challengeId  INTEGER NOT NULL REFERENCES challenges(id),
    photoId      INTEGER NOT NULL REFERENCES photos(id),
    clientId     TEXT,
    playerId     TEXT,
    userId       INTEGER REFERENCES users(id),
    reviewStatus TEXT    NOT NULL DEFAULT 'pending',
    reviewedBy   INTEGER REFERENCES users(id),
    reviewedAt   INTEGER,
    reviewNote   TEXT,
    createdAt    INTEGER NOT NULL
  )`);

  // Migrations souples — nouvelles colonnes photos (4-bucket system)
  try {
    await run(_db, "ALTER TABLE photos ADD COLUMN category TEXT NOT NULL DEFAULT 'contribution'");
  } catch {}
  try {
    await run(_db, "ALTER TABLE photos ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
  } catch {}
  try {
    await run(_db, 'ALTER TABLE photos ADD COLUMN challengePhotoId INTEGER REFERENCES photos(id)');
  } catch {}
  try {
    await run(_db, 'ALTER TABLE photos ADD COLUMN photoReviewedBy INTEGER REFERENCES users(id)');
  } catch {}
  try {
    await run(_db, 'ALTER TABLE photos ADD COLUMN photoReviewedAt INTEGER');
  } catch {}
  try {
    await run(_db, 'ALTER TABLE photos ADD COLUMN photoReviewNote TEXT');
  } catch {}

  // Migrations souples pour les anciennes bases
  try {
    await run(_db, 'ALTER TABLE submissions ADD COLUMN playerId TEXT');
  } catch {}
  try {
    await run(_db, 'ALTER TABLE submissions ADD COLUMN userId INTEGER REFERENCES users(id)');
  } catch {}
  try {
    await run(_db, "ALTER TABLE submissions ADD COLUMN reviewStatus TEXT NOT NULL DEFAULT 'pending'");
  } catch {}
  try {
    await run(_db, 'ALTER TABLE submissions ADD COLUMN reviewedBy INTEGER REFERENCES users(id)');
  } catch {}
  try {
    await run(_db, 'ALTER TABLE submissions ADD COLUMN reviewedAt INTEGER');
  } catch {}
  try {
    await run(_db, 'ALTER TABLE submissions ADD COLUMN reviewNote TEXT');
  } catch {}
  try {
    await run(_db, 'ALTER TABLE photos ADD COLUMN userId INTEGER REFERENCES users(id)');
  } catch {}

  // Reponses des joueurs aux mini-jeux
  await run(_db, `CREATE TABLE IF NOT EXISTS guesses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    photoId     INTEGER NOT NULL REFERENCES photos(id),
    clientId    TEXT,
    userId      INTEGER REFERENCES users(id),
    type        TEXT    NOT NULL,
    payload     TEXT    NOT NULL,
    score       INTEGER,
    createdAt   INTEGER NOT NULL
  )`);
  try {
    await run(_db, 'ALTER TABLE guesses ADD COLUMN userId INTEGER REFERENCES users(id)');
  } catch {}

  await run(_db, `CREATE TABLE IF NOT EXISTS notifications (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL REFERENCES users(id),
    type      TEXT    NOT NULL,
    message   TEXT    NOT NULL,
    photoId   INTEGER REFERENCES photos(id),
    read      INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL
  )`);

  try {
    await run(_db, 'ALTER TABLE notifications ADD COLUMN photoId INTEGER REFERENCES photos(id)');
  } catch {}

  // Colonne score sur users
  try {
    await run(_db, 'ALTER TABLE users ADD COLUMN score INTEGER NOT NULL DEFAULT 0');
  } catch {}

  // Colonne étage sur photos
  try {
    await run(_db, 'ALTER TABLE photos ADD COLUMN floor INTEGER');
  } catch {}

  // Defis de la semaine : un defi actif a la fois (active=1)
  await run(_db, `CREATE TABLE IF NOT EXISTS weekly_challenges (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    type             TEXT    NOT NULL DEFAULT 'location_only',
    locationId       TEXT    NOT NULL,
    locationLabel    TEXT,
    referenceDataUrl TEXT,
    active           INTEGER NOT NULL DEFAULT 0,
    createdAt        TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  // Migrations souples — colonnes defi de la semaine
  try {
    await run(_db, 'ALTER TABLE submissions ADD COLUMN weeklyChallengeId INTEGER');
  } catch {}
  try {
    await run(_db, 'ALTER TABLE photos ADD COLUMN weeklySource INTEGER DEFAULT 0');
  } catch {}

  // Maire de la Salle — periodes actives et archivees
  await run(_db, `CREATE TABLE IF NOT EXISTS room_mayors (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    locationId       TEXT    NOT NULL,
    userId           INTEGER NOT NULL REFERENCES users(id),
    claimedAt        INTEGER NOT NULL,
    protectionEndsAt INTEGER NOT NULL,
    active           INTEGER NOT NULL DEFAULT 1,
    photoId          INTEGER REFERENCES photos(id)
  )`);

  // Temps cumule par joueur par lieu (toutes periodes)
  await run(_db, `CREATE TABLE IF NOT EXISTS room_mayor_totals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    locationId   TEXT    NOT NULL,
    userId       INTEGER NOT NULL REFERENCES users(id),
    totalSeconds INTEGER NOT NULL DEFAULT 0,
    UNIQUE(locationId, userId)
  )`);

  // Signalements joueurs sur une periode de maire
  await run(_db, `CREATE TABLE IF NOT EXISTS room_mayor_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    mayorId     INTEGER NOT NULL REFERENCES room_mayors(id),
    reportedBy  INTEGER NOT NULL REFERENCES users(id),
    reportedAt  INTEGER NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending',
    UNIQUE(mayorId, reportedBy)
  )`);

  // Colonne admin review sur room_mayors
  try {
    await run(_db, 'ALTER TABLE room_mayors ADD COLUMN adminReviewed INTEGER NOT NULL DEFAULT 0');
  } catch {}

  // Positions et noms personnalisés pour les lieux (admin)
  await run(_db, `CREATE TABLE IF NOT EXISTS location_overrides (
    locationId TEXT PRIMARY KEY,
    label      TEXT,
    lat        REAL,
    lng        REAL,
    updatedAt  INTEGER NOT NULL
  )`);

  await ensureDevAccount(_db);

  return _db;
}

// ── Score helpers ─────────────────────────────────────────────────────────────

export async function updateScore(db, userId, delta) {
  if (!userId || !delta) return;
  await run(db,
    'UPDATE users SET score = MAX(0, score + ?) WHERE id = ?',
    [delta, userId]
  );
}

async function ensureDevAccount(db) {
  const username = 'dev';
  const passwordHash = await hashPassword('12345678');
  const rows = await all(db, 'SELECT id FROM users WHERE username = ?', [username]);
  if (rows.length === 0) {
    await run(
      db,
      'INSERT INTO users (username, passwordHash, createdAt) VALUES (?, ?, ?)',
      [username, passwordHash, Date.now()]
    );
    return;
  }
  await run(db, 'UPDATE users SET passwordHash = ? WHERE username = ?', [passwordHash, username]);
}

export function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
