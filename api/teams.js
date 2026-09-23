const { neon } = require('@neondatabase/serverless');
const { randomBytes } = require('node:crypto');

const respond = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
};

module.exports = async function handler(req, res) {
  if (!process.env.DATABASE_URL) return respond(res, 503, { error: 'Database unavailable.' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
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
      ['SIX_TEAMS_FULL',409,'Six active teams are already formed.'],
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
