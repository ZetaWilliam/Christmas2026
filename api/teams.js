const { neon } = require('@neondatabase/serverless');
const { randomBytes } = require('node:crypto');

const respond = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
};

const CREW_TARGET = 3600;
const CREW_STOPS = Object.freeze([
  { distance: 0, label: 'CBD' },
  { distance: 900, label: 'Harbour Bridge' },
  { distance: 1800, label: 'Devonport' },
  { distance: 3000, label: 'Rangitoto' }
]);

function crewJourney(distance, flowers, contributors) {
  const d = Math.max(0, Number(distance) || 0);
  const reached = CREW_STOPS.filter(stop => d >= stop.distance).at(-1) || CREW_STOPS[0];
  const next = CREW_STOPS.find(stop => d < stop.distance) || null;
  return {
    distance: Math.round(d),
    flowers: Math.max(0, Number(flowers) || 0),
    contributors: Math.max(0, Number(contributors) || 0),
    progress: Math.min(100, Math.round(d / CREW_TARGET * 100)),
    stage: reached.label,
    next: next ? next.label : 'Rangitoto reached',
    target: CREW_TARGET
  };
}

module.exports = async function handler(req, res) {
  if (!process.env.DATABASE_URL) return respond(res, 503, { error: 'Database unavailable.' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      if (String(req.query.list || '') === '1') {
        // Public directory: team names, headcounts and aggregate game journey only.
        // No member names, emails, dietary information or private invite codes are returned.
        const rows = await sql`
          WITH best_per_player AS (
            SELECT DISTINCT ON (lower(team_name), lower(display_name))
              lower(team_name) AS team_key,
              display_name, score, distance, flowers, created_at
            FROM runner_scores
            WHERE btrim(team_name) <> ''
            ORDER BY lower(team_name), lower(display_name), score DESC, created_at ASC
          ),
          ranked AS (
            SELECT team_key, display_name, score, distance, flowers,
              row_number() OVER (
                PARTITION BY team_key
                ORDER BY score DESC, lower(display_name) ASC
              ) AS rn
            FROM best_per_player
          ),
          journey AS (
            SELECT team_key,
              COALESCE(sum(distance) FILTER (WHERE rn <= 3), 0)::int AS journey_distance,
              COALESCE(sum(flowers) FILTER (WHERE rn <= 3), 0)::int AS journey_flowers,
              count(*) FILTER (WHERE rn <= 3)::int AS journey_contributors
            FROM ranked
            GROUP BY team_key
          )
          SELECT t.id, t.name, count(r.email)::int AS member_count,
            COALESCE(j.journey_distance, 0)::int AS journey_distance,
            COALESCE(j.journey_flowers, 0)::int AS journey_flowers,
            COALESCE(j.journey_contributors, 0)::int AS journey_contributors
          FROM escape_teams t
          JOIN rsvps r ON r.team_id=t.id AND r.escape_room='Yes'
          LEFT JOIN journey j ON j.team_key=lower(t.name)
          GROUP BY t.id, j.journey_distance, j.journey_flowers, j.journey_contributors
          HAVING count(r.email)>0
          ORDER BY t.created_at ASC, t.id ASC
        `;
        return respond(res, 200, {
          teams: rows.map(t => {
            const memberCount = Number(t.member_count) || 0;
            return {
              id: t.id,
              name: t.name,
              memberCount,
              remaining: Math.max(0, 6 - memberCount),
              full: memberCount >= 6,
              journey: crewJourney(t.journey_distance, t.journey_flowers, t.journey_contributors)
            };
          }),
          maxTeams: 12,
          teamCapacity: 6,
          escapeCapacity: 36,
          crewJourneyTarget: CREW_TARGET,
          crewJourneyStops: CREW_STOPS
        });
      }
      const code = String(req.query.code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{10}$/.test(code)) {
        return respond(res, 400, { error: 'Enter a valid 10-character invitation code.' });
      }
      const team = await sql`
        SELECT t.name,t.invite_code,count(r.email)::int AS member_count
        FROM escape_teams t
        LEFT JOIN rsvps r ON r.team_id=t.id AND r.escape_room='Yes'
        WHERE t.invite_code=${code}
        GROUP BY t.id
      `;
      if (!team.length) return respond(res, 404, { error: 'Team not found. Check the code.' });
      const count = team[0].member_count;
      return respond(res, 200, {
        name: team[0].name, code: team[0].invite_code,
        memberCount: count, capacity: 6, remaining: 6-count,
        full: count >= 6
      });
    }
    if (req.method === 'POST') {
      if (!process.env.ADMIN_PASSCODE ||
          req.headers['x-admin-passcode'] !== process.env.ADMIN_PASSCODE) {
        return respond(res, 401, { error: 'Unauthorized.' });
      }
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const email = String(b.email || '').trim().toLowerCase();
      const teamName = String(b.newTeamName || '').trim();
      const teamId = b.teamId === null || b.teamId === undefined || b.teamId === ''
        ? null : Number(b.teamId);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          (teamId !== null && (!Number.isSafeInteger(teamId) || teamId <= 0)) ||
          teamName.length > 60 || (teamName && teamName.length < 2) ||
          (teamName && teamId !== null)) {
        return respond(res, 400, { error: 'Invalid team assignment.' });
      }
      const newCode = randomBytes(5).toString('hex').toUpperCase();
      const [row] = await sql`
        SELECT organiser_assign_gathering_team(
          ${email},${teamId},${teamName},${newCode}
        ) AS result
      `;
      return respond(res, 200, { ok: true, assignment: row.result });
    }
    res.setHeader('Allow','GET, POST');
    return respond(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    const message=String(error?.message || '');
    for (const [code,status,text] of [
      ['TEAM_FULL',409,'This team is already full (6/6).'],
      ['TWELVE_TEAMS_FULL',409,'Twelve preliminary teams are already formed.'],
      ['TEAM_NOT_FOUND',404,'Team not found.'],
      ['RSVP_NOT_FOUND',404,'Escape room RSVP not found.'],
      ['INVALID_TEAM_NAME',400,'Please use a team name between 2 and 60 characters.']
    ]) {
      if (message.includes(code)) return respond(res,status,{error:text});
    }
    console.error('Team API error:',error?.code || error?.name || 'unknown');
    return respond(res,500,{error:'Unable to load or update team. Please try again.'});
  }
};

module.exports.crewJourney = crewJourney;
module.exports.CREW_TARGET = CREW_TARGET;
module.exports.CREW_STOPS = CREW_STOPS;
