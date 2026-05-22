// CTF team room-control routes and hourly scoring cron.
// Exports: default router + startCtfCron(broadcast).

import express from 'express';
import { getDb, run, all } from '../db.js';
import { requireAuth } from '../auth.js';
import { EPFL_LOCATIONS } from '../../../game/epfl-locations.js';
import { CTF_SCORING } from '../../../game/game-config.js';

const router = express.Router();

// In-memory guards: prevents double-awarding within the same hour tick.
let lastHourlyAwardedHour = -1;   // tracks the last wall-clock hour we ran hourly scoring
const bonusWindowsAwarded = new Set(); // keyed by "YYYY-MM-DD-HHh" strings

function getZurichDateHour() {
  // Returns { date: "YYYY-MM-DD", hour: 0-23 } in Europe/Zurich timezone.
  const fmt = new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = parseInt(parts.hour, 10);
  return { date, hour };
}

// Controlling team is the team of the active mayor for that room.
// Returns teamId or null if there is no active mayor with a team.
async function computeControllingTeam(db, locationId) {
  const rows = await all(db,
    `SELECT u.teamId
     FROM room_mayors rm
     JOIN users u ON u.id = rm.userId
     WHERE rm.locationId = $1
       AND rm.active = 1
       AND u.teamId IS NOT NULL
     ORDER BY rm.claimedAt DESC
     LIMIT 1`,
    [locationId]
  );
  if (!rows.length) return null;
  return rows[0].teamId;
}

// Award per-mayor points. Called every minute.
// Each eligible mayor is scored independently based on their claimedAt/lastScoredAt.
async function runHourlyScoring(db, broadcast) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const INTERVAL = 3600;

  const eligibleMayors = await all(db,
    `SELECT rm.id AS mayorId, rm.userId, rm.locationId, rm.claimedAt,
            rm.lastScoredAt, u.teamId
     FROM room_mayors rm
     JOIN users u ON u.id = rm.userId
     WHERE rm.active = 1
       AND u.teamId IS NOT NULL
       AND (
         (rm.lastScoredAt IS NULL     AND $1 >= rm.claimedAt    + $2)
         OR
         (rm.lastScoredAt IS NOT NULL AND $1 >= rm.lastScoredAt + $2)
       )`,
    [nowSeconds, INTERVAL]
  );

  if (eligibleMayors.length === 0) return;

  for (const { mayorId, userId, locationId, teamId } of eligibleMayors) {
    const awardedAt = Date.now();
    await run(db,
      `INSERT INTO ctf_team_scores (teamId, points, reason, locationId, awardedAt)
       VALUES (?, ?, 'hourly_control', ?, ?)`,
      [teamId, CTF_SCORING.pointsPerRoomPerHour, locationId, awardedAt]
    );
    await run(db,
      `INSERT INTO ctf_player_scores (userId, points, reason, locationId, awardedAt)
       VALUES (?, ?, 'room_control', ?, ?)`,
      [userId, CTF_SCORING.pointsPerRoomPerHour, locationId, awardedAt]
    );
    await run(db,
      `UPDATE room_mayors SET lastScoredAt = ? WHERE id = ?`,
      [nowSeconds, mayorId]
    );
  }

  broadcast({ type: 'ctf_update' });
}

