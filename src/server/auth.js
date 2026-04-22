import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 7 * 24 * 60 * 60 * 1000);

export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
  return await bcrypt.compare(password, passwordHash);
}

function normalizeSessionUser(user) {
  return {
    id: Number(user.id),
    username: user.username
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function createUserSession(req, user) {
  await regenerateSession(req);
  req.session.user = normalizeSessionUser(user);
  await saveSession(req);
}

export function requireAuth(req, res, next) {
  const user = req.session?.user;
  if (!user || !Number.isFinite(Number(user.id)) || typeof user.username !== 'string') {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  req.user = normalizeSessionUser(user);
  next();
}

export function destroyUserSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.destroy((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export function getSessionConfig() {
  return {
    expiresInMs: SESSION_TTL_MS
  };
}
