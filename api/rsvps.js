const { neon } = require('@neondatabase/serverless');
const { randomBytes } = require('node:crypto');

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function errorResponse(res, error) {
  const message = String(error?.message || '');
  const known = [
    ['ESCAPE_FULL', 409, 'Escape room places are full (36/36). Please choose Lounge Only.'],
    ['SIX_TEAMS_FULL', 409, 'Six active teams are already formed. Please join an existing team or choose organiser assignment.'],
    ['TEAM_FULL', 409, 'This team already has six members. Please choose another team.'],
    ['TEAM_NOT_FOUND', 404, 'That team code was not found. Please check the invitation code.'],
    ['INVALID_TEAM_NAME', 400, 'Please use a team name between 2 and 60 characters.'],
    ['INVALID_TEAM_MODE', 400, 'Please choose how you would like to join a team.'],
    ['INVALID_ESCAPE_CHOICE', 400, 'Please select Escape Room or Lounge Only.']
  ];
  for (const [token, status, text] of known) {
    if (message.includes(token)) return reply(res, status, { error: text });
  }
  console.error('RSVP API error:', error?.code || error?.name || 'unknown');
  return reply(res, 500, { error: 'Unable to save or load RSVP. Please try again.' });
}

module.exports = async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return reply(res, 503, { error: 'RSVP database is not configured.' });
  }
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const preferredName = String(b.preferredName || '').trim();
      const fullName = String(b.fullName || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      const affiliation = String(b.affiliation || '').trim();
      const escapeRoom = String(b.escapeRoom || '').trim();
      const dietary = String(b.dietary || 'None').trim() || 'None';
      const comments = String(b.comments || '').trim();
      const teamMode = escapeRoom === 'Yes' ? String(b.teamMode || 'match').trim() : 'none';
      const teamName = String(b.teamName || '').trim();
      const teamCode = String(b.teamCode || '').trim().toUpperCase();

      if (!preferredName || !fullName || !email || !affiliation ||
          !['Yes', 'Lounge Only'].includes(escapeRoom)) {
        return reply(res, 400, { error: 'Please complete all required RSVP fields.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180 ||
          preferredName.length > 80 || fullName.length > 150 || affiliation.length > 100 ||
          dietary.length > 500 || comments.length > 1000) {
        return reply(res, 400, { error: 'Please check the email address and field lengths.' });
      }
      if (escapeRoom === 'Yes') {
        if (!['create', 'join', 'match'].includes(teamMode)) {
          return reply(res, 400, { error: 'Please choose a team option.' });
        }
        if (teamMode === 'create' && (teamName.length < 2 || teamName.length > 60)) {
          return reply(res, 400, { error: 'Team names must be between 2 and 60 characters.' });
        }
        if (teamMode === 'join' && !/^[A-Z0-9]{10}$/.test(teamCode)) {
          return reply(res, 400, { error: 'Please enter the 10-character team invitation code.' });
        }
      }

      const newCode = randomBytes(5).toString('hex').toUpperCase();
      const [rsvp] = await sql`
        SELECT register_gathering_rsvp(
          ${email}, ${preferredName}, ${fullName}, ${affiliation},
          ${escapeRoom}, ${dietary}, ${comments},
          ${teamMode}, ${teamName}, ${teamCode}, ${newCode}
        ) AS result
      `;
      return reply(res, 200, { ok: true, rsvp: rsvp.result });
    }

    if (req.method === 'GET') {
      const passcode = req.headers['x-admin-passcode'];
      if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
        return reply(res, 401, { error: 'Unauthorized.' });
      }

      const rows = await sql`
        SELECT r.email,r.preferred_name,r.full_name,r.affiliation,
          r.escape_room,r.dietary,r.comments,r.team_id,
          t.name AS team_name,t.invite_code AS team_code,
          r.created_at,r.updated_at
        FROM rsvps r LEFT JOIN escape_teams t ON t.id=r.team_id
        ORDER BY r.updated_at DESC
      `;
      const teams = await sql`
        SELECT t.id,t.name,t.invite_code,t.created_by,t.created_at,
          count(r.email)::int AS member_count
        FROM escape_teams t
        LEFT JOIN rsvps r ON r.team_id=t.id AND r.escape_room='Yes'
        GROUP BY t.id
        HAVING count(r.email)>0
        ORDER BY t.created_at ASC
      `;
      const stats = rows.reduce((s, r) => {
        s.total++;
        if (r.escape_room === 'Yes') {
          s.escapeRooms++;
          if (!r.team_id) s.awaitingTeam++;
        } else s.loungeOnly++;
        if (r.dietary && !['None', 'No restrictions'].includes(r.dietary)) s.specialDiets++;
        return s;
      }, { total: 0, escapeRooms: 0, loungeOnly: 0, specialDiets: 0, awaitingTeam: 0 });
      stats.teamsFormed = teams.length;
      return reply(res, 200, { ok: true, rows, teams, stats, escapeCapacity: 36, teamCapacity: 6 });
    }

    res.setHeader('Allow', 'GET, POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    return errorResponse(res, error);
  }
};