// Domination bonus: global snapshot of all rooms, once per wall-clock hour.
// Exactly the same logic as before — guarded by lastHourlyAwardedHour.
async function runDominationBonus(db, broadcast) {
  const { hour } = getZurichDateHour();
  if (hour === lastHourlyAwardedHour) return;
  lastHourlyAwardedHour = hour;

  const now = Date.now();
  const roomScores = {};   // teamId -> rooms controlled
  const mayorsByTeam = {}; // teamId -> Set<userId>

  for (const loc of EPFL_LOCATIONS) {
    const teamId = await computeControllingTeam(db, loc.id);
    if (!teamId) continue;

    roomScores[teamId] = (roomScores[teamId] ?? 0) + 1;

    const mayor = (await all(db,
      'SELECT userId FROM room_mayors WHERE locationId = ? AND active = 1 LIMIT 1',
      [loc.id]
    ))[0];
    if (mayor) {
      if (!mayorsByTeam[teamId]) mayorsByTeam[teamId] = new Set();
      mayorsByTeam[teamId].add(mayor.userId);
    }
  }

  const entries = Object.entries(roomScores);
  if (entries.length === 0) return;

  entries.sort((a, b) => b[1] - a[1]);
  if (entries.length === 1 || entries[0][1] > entries[1][1]) {
    const winTeam = entries[0][0];
    await run(db,
      `INSERT INTO ctf_team_scores (teamId, points, reason, locationId, awardedAt)
       VALUES (?, ?, 'domination', NULL, ?)`,
      [winTeam, CTF_SCORING.dominationBonus, now]
    );
    for (const uid of (mayorsByTeam[winTeam] ?? [])) {
      await run(db,
        `INSERT INTO ctf_player_scores (userId, points, reason, locationId, awardedAt)
         VALUES (?, 2, 'domination_contribution', NULL, ?)`,
        [uid, now]
      );
    }
    broadcast({ type: 'ctf_update' });
  }
}

