import pg from 'pg';
import { hashPassword } from './auth.js';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let _db = null;
let _initPromise = null;

function createPool() {
  if (!DATABASE_URL) {
    throw new Error('Missing PostgreSQL connection string. Set DATABASE_URL in your environment.');
  }

  // Supabase/Render generally require SSL; local PostgreSQL often does not.
  const disableSsl = process.env.PG_DISABLE_SSL === '1' || process.env.PG_DISABLE_SSL === 'true';
  const useSsl = !disableSsl && !/localhost|127\.0\.0\.1/i.test(DATABASE_URL);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  return pool;
}

export async function getDb() {
  if (!_db) {
    _db = createPool();
  }
  if (!_initPromise) {
    _initPromise = initializeSchema(_db).catch((err) => {
      _initPromise = null;
      throw err;
    });
  }
  await _initPromise;
  return _db;
}

async function initializeSchema(db) {
  await run(db, `CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    username     TEXT    NOT NULL UNIQUE,
    passwordHash TEXT    NOT NULL,
    createdAt    BIGINT  NOT NULL,
    score        INTEGER NOT NULL DEFAULT 0
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS photos (
    id               SERIAL PRIMARY KEY,
    userId           INTEGER REFERENCES users(id),
    clientId         TEXT,
    createdAt        BIGINT  NOT NULL,
    width            INTEGER,
    height           INTEGER,
    type             TEXT    DEFAULT 'image/png',
    location         TEXT,
    dataUrl          TEXT,
    photoUrl         TEXT,
    storagePath      TEXT,
    category         TEXT    NOT NULL DEFAULT 'contribution',
    status           TEXT    NOT NULL DEFAULT 'pending',
    challengePhotoId INTEGER REFERENCES photos(id),
    photoReviewedBy  INTEGER REFERENCES users(id),
    photoReviewedAt  BIGINT,
    photoReviewNote  TEXT,
    floor            INTEGER,
    weeklySource     INTEGER DEFAULT 0
  )`);

  // Defis journaliers : un lieu cible par jour
  await run(db, `CREATE TABLE IF NOT EXISTS challenges (
    id         SERIAL PRIMARY KEY,
    date       TEXT    NOT NULL UNIQUE,
    locationId TEXT    NOT NULL,
    createdAt  BIGINT  NOT NULL
  )`);
  // Ligne sentinelle : cible FK stable pour les soumissions du defi de la semaine (challengeId=0)
  await run(db, `INSERT INTO challenges (id, date, locationId, createdAt)
                 VALUES (0, '__weekly__', '__weekly__', 0)
                 ON CONFLICT (id) DO NOTHING`);

  // Challenge requests already seen by each player.
  // Unique (userId, photoId) ensures the same photo is never served twice to a player.
  await run(db, `CREATE TABLE IF NOT EXISTS challenge_views (
    id         SERIAL PRIMARY KEY,
    userId     INTEGER NOT NULL REFERENCES users(id),
    photoId    INTEGER NOT NULL REFERENCES photos(id),
    servedDate TEXT    NOT NULL,
    createdAt  BIGINT  NOT NULL,
    UNIQUE(userId, photoId)
  )`);

  // Soumissions : photos liees a un defi
  await run(db, `CREATE TABLE IF NOT EXISTS submissions (
    id                SERIAL PRIMARY KEY,
    challengeId       INTEGER NOT NULL REFERENCES challenges(id),
    photoId           INTEGER NOT NULL REFERENCES photos(id),
    clientId          TEXT,
    playerId          TEXT,
    userId            INTEGER REFERENCES users(id),
    reviewStatus      TEXT    NOT NULL DEFAULT 'pending',
    reviewedBy        INTEGER REFERENCES users(id),
    reviewedAt        BIGINT,
    reviewNote        TEXT,
    createdAt         BIGINT  NOT NULL,
    weeklyChallengeId INTEGER
  )`);

  // Reponses des joueurs aux mini-jeux
  await run(db, `CREATE TABLE IF NOT EXISTS guesses (
    id          SERIAL PRIMARY KEY,
    photoId     INTEGER NOT NULL REFERENCES photos(id),
    clientId    TEXT,
    userId      INTEGER REFERENCES users(id),
    type        TEXT    NOT NULL,
    payload     TEXT    NOT NULL,
    score       INTEGER,
    createdAt   BIGINT  NOT NULL
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS notifications (
    id        SERIAL PRIMARY KEY,
    userId    INTEGER NOT NULL REFERENCES users(id),
    type      TEXT    NOT NULL,
    message   TEXT    NOT NULL,
    photoId   INTEGER REFERENCES photos(id),
    read      INTEGER NOT NULL DEFAULT 0,
    createdAt BIGINT  NOT NULL
  )`);

  // Defis de la semaine : un defi actif a la fois (active=1)
  await run(db, `CREATE TABLE IF NOT EXISTS weekly_challenges (
    id               SERIAL PRIMARY KEY,
    type             TEXT        NOT NULL DEFAULT 'location_only',
    locationId       TEXT        NOT NULL,
    locationLabel    TEXT,
    referenceDataUrl TEXT,
    active           INTEGER     NOT NULL DEFAULT 0,
    createdAt        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  // Maire de la Salle - periodes actives et archivees
  await run(db, `CREATE TABLE IF NOT EXISTS room_mayors (
    id               SERIAL PRIMARY KEY,
    locationId       TEXT    NOT NULL,
    userId           INTEGER NOT NULL REFERENCES users(id),
    claimedAt        BIGINT  NOT NULL,
    protectionEndsAt BIGINT  NOT NULL,
    active           INTEGER NOT NULL DEFAULT 1,
    photoId          INTEGER REFERENCES photos(id),
    adminReviewed    INTEGER NOT NULL DEFAULT 0,
    renewalDeadline  BIGINT,
    renewalAllowedAt BIGINT
  )`);

  // Temps cumule par joueur par lieu (toutes periodes)
  await run(db, `CREATE TABLE IF NOT EXISTS room_mayor_totals (
    id           SERIAL PRIMARY KEY,
    locationId   TEXT    NOT NULL,
    userId       INTEGER NOT NULL REFERENCES users(id),
    totalSeconds INTEGER NOT NULL DEFAULT 0,
    UNIQUE(locationId, userId)
  )`);

  // Signalements joueurs sur une periode de maire
  await run(db, `CREATE TABLE IF NOT EXISTS room_mayor_reports (
    id          SERIAL PRIMARY KEY,
    mayorId     INTEGER NOT NULL REFERENCES room_mayors(id),
    reportedBy  INTEGER NOT NULL REFERENCES users(id),
    reportedAt  BIGINT  NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending',
    UNIQUE(mayorId, reportedBy)
  )`);

  // Positions et noms personnalises pour les lieux (admin)
  await run(db, `CREATE TABLE IF NOT EXISTS location_overrides (
    locationId TEXT PRIMARY KEY,
    label      TEXT,
    lat        DOUBLE PRECISION,
    lng        DOUBLE PRECISION,
    updatedAt  BIGINT NOT NULL
  )`);

  // Migrations idempotentes (anciennes schemas)
  await run(db, "ALTER TABLE photos ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'contribution'");
  await run(db, "ALTER TABLE photos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'");
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS photoUrl TEXT');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS storagePath TEXT');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS challengePhotoId INTEGER REFERENCES photos(id)');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS photoReviewedBy INTEGER REFERENCES users(id)');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS photoReviewedAt BIGINT');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS photoReviewNote TEXT');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS userId INTEGER REFERENCES users(id)');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS floor INTEGER');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS weeklySource INTEGER DEFAULT 0');
  await run(db, 'ALTER TABLE photos ALTER COLUMN dataUrl DROP NOT NULL');

  await run(db, 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS playerId TEXT');
  await run(db, 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS userId INTEGER REFERENCES users(id)');
  await run(db, "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewStatus TEXT NOT NULL DEFAULT 'pending'");
  await run(db, 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewedBy INTEGER REFERENCES users(id)');
  await run(db, 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewedAt BIGINT');
  await run(db, 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewNote TEXT');
  await run(db, 'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS weeklyChallengeId INTEGER');

  await run(db, 'ALTER TABLE guesses ADD COLUMN IF NOT EXISTS userId INTEGER REFERENCES users(id)');
  await run(db, 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS photoId INTEGER REFERENCES photos(id)');

  await run(db, 'ALTER TABLE users ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0');

  await run(db, 'ALTER TABLE room_mayors ADD COLUMN IF NOT EXISTS adminReviewed INTEGER NOT NULL DEFAULT 0');
  await run(db, 'ALTER TABLE room_mayors ADD COLUMN IF NOT EXISTS renewalDeadline BIGINT');
  await run(db, 'ALTER TABLE room_mayors ADD COLUMN IF NOT EXISTS renewalAllowedAt BIGINT');

  // CTF tables
  await run(db, `CREATE TABLE IF NOT EXISTS teams (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    color TEXT NOT NULL
  )`);
  await run(db, `INSERT INTO teams (id, name, color) VALUES ('rouge', 'Rouge', '#e74c3c') ON CONFLICT (id) DO NOTHING`);
  await run(db, `INSERT INTO teams (id, name, color) VALUES ('bleu', 'Bleu', '#3498db') ON CONFLICT (id) DO NOTHING`);
  await run(db, `INSERT INTO teams (id, name, color) VALUES ('vert', 'Vert', '#2ecc71') ON CONFLICT (id) DO NOTHING`);

  await run(db, `CREATE TABLE IF NOT EXISTS ctf_team_scores (
    id         SERIAL  PRIMARY KEY,
    teamId     TEXT    NOT NULL REFERENCES teams(id),
    points     INTEGER NOT NULL,
    reason     TEXT    NOT NULL,
    locationId TEXT,
    awardedAt  BIGINT  NOT NULL
  )`);

  await run(db, 'ALTER TABLE users ADD COLUMN IF NOT EXISTS teamId TEXT REFERENCES teams(id)');
  await run(db, 'ALTER TABLE photos ADD COLUMN IF NOT EXISTS locationId TEXT');

  await run(db, `CREATE TABLE IF NOT EXISTS ctf_player_scores (
    id         SERIAL  PRIMARY KEY,
    userId     INTEGER NOT NULL REFERENCES users(id),
    points     INTEGER NOT NULL,
    reason     TEXT    NOT NULL,
    locationId TEXT,
    awardedAt  BIGINT  NOT NULL
  )`);

  await ensureAdminAccount(db);
}

// -- Score helpers -------------------------------------------------------------

export async function updateScore(db, userId, delta) {
  if (!userId || !delta) return;
  await run(db,
    'UPDATE users SET score = GREATEST(0, score + $1) WHERE id = $2',
    [delta, userId]
  );
}

async function ensureAdminAccount(db) {
  const username = 'admin';
  const passwordHash = await hashPassword('12345678');
  const legacyRows = await all(db, 'SELECT id FROM users WHERE username = $1', ['dev']);
  const rows = await all(db, 'SELECT id FROM users WHERE username = $1', [username]);
  if (rows.length === 0 && legacyRows.length > 0) {
    await run(db, 'UPDATE users SET username = $1 WHERE username = $2', [username, 'dev']);
  }
  const ensuredRows = await all(db, 'SELECT id FROM users WHERE username = $1', [username]);
  if (ensuredRows.length === 0) {
    await run(
      db,
      'INSERT INTO users (username, passwordHash, createdAt) VALUES ($1, $2, $3)',
      [username, passwordHash, Date.now()]
    );
    return;
  }
  await run(db, 'UPDATE users SET passwordHash = $1 WHERE username = $2', [passwordHash, username]);
}

function convertQMarksToPgPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function normalizeQuery(sql, params) {
  const normalizedSql = sql.includes('?') ? convertQMarksToPgPlaceholders(sql) : sql;
  return {
    sql: normalizedSql,
    params,
  };
}

const LEGACY_CAMEL_CASE_FIELDS = [
  'adminReviewed',
  'awardedAt',
  'challengeDataUrl',
  'challengeFloor',
  'challengeId',
  'challengeLocation',
  'challengeLocationId',
  'challengePhotoId',
  'challengeSubmitterUsername',
  'clientId',
  'createdAt',
  'locationId',
  'locationLabel',
  'mayorId',
  'mayorUserId',
  'mayorUsername',
  'passwordHash',
  'photoDataUrl',
  'photoId',
  'photoReviewedAt',
  'photoReviewedBy',
  'photoReviewNote',
  'photoUrl',
  'playerId',
  'protectionEndsAt',
  'referenceDataUrl',
  'renewalAllowedAt',
  'renewalDeadline',
  'reportedAt',
  'reportedBy',
  'reviewedAt',
  'reviewedBy',
  'reviewedByUsername',
  'reviewNote',
  'reviewStatus',
  'servedDate',
  'submitterUserId',
  'submitterUsername',
  'storagePath',
  'totalSeconds',
  'updatedAt',
  'userId',
  'teamId',
  'weeklySource',
  'weeklyChallengeId',
];

const DEFAULT_CASE_MAP = new Map(
  LEGACY_CAMEL_CASE_FIELDS.map((field) => [field.toLowerCase(), field])
);

function extractAliasCaseMap(sql) {
  const aliasMap = new Map();
  const aliasRegex = /\bAS\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;
  let match = aliasRegex.exec(sql);
  while (match) {
    const alias = match[1];
    aliasMap.set(alias.toLowerCase(), alias);
    match = aliasRegex.exec(sql);
  }
  return aliasMap;
}

function remapRowKeyCasing(sql, row) {
  if (!row || typeof row !== 'object') return row;

  const aliasMap = extractAliasCaseMap(sql);
  const remapped = {};

  for (const [key, value] of Object.entries(row)) {
    const targetKey = aliasMap.get(key) || DEFAULT_CASE_MAP.get(key) || key;
    remapped[targetKey] = value;
  }

  return remapped;
}

function withInsertReturningId(sql) {
  if (!/^\s*insert\b/i.test(sql)) return { sql, appended: false };
  if (/\breturning\b/i.test(sql)) return { sql, appended: false };
  return { sql: `${sql} RETURNING id`, appended: true };
}

export async function run(db, sql, params = []) {
  const normalized = normalizeQuery(sql, params);
  const maybeReturning = withInsertReturningId(normalized.sql);

  try {
    const result = await db.query(maybeReturning.sql, normalized.params);
    return {
      lastID: result.rows?.[0]?.id ?? null,
      changes: result.rowCount ?? 0,
    };
  } catch (err) {
    // Some inserts target tables where PK isn't named "id" (e.g. location_overrides).
    // Retry once without auto RETURNING id.
    if (maybeReturning.appended && err?.code === '42703') {
      const result = await db.query(normalized.sql, normalized.params);
      return {
        lastID: result.rows?.[0]?.id ?? null,
        changes: result.rowCount ?? 0,
      };
    }
    throw err;
  }
}

export async function all(db, sql, params = []) {
  const normalized = normalizeQuery(sql, params);
  const result = await db.query(normalized.sql, normalized.params);
  return result.rows.map((row) => remapRowKeyCasing(normalized.sql, row));
}
