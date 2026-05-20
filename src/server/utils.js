// Shared server-side helper functions extracted from index.js.
// Imported by index.js and route modules so logic stays in one place.

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getDb, run, all } from './db.js';
import { EPFL_LOCATIONS } from '../../game/epfl-locations.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'photos';

export function requireDevAccess(req, res, next) {
  if (req.user?.username !== 'admin') {
    res.status(403).json({ error: 'Admin access denied.' });
    return;
  }
  next();
}

export function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let _supabaseAdmin = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Storage upload is not configured.');
  }
  _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseAdmin;
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function getPhotoExtension(mimeType = 'image/png') {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return map[mimeType.toLowerCase()] ?? 'bin';
}

export async function uploadPhotoToStorage(
  dataUrl,
  { userId, category = 'photo', createdAt = Date.now(), locationId } = {}
) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error('Invalid image payload. Expected a base64 data URL.');
  }

  const fileBuffer = Buffer.from(parsed.base64, 'base64');
  const extension = getPhotoExtension(parsed.mimeType);
  const groupingKey = category === 'mayor'
    ? String(locationId ?? 'unknown-room')
    : String(userId ?? 'anon');
  const storagePath = `${category}/${groupingKey}/${createdAt}-${randomUUID()}.${extension}`;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: parsed.mimeType,
      upsert: false,
      cacheControl: '31536000',
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);
  const photoUrl = data?.publicUrl ?? null;
  if (!photoUrl) {
    throw new Error('Storage upload succeeded but public URL could not be resolved.');
  }
  return { photoUrl, storagePath };
}

export async function expireDeadlinedMayors(db) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expired = await all(db,
    `SELECT id, locationId, userId, claimedAt FROM room_mayors
     WHERE active = 1 AND renewalDeadline IS NOT NULL AND renewalDeadline < ?`,
    [nowSeconds]
  );
  for (const m of expired) {
    await run(db, 'UPDATE room_mayors SET active = 0 WHERE id = ?', [m.id]);
    const elapsed = nowSeconds - m.claimedAt;
    await run(db,
      `INSERT INTO room_mayor_totals (locationId, userId, totalSeconds) VALUES (?, ?, ?)
       ON CONFLICT(locationId, userId) DO UPDATE SET totalSeconds = totalSeconds + excluded.totalSeconds`,
      [m.locationId, m.userId, elapsed]
    );
    const locLabel = EPFL_LOCATIONS.find(l => l.id === m.locationId)?.label ?? m.locationId;
    await run(db,
      'INSERT INTO notifications (userId, type, message, read, createdAt) VALUES (?, ?, ?, 0, ?)',
      [m.userId, 'mayor_expired',
       `Tu as perdu le titre de maire de "${locLabel}" — photo non renouvelee dans les 15h. La salle est redevenue libre.`,
       Date.now()]
    );
  }
}

export async function buildLabelResolver(db) {
  const rows = await all(db, 'SELECT locationId, label FROM location_overrides', []);
  const map = new Map(rows.map(r => [r.locationId, r.label]));
  return (id) => map.get(id) ?? EPFL_LOCATIONS.find(l => l.id === id)?.label ?? id;
}
