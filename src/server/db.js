import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  await run(_db, `CREATE TABLE IF NOT EXISTS photos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId  TEXT,
    createdAt INTEGER NOT NULL,
    width     INTEGER,
    height    INTEGER,
    type      TEXT    DEFAULT 'image/png',
    location  TEXT,
    dataUrl   TEXT    NOT NULL
  )`);

  // Défis journaliers : un lieu cible par jour
  await run(_db, `CREATE TABLE IF NOT EXISTS challenges (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT    NOT NULL UNIQUE,  -- YYYY-MM-DD
    locationId TEXT    NOT NULL,         -- id dans epfl-locations.js
    createdAt  INTEGER NOT NULL
  )`);

  // Soumissions : photos liées à un défi
  await run(_db, `CREATE TABLE IF NOT EXISTS submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    challengeId INTEGER NOT NULL REFERENCES challenges(id),
    photoId     INTEGER NOT NULL REFERENCES photos(id),
    clientId    TEXT,
    createdAt   INTEGER NOT NULL
  )`);

  // Réponses des joueurs aux mini-jeux
  await run(_db, `CREATE TABLE IF NOT EXISTS guesses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    photoId     INTEGER NOT NULL REFERENCES photos(id),
    clientId    TEXT,
    type        TEXT    NOT NULL,  -- 'geo-pin' | 'time-guess' | 're-photo'
    payload     TEXT    NOT NULL,  -- JSON de la réponse
    score       INTEGER,
    createdAt   INTEGER NOT NULL
  )`);

  return _db;
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
