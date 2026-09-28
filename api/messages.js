const { neon } = require('@neondatabase/serverless');

const reply = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
};

function cleanName(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}
function cleanMessage(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}
async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS event_messages (
      id BIGSERIAL PRIMARY KEY,
      display_name VARCHAR(30) NOT NULL,
      message VARCHAR(240) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS event_messages_created_at_idx
    ON event_messages (created_at DESC)
  `;
}
async function listMessages(sql) {
  const rows = await sql`
    SELECT id, display_name, message, created_at
    FROM event_messages
    ORDER BY created_at DESC, id DESC
    LIMIT 100
  `;
  return rows.map(r => ({
    id: Number(r.id),
    name: r.display_name,
    message: r.message,
    createdAt: r.created_at
  }));
}

module.exports = async function handler(req, res) {
  if (!process.env.DATABASE_URL) return reply(res, 503, { error: 'Message board is temporarily unavailable.' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    await ensureTable(sql);

    if (req.method === 'GET') {
      return reply(res, 200, { messages: await listMessages(sql) });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = cleanName(body.name);
      const message = cleanMessage(body.message);

      if (name.length < 2 || name.length > 30) {
        return reply(res, 400, { error: 'Please use a name between 2 and 30 characters.' });
      }
      if (!message || message.length > 100) {
        return reply(res, 400, { error: 'Please keep your message between 1 and 100 characters.' });
      }

      const recent = await sql`
        SELECT 1
        FROM event_messages
        WHERE lower(display_name) = lower(${name})
          AND created_at > now() - interval '15 seconds'
        LIMIT 1
      `;
      if (recent.length) {
        return reply(res, 429, { error: 'Please wait a few seconds before posting again.' });
      }

      await sql`
        INSERT INTO event_messages (display_name, message)
        VALUES (${name}, ${message})
      `;
      await sql`
        DELETE FROM event_messages
        WHERE id NOT IN (
          SELECT id FROM event_messages
          ORDER BY created_at DESC, id DESC
          LIMIT 300
        )
      `;

      return reply(res, 201, { ok: true, messages: await listMessages(sql) });
    }

    res.setHeader('Allow', 'GET, POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('Message board API error:', error?.code || error?.name || 'unknown');
    return reply(res, 500, { error: 'Unable to load or post messages right now.' });
  }
};

module.exports.cleanName = cleanName;
module.exports.cleanMessage = cleanMessage;
