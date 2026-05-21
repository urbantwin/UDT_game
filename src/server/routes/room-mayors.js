// Pure extraction of all room-mayors route handlers from index.js.
// Zero behavior change — only dependency wiring updated to use utils.js.

import express from 'express';
import { getDb, run, all, updateScore } from '../db.js';
import { requireAuth } from '../auth.js';
import {
  requireDevAccess,
  haversineMeters,
  uploadPhotoToStorage,
  deletePhotoFromStorage,
  expireDeadlinedMayors,
  buildLabelResolver,
} from '../utils.js';
import { EPFL_LOCATIONS } from '../../../game/epfl-locations.js';
import {
  ROOM_MAYOR_PROTECTION_SECONDS,
  ROOM_MAYOR_RENEWAL_DEADLINE_SECONDS,
  ROOM_MAYOR_RENEWAL_COOLDOWN_SECONDS,
  CTF_SCORING,
} from '../../../game/game-config.js';

export default function createRoomMayorsRouter({ broadcast }) {
  const router = express.Router();

  // GET /api/room-mayors
  router.get('/api/room-mayors', async (_req, res) => {
    try {
      const db = await getDb();
      await expireDeadlinedMayors(db);
      const getLabel = await buildLabelResolver(db);
      const results = await Promise.all(EPFL_LOCATIONS.map(async (loc) => {
        const mayor = (await all(db,
          `SELECT rm.id AS mayorId, rm.userId, rm.protectionEndsAt,
                  rm.renewalDeadline, rm.renewalAllowedAt,
                  u.username, COALESCE(p.photoUrl, p.dataUrl) AS photoDataUrl
           FROM room_mayors rm
           JOIN users u ON u.id = rm.userId
           LEFT JOIN photos p ON p.id = rm.photoId
           WHERE rm.locationId = ? AND rm.active = 1 LIMIT 1`,
          [loc.id]
        ))[0] ?? null;

        let pendingReports = 0;
        if (mayor) {
          const rep = (await all(db,
            `SELECT COUNT(*)::int AS cnt FROM room_mayor_reports WHERE mayorId = $1 AND status = 'pending'`,
            [mayor.mayorId]
          ))[0];
          pendingReports = rep?.cnt ?? 0;
        }

        const leaderboard = await all(db,
          `SELECT rmt.userId, rmt.totalSeconds, u.username
           FROM room_mayor_totals rmt JOIN users u ON u.id = rmt.userId
           WHERE rmt.locationId = ? ORDER BY rmt.totalSeconds DESC LIMIT 3`,
          [loc.id]
        );

        return {
          locationId: loc.id,
          locationLabel: getLabel(loc.id),
          mayor: mayor ? {
            userId: mayor.userId,
            username: mayor.username,
            mayorId: mayor.mayorId,
            photoDataUrl: mayor.photoDataUrl ?? null,
            pendingReports,
            renewalDeadline: mayor.renewalDeadline ?? null,
            renewalAllowedAt: mayor.renewalAllowedAt ?? null,
          } : null,
          protectionEndsAt: mayor ? mayor.protectionEndsAt : null,
          leaderboard,
        };
      }));
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/me/king-stats
  router.get('/api/me/king-stats', requireAuth, async (req, res) => {
    try {
      const db = await getDb();
      const nowSeconds = Math.floor(Date.now() / 1000);

      const lastMayor = (await all(db,
        `SELECT rm.locationId, rm.claimedAt
         FROM room_mayors rm WHERE rm.userId = ?
         ORDER BY rm.claimedAt DESC LIMIT 1`,
        [req.user.id]
      ))[0];

      if (!lastMayor) return res.json({ lastRoom: null });

      const getLabel = await buildLabelResolver(db);

      const activeMayor = (await all(db,
        'SELECT userId, claimedAt, renewalDeadline, renewalAllowedAt FROM room_mayors WHERE locationId = ? AND active = 1 LIMIT 1',
        [lastMayor.locationId]
      ))[0];
      const isMayor = activeMayor?.userId === req.user.id;

      const totalRecord = (await all(db,
        'SELECT totalSeconds FROM room_mayor_totals WHERE locationId = ? AND userId = ?',
        [lastMayor.locationId, req.user.id]
      ))[0];
      let myTotalSeconds = totalRecord?.totalSeconds ?? 0;
      if (isMayor && activeMayor?.claimedAt) {
        myTotalSeconds += nowSeconds - activeMayor.claimedAt;
      }

      const allTotals = await all(db,
        'SELECT userId FROM room_mayor_totals WHERE locationId = ? ORDER BY totalSeconds DESC',
        [lastMayor.locationId]
      );
      const rank = allTotals.findIndex(r => r.userId === req.user.id) + 1;

      res.json({
        lastRoom: {
          locationId: lastMayor.locationId,
          locationLabel: getLabel(lastMayor.locationId),
          myTotalSeconds,
          myRank: rank > 0 ? rank : null,
          isMayor,
          totalPlayers: allTotals.length,
          renewalDeadline:  isMayor ? (activeMayor?.renewalDeadline ?? null)  : null,
          renewalAllowedAt: isMayor ? (activeMayor?.renewalAllowedAt ?? null) : null,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/room-mayors/claim
  router.post('/api/room-mayors/claim', requireAuth, async (req, res) => {
    const { locationId, dataUrl, location, width, height, type, createdAt, clientId, floor } = req.body || {};
    if (!locationId || !dataUrl || !location) {
      res.status(400).json({ error: 'locationId, dataUrl et location sont requis.' });
      return;
    }
    const epflLoc = EPFL_LOCATIONS.find(l => l.id === locationId);
    if (!epflLoc) {
      res.status(400).json({ error: 'locationId inconnu.' });
      return;
    }
    const playerLat = location?.lat;
    const playerLon = location?.lon ?? location?.lng;
    if (!Number.isFinite(playerLat) || !Number.isFinite(playerLon)) {
      res.status(400).json({ error: 'Coordonnees GPS invalides.' });
      return;
    }
    const isAdmin = req.user.username === 'admin';
    if (!isAdmin) {
      const dist = haversineMeters(epflLoc.lat, epflLoc.lng, playerLat, playerLon);
      if (dist > 25) {
        res.status(403).json({ error: `Position fausse. Tu es a ${Math.round(dist)} m du lieu (maximum 25 m).` });
        return;
      }
    }

    try {
      const db = await getDb();
      const nowSeconds = Math.floor(Date.now() / 1000);
      await expireDeadlinedMayors(db);

      const activeMayor = (await all(db,
        'SELECT id, userId, claimedAt, protectionEndsAt, renewalAllowedAt FROM room_mayors WHERE locationId = ? AND active = 1 LIMIT 1',
        [locationId]
      ))[0] ?? null;

      if (activeMayor && activeMayor.userId === req.user.id) {
        if (activeMayor.renewalAllowedAt && nowSeconds < activeMayor.renewalAllowedAt) {
          const waitSecs = activeMayor.renewalAllowedAt - nowSeconds;
          const waitH = Math.floor(waitSecs / 3600);
          const waitM = Math.floor((waitSecs % 3600) / 60);
          const waitStr = waitH > 0 ? `${waitH}h ${waitM}min` : `${waitM} min`;
          return res.status(429).json({ error: `Tu pourras renouveler ta photo dans ${waitStr}.` });
        }
        const newRenewalDeadline  = nowSeconds + ROOM_MAYOR_RENEWAL_DEADLINE_SECONDS;
        const newRenewalAllowedAt = nowSeconds + ROOM_MAYOR_RENEWAL_COOLDOWN_SECONDS;
        await run(db,
          'UPDATE room_mayors SET protectionEndsAt = ?, renewalDeadline = ?, renewalAllowedAt = ? WHERE id = ?',
          [nowSeconds + ROOM_MAYOR_PROTECTION_SECONDS, newRenewalDeadline, newRenewalAllowedAt, activeMayor.id]
        );
        const upload = await uploadPhotoToStorage(dataUrl, {
          userId: req.user.id,
          category: 'mayor',
          createdAt: createdAt ?? Date.now(),
          locationId,
        });
        const photoResult = await run(db,
          `INSERT INTO photos (userId, clientId, createdAt, width, height, type, location, dataUrl, photoUrl, storagePath, locationId, category, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'contribution', 'validated')`,
          [req.user.id, clientId ?? null, createdAt ?? Date.now(),
           width ?? null, height ?? null, type ?? 'image/png',
           JSON.stringify(location), null, upload.photoUrl, upload.storagePath, locationId]
        );
        await run(db, 'UPDATE room_mayors SET photoId = ? WHERE id = ?', [photoResult.lastID, activeMayor.id]);
        return res.status(201).json({
          locationId,
          protectionEndsAt: nowSeconds + ROOM_MAYOR_PROTECTION_SECONDS,
          renewalDeadline: newRenewalDeadline,
          mayorUsername: req.user.username,
        });
      }

      if (activeMayor && nowSeconds < activeMayor.protectionEndsAt) {
        const endsDate = new Date(activeMayor.protectionEndsAt * 1000);
        const hh = String(endsDate.getHours()).padStart(2, '0');
        const mm = String(endsDate.getMinutes()).padStart(2, '0');
        res.status(409).json({ error: `Ce lieu est protege jusqu'a ${hh}:${mm}.` });
        return;
      }

      if (activeMayor) {
        await run(db, 'UPDATE room_mayors SET active = 0 WHERE id = ?', [activeMayor.id]);
        const elapsed = nowSeconds - activeMayor.claimedAt;
        await run(db,
          `INSERT INTO room_mayor_totals (locationId, userId, totalSeconds) VALUES (?, ?, ?)
           ON CONFLICT(locationId, userId) DO UPDATE SET totalSeconds = room_mayor_totals.totalSeconds + excluded.totalSeconds`,
          [locationId, activeMayor.userId, elapsed]
        );
      }

      const upload = await uploadPhotoToStorage(dataUrl, {
        userId: req.user.id,
        category: 'mayor',
        createdAt: createdAt ?? Date.now(),
        locationId,
      });
      const photoResult = await run(db,
        `INSERT INTO photos (userId, clientId, createdAt, width, height, type, location, dataUrl, photoUrl, storagePath, locationId, category, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'contribution', 'validated')`,
        [req.user.id, clientId ?? null, createdAt ?? Date.now(),
         width ?? null, height ?? null, type ?? 'image/png',
         JSON.stringify(location), null, upload.photoUrl, upload.storagePath, locationId]
      );
      const photoId = photoResult.lastID;
      const renewalDeadline  = nowSeconds + ROOM_MAYOR_RENEWAL_DEADLINE_SECONDS;
      const renewalAllowedAt = nowSeconds + ROOM_MAYOR_RENEWAL_COOLDOWN_SECONDS;

      await run(db,
        `INSERT INTO room_mayors (locationId, userId, claimedAt, protectionEndsAt, active, photoId, renewalDeadline, renewalAllowedAt)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
        [locationId, req.user.id, nowSeconds, nowSeconds + ROOM_MAYOR_PROTECTION_SECONDS, photoId, renewalDeadline, renewalAllowedAt]
      );

      res.status(201).json({
        locationId,
        protectionEndsAt: nowSeconds + ROOM_MAYOR_PROTECTION_SECONDS,
        renewalDeadline,
        mayorUsername: req.user.username,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/room-mayors/:mayorId/report
  router.post('/api/room-mayors/:mayorId/report', requireAuth, async (req, res) => {
    const mayorId = parseInt(req.params.mayorId, 10);
    if (!Number.isInteger(mayorId) || mayorId <= 0) {
      res.status(400).json({ error: 'mayorId invalide.' });
      return;
    }
    try {
      const db = await getDb();
      const mayor = (await all(db,
        'SELECT id, userId, locationId FROM room_mayors WHERE id = ? AND active = 1',
        [mayorId]
      ))[0];
      if (!mayor) {
        res.status(404).json({ error: 'Periode de maire introuvable ou inactive.' });
        return;
      }
      if (mayor.userId === req.user.id) {
        res.status(403).json({ error: 'Vous ne pouvez pas signaler votre propre periode.' });
        return;
      }
      try {
        await run(db,
          'INSERT INTO room_mayor_reports (mayorId, reportedBy, reportedAt, status) VALUES (?, ?, ?, ?)',
          [mayorId, req.user.id, Date.now(), 'pending']
        );
      } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT' || e.code === '23505') {
          res.status(409).json({ error: 'Vous avez deja signale ce maire.' });
          return;
        }
        throw e;
      }
      const locLabel = EPFL_LOCATIONS.find(l => l.id === mayor.locationId)?.label ?? mayor.locationId;
      const admin = (await all(db, "SELECT id FROM users WHERE username = 'admin' LIMIT 1"))[0];
      if (admin) {
        await run(db,
          `INSERT INTO notifications (userId, type, message, read, createdAt) VALUES (?, ?, ?, 0, ?)`,
          [admin.id, 'mayor_report',
           `Signalement : ${req.user.username} a signale le maire de "${locLabel}".`,
           Date.now()]
        );
      }
      res.json({ reported: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/room-mayors/pending
  router.get('/api/admin/room-mayors/pending', requireAuth, requireDevAccess, async (req, res) => {
    try {
      const db = await getDb();
      const rows = await all(db,
        `SELECT rm.id AS mayorId, rm.locationId, rm.claimedAt, rm.protectionEndsAt,
                u.username, COALESCE(p.photoUrl, p.dataUrl) AS photoDataUrl, p.location AS photoLocation
         FROM room_mayors rm
         JOIN users u ON u.id = rm.userId
         LEFT JOIN photos p ON p.id = rm.photoId
         WHERE rm.active = 1 AND rm.adminReviewed = 0
         ORDER BY rm.claimedAt DESC`,
        []
      );
      const getLabel = await buildLabelResolver(db);
      res.json(rows.map(r => ({ ...r, locationLabel: getLabel(r.locationId) })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/room-mayors/all-history
  router.get('/api/admin/room-mayors/all-history', requireAuth, requireDevAccess, async (req, res) => {
    try {
      const db = await getDb();
      const rows = await all(db,
        `SELECT rm.id AS mayorId, rm.locationId, rm.claimedAt, rm.active, rm.adminReviewed,
                u.username, COALESCE(p.photoUrl, p.dataUrl) AS photoDataUrl
         FROM room_mayors rm
         JOIN users u ON u.id = rm.userId
         LEFT JOIN photos p ON p.id = rm.photoId
         ORDER BY rm.locationId, rm.claimedAt DESC`,
        []
      );
      const getLabel = await buildLabelResolver(db);
      const result = EPFL_LOCATIONS.map(loc => {
        const locRows = rows.filter(r => r.locationId === loc.id);
        const current = locRows.find(r => r.active === 1) ?? null;
        const history = locRows.filter(r => r.active === 0);
        return {
          locationId: loc.id,
          locationLabel: getLabel(loc.id),
          current,
          history,
        };
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/room-mayors/reports
  router.get('/api/admin/room-mayors/reports', requireAuth, requireDevAccess, async (req, res) => {
    try {
      const db = await getDb();
      const getLabel = await buildLabelResolver(db);
      const rows = await all(db,
        `SELECT
            MIN(rmr.id) AS reportId,
            rmr.mayorId,
            MAX(rmr.reportedAt) AS reportedAt,
            COUNT(*)::int AS reportsCount,
            ARRAY_AGG(DISTINCT u_reporter.username ORDER BY u_reporter.username) AS reporterUsernames,
            rm.locationId, rm.active AS mayorActive,
            u_mayor.username AS mayorUsername,
            COALESCE(p.photoUrl, p.dataUrl) AS photoDataUrl
         FROM room_mayor_reports rmr
         JOIN room_mayors rm ON rm.id = rmr.mayorId
         JOIN users u_mayor ON u_mayor.id = rm.userId
         JOIN users u_reporter ON u_reporter.id = rmr.reportedBy
         LEFT JOIN photos p ON p.id = rm.photoId
         WHERE rmr.status = 'pending'
         GROUP BY rmr.mayorId, rm.locationId, rm.active, u_mayor.username, COALESCE(p.photoUrl, p.dataUrl)
         ORDER BY MAX(rmr.reportedAt) DESC`,
        []
      );
      res.json(rows.map(r => ({ ...r, locationLabel: getLabel(r.locationId) })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // POST /api/admin/room-mayors/reports/:reportId/review
  router.post('/api/admin/room-mayors/reports/:reportId/review', requireAuth, requireDevAccess, async (req, res) => {
    const reportId = parseInt(req.params.reportId, 10);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      res.status(400).json({ error: 'reportId invalide.' }); return;
    }
    const { decision } = req.body || {};
    if (decision !== 'validate' && decision !== 'dismiss') {
      res.status(400).json({ error: 'decision doit etre validate ou dismiss.' }); return;
    }
    try {
      const db = await getDb();
      const getLabel = await buildLabelResolver(db);
      const report = (await all(db,
        `SELECT rmr.id, rmr.mayorId, rm.locationId, rm.photoId,
                rm.userId AS mayorUserId, rm.active AS mayorActive,
                p.storagePath AS photoStoragePath
         FROM room_mayor_reports rmr
         JOIN room_mayors rm ON rm.id = rmr.mayorId
         LEFT JOIN photos p ON p.id = rm.photoId
         WHERE rmr.id = ? AND rmr.status = 'pending'`,
        [reportId]
      ))[0];
      if (!report) { res.status(404).json({ error: 'Signalement introuvable ou deja traite.' }); return; }
      const locLabel = getLabel(report.locationId);
      const pendingReporters = await all(db,
        `SELECT DISTINCT reportedBy FROM room_mayor_reports
         WHERE mayorId = ? AND status = 'pending'`,
        [report.mayorId]
      );
      const pendingReporterIds = pendingReporters.map((r) => r.reportedBy).filter(Boolean);

      if (decision === 'validate') {
        await run(db,
          `UPDATE room_mayor_reports
           SET status = 'resolved_approved'
           WHERE mayorId = ? AND status = 'pending'`,
          [report.mayorId]
        );
        if (report.mayorActive) {
          await run(db, 'UPDATE room_mayors SET active = 0 WHERE id = ?', [report.mayorId]);
        }

        if (report.photoId) {
          await run(db,
            `UPDATE photos
             SET status = 'invalid', photoUrl = NULL, dataUrl = NULL, storagePath = NULL
             WHERE id = ?`,
            [report.photoId]
          );
          if (report.photoStoragePath) {
            try {
              await deletePhotoFromStorage(report.photoStoragePath);
            } catch (err) {
              console.error('[admin-reports] failed to delete storage object:', err.message);
            }
          }
        }

        await updateScore(db, report.mayorUserId, -10);

        await run(db,
          'INSERT INTO notifications (userId, type, message, read, createdAt) VALUES (?, ?, ?, 0, ?)',
          [report.mayorUserId, 'photo_rejected',
           `Photo incorrecte - ton image pour "${locLabel}" a ete jugee invalide par l'admin.${report.mayorActive ? ' Tu perds ton titre de maire.' : ''} Malus : -10 points.`,
           Date.now()]
        );
        for (const reporterId of pendingReporterIds) {
          await run(db,
            'INSERT INTO notifications (userId, type, message, read, createdAt) VALUES (?, ?, ?, 0, ?)',
            [reporterId, 'report_validated',
             `Ton signalement pour "${locLabel}" a ete valide par l'admin. Merci !`,
             Date.now()]
          );
        }
      } else {
        await run(db,
          `UPDATE room_mayor_reports
           SET status = 'resolved_rejected'
           WHERE mayorId = ? AND status = 'pending'`,
          [report.mayorId]
        );
        for (const reporterId of pendingReporterIds) {
          await run(db,
            'INSERT INTO notifications (userId, type, message, read, createdAt) VALUES (?, ?, ?, 0, ?)',
            [reporterId, 'report_rejected',
             `Ton signalement pour "${locLabel}" a ete juge injustifie par l'admin.`,
             Date.now()]
          );
        }
      }
      res.json({ decision, reportId, locationId: report.locationId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // POST /api/admin/room-mayors/:mayorId/review
  router.post('/api/admin/room-mayors/:mayorId/review', requireAuth, requireDevAccess, async (req, res) => {
    const mayorId = parseInt(req.params.mayorId, 10);
    if (!Number.isInteger(mayorId) || mayorId <= 0) {
      res.status(400).json({ error: 'mayorId invalide.' });
      return;
    }
    const { decision } = req.body || {};
    if (decision !== 'approve' && decision !== 'reject') {
      res.status(400).json({ error: 'decision doit etre approve ou reject.' });
      return;
    }
    try {
      const db = await getDb();
      const mayor = (await all(db,
        `SELECT rm.id, rm.userId, rm.locationId, u.username AS mayorUsername
         FROM room_mayors rm JOIN users u ON u.id = rm.userId WHERE rm.id = ?`,
        [mayorId]
      ))[0];
      if (!mayor) {
        res.status(404).json({ error: 'Periode de maire introuvable.' });
        return;
      }
      const resolvedStatus = decision === 'approve' ? 'resolved_approved' : 'resolved_rejected';
      await run(db,
        `UPDATE room_mayor_reports SET status = ? WHERE mayorId = ? AND status = 'pending'`,
        [resolvedStatus, mayorId]
      );
      await run(db, 'UPDATE room_mayors SET adminReviewed = 1 WHERE id = ?', [mayorId]);
      if (decision === 'reject') {
        await run(db, 'UPDATE room_mayors SET active = 0 WHERE id = ?', [mayorId]);
        await run(db,
          'UPDATE room_mayor_totals SET totalSeconds = 0 WHERE locationId = ? AND userId = ?',
          [mayor.locationId, mayor.userId]
        );
        const locLabel = EPFL_LOCATIONS.find(l => l.id === mayor.locationId)?.label ?? mayor.locationId;
        // Malus équipe pour fraude
        const fraudUser = (await all(db, 'SELECT teamId FROM users WHERE id = ?', [mayor.userId]))[0];
        if (fraudUser?.teamId) {
          await run(db,
            `INSERT INTO ctf_team_scores (teamId, points, reason, locationId, awardedAt) VALUES (?, ?, 'fraud_penalty', ?, ?)`,
            [fraudUser.teamId, CTF_SCORING.fraudPenalty, mayor.locationId, Date.now()]
          );
        }
        await run(db,
          `INSERT INTO notifications (userId, type, message, read, createdAt) VALUES (?, ?, ?, 0, ?)`,
          [mayor.userId, 'mayor_revoked',
           `Triche detectee — ta photo de revendication pour "${locLabel}" a ete refusee par un administrateur. Ton chrono est remis a 0. Malus : ${Math.abs(CTF_SCORING.fraudPenalty)} pts pour ton équipe.`,
           Date.now()]
        );
      }
      res.json({ decision, locationId: mayor.locationId, mayorUsername: mayor.mayorUsername });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/locations/overrides
  router.get('/api/locations/overrides', async (_req, res) => {
    try {
      const db = await getDb();
      const rows = await all(db, 'SELECT locationId, label, lat, lng FROM location_overrides', []);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/admin/locations/:locationId
  router.post('/api/admin/locations/:locationId', requireAuth, requireDevAccess, async (req, res) => {
    const { locationId } = req.params;
    const loc = EPFL_LOCATIONS.find(l => l.id === locationId);
    if (!loc) { res.status(400).json({ error: 'locationId inconnu.' }); return; }
    const { label, lat, lng } = req.body || {};
    if (!label && lat == null && lng == null) {
      res.status(400).json({ error: 'Au moins un champ (label, lat, lng) est requis.' });
      return;
    }
    try {
      const db = await getDb();
      const existing = (await all(db,
        'SELECT label, lat, lng FROM location_overrides WHERE locationId = ?',
        [locationId]
      ))[0];
      const newLabel = label ?? existing?.label ?? loc.label;
      const newLat   = lat   ?? existing?.lat   ?? loc.lat;
      const newLng   = lng   ?? existing?.lng   ?? loc.lng;
      await run(db,
        `INSERT INTO location_overrides (locationId, label, lat, lng, updatedAt)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(locationId) DO UPDATE SET label=excluded.label, lat=excluded.lat, lng=excluded.lng, updatedAt=excluded.updatedAt`,
        [locationId, newLabel, newLat, newLng, Date.now()]
      );
      res.json({ locationId, label: newLabel, lat: newLat, lng: newLng });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}


