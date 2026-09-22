const { neon } = require('@neondatabase/serverless');

function json(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return json(res, 500, { error: 'Database is not configured.' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const preferredName = String(body.preferredName || '').trim();
      const fullName = String(body.fullName || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const affiliation = String(body.affiliation || '').trim();
      const escapeRoom = String(body.escapeRoom || '').trim();
      const dietary = String(body.dietary || 'None').trim() || 'None';
      const comments = String(body.comments || '').trim();

      if (!preferredName || !fullName || !email || !affiliation || !['Yes', 'Lounge Only'].includes(escapeRoom)) {
        return json(res, 400, { error: 'Please complete all required RSVP fields.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(res, 400, { error: 'Please enter a valid email address.' });
      }

      if (escapeRoom === 'Yes') {
        const existing = await sql`SELECT escape_room FROM rsvps WHERE email = ${email}`;
        const alreadyInRoom = existing[0]?.escape_room === 'Yes';
        if (!alreadyInRoom) {
          const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM rsvps WHERE escape_room = 'Yes'`;
          if (count >= 36) {
            return json(res, 409, { error: 'Escape room places are currently full (36/36). Please choose Lounge Only.' });
          }
        }
      }

      const rows = await sql`
        INSERT INTO rsvps (email, preferred_name, full_name, affiliation, escape_room, dietary, comments)
        VALUES (${email}, ${preferredName}, ${fullName}, ${affiliation}, ${escapeRoom}, ${dietary}, ${comments})
        ON CONFLICT (email) DO UPDATE SET
          preferred_name = EXCLUDED.preferred_name,
          full_name = EXCLUDED.full_name,
          affiliation = EXCLUDED.affiliation,
          escape_room = EXCLUDED.escape_room,
          dietary = EXCLUDED.dietary,
          comments = EXCLUDED.comments,
          updated_at = NOW()
        RETURNING email, preferred_name, full_name, affiliation, escape_room, dietary, comments, created_at, updated_at
      `;
      return json(res, 200, { ok: true, rsvp: rows[0] });
    }

    if (req.method === 'GET') {
      const passcode = req.headers['x-admin-passcode'];
      if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
        return json(res, 401, { error: 'Unauthorized.' });
      }

      const rows = await sql`
        SELECT email, preferred_name, full_name, affiliation, escape_room, dietary, comments, created_at, updated_at
        FROM rsvps
        ORDER BY updated_at DESC
      `;
      const stats = rows.reduce((s, r) => {
        s.total += 1;
        if (r.escape_room === 'Yes') s.escapeRooms += 1;
        else s.loungeOnly += 1;
        if (r.dietary && !['None', 'No restrictions'].includes(r.dietary)) s.specialDiets += 1;
        return s;
      }, { total: 0, escapeRooms: 0, loungeOnly: 0, specialDiets: 0 });

      return json(res, 200, { ok: true, rows, stats, escapeCapacity: 36 });
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Server error. Please try again.' });
  }
};