// Award bonus points at 12:00 and 14:00 Zurich time. Guarded by bonusWindowsAwarded Set.
async function runBonusScoring(db, broadcast, reason) {
  const { date, hour } = getZurichDateHour();
  const key = `${date}-${hour}h`;
  if (bonusWindowsAwarded.has(key)) return;
  bonusWindowsAwarded.add(key);

  const now = Date.now();
  let awarded = false;

  for (const loc of EPFL_LOCATIONS) {
    const teamId = await computeControllingTeam(db, loc.id);
    if (!teamId) continue;
    await run(db,
      `INSERT INTO ctf_team_scores (teamId, points, reason, locationId, awardedAt) VALUES (?, 3, ?, ?, ?)`,
      [teamId, reason, loc.id, now]
    );
    awarded = true;
  }

  if (awarded) {
    broadcast({ type: 'ctf_update' });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/teams — list all 3 teams (public)
router.get('/api/teams', async (_req, res) => {
  try {
    const db = await getDb();
    const teams = await all(db, 'SELECT id, name, color FROM teams ORDER BY id');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/set-team — assign team once (auth required)
router.post('/api/auth/set-team', requireAuth, async (req, res) => {
  const { teamId } = req.body || {};
  try {
    const db = await getDb();

    const validTeam = (await all(db, 'SELECT id FROM teams WHERE id = $1', [teamId]))[0];
    if (!validTeam) {
      res.status(400).json({ error: 'teamId invalide.' });
      return;
    }

    const user = (await all(db, 'SELECT teamId FROM users WHERE id = $1', [req.user.id]))[0];
    if (user?.teamId) {
      res.status(409).json({ error: 'Equipe deja assignee.' });
      return;
    }

    await run(db, 'UPDATE users SET teamId = $1 WHERE id = $2', [teamId, req.user.id]);
    res.json({ ok: true, teamId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ctf/rooms — all rooms with controlling team (from active room_mayors) and photo counts
router.get('/api/ctf/rooms', async (_req, res) => {
  try {
    const db = await getDb();

    // Controlling team = active room mayor's team (immediate, no validation needed)
    const mayorRows = await all(db,
      `SELECT rm.locationId, u.teamId
       FROM room_mayors rm
       JOIN users u ON u.id = rm.userId
       WHERE rm.active = 1 AND u.teamId IS NOT NULL`,
      []
    );
    const mayorTeamMap = Object.fromEntries(mayorRows.map(r => [r.locationId, r.teamId]));

    // Per-room, per-team validated photo counts (for leaderboard display)
    const countRows = await all(db,
      `SELECT p.locationId, u.teamId, COUNT(*)::int AS cnt
       FROM photos p
       JOIN users u ON u.id = p.userId
       WHERE p.category   = 'contribution'
         AND p.status     = 'validated'
         AND p.locationId IS NOT NULL
         AND u.teamId     IS NOT NULL
       GROUP BY p.locationId, u.teamId`,
      []
    );
    const countMap = {};
    for (const row of countRows) {
      if (!countMap[row.locationId]) countMap[row.locationId] = { rouge: 0, bleu: 0, vert: 0 };
      if (row.teamId in countMap[row.locationId]) countMap[row.locationId][row.teamId] = row.cnt;
    }

    const teams = await all(db, 'SELECT id, color FROM teams');
    const teamColorMap = Object.fromEntries(teams.map(t => [t.id, t.color]));

    const rooms = EPFL_LOCATIONS.map(loc => {
      const controllingTeam = mayorTeamMap[loc.id] ?? null;
      return {
        locationId: loc.id,
        locationLabel: loc.label,
        lat: loc.lat,
        lng: loc.lng,
        floor: loc.floor,
        controllingTeam,
        teamColor: controllingTeam ? (teamColorMap[controllingTeam] ?? null) : null,
        photoCounts: countMap[loc.id] ?? { rouge: 0, bleu: 0, vert: 0 },
      };
    });

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ctf/leaderboard — summed scores + live room count per team
router.get('/api/ctf/leaderboard', async (_req, res) => {
  try {
    const db = await getDb();
    const teams = await all(db, 'SELECT id, name, color FROM teams ORDER BY id');

    const scoreRows = await all(db,
      `SELECT teamId, SUM(points)::int AS totalPoints
       FROM ctf_team_scores
       GROUP BY teamId`,
      []
    );
    const scoreMap = Object.fromEntries(scoreRows.map(r => [r.teamId, r.totalPoints ?? 0]));

    const leaderboard = await Promise.all(teams.map(async (team) => {
      let roomsControlled = 0;
      for (const loc of EPFL_LOCATIONS) {
        const controlling = await computeControllingTeam(db, loc.id);
        if (controlling === team.id) roomsControlled++;
      }
      return {
        teamId: team.id,
        name: team.name,
        color: team.color,
        totalPoints: scoreMap[team.id] ?? 0,
        roomsControlled,
      };
    }));

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ctf/leaderboard/players — individual CTF scores
router.get('/api/ctf/leaderboard/players', async (_req, res) => {
  try {
    const db = await getDb();
    const teams = await all(db, 'SELECT id, color FROM teams');
    const colorMap = Object.fromEntries(teams.map(t => [t.id, t.color]));
    const rows = await all(db,
      `SELECT u.id, u.username, u.teamId, COALESCE(SUM(cps.points), 0)::int AS ctfScore
       FROM users u
       LEFT JOIN ctf_player_scores cps ON cps.userId = u.id
       GROUP BY u.id, u.username, u.teamId
       HAVING COALESCE(SUM(cps.points), 0) <> 0
       ORDER BY ctfScore DESC
       LIMIT 50`,
      []
    );
    res.json(rows.map((r, i) => ({ ...r, rank: i + 1, teamColor: colorMap[r.teamId] ?? null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ctf/teams/composition — members per team
router.get('/api/ctf/teams/composition', async (_req, res) => {
  try {
    const db = await getDb();
    const teams = await all(db, 'SELECT id, name, color FROM teams ORDER BY id');
    const users = await all(db,
      'SELECT id, username, teamId FROM users WHERE teamId IS NOT NULL ORDER BY username',
      []
    );
    res.json(teams.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      members: users.filter(u => u.teamId === t.id).map(u => ({ id: u.id, username: u.username })),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Scoring cron ──────────────────────────────────────────────────────────────

// Cron — appelé toutes les 60 secondes
export function startCtfCron(broadcast) {
  setInterval(async () => {
    try {
      const db = await getDb();
      const { hour } = getZurichDateHour();

      await runHourlyScoring(db, broadcast);   // per-mayor, continu
      await runDominationBonus(db, broadcast); // snapshot global, 1x/heure
      if (hour === 12) await runBonusScoring(db, broadcast, 'bonus_12h');
      if (hour === 14) await runBonusScoring(db, broadcast, 'bonus_14h');
    } catch (err) {
      console.error('[ctf-cron] Error:', err.message);
    }
  }, 60_000);
}

export default router;
