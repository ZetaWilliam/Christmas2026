const { neon } = require('@neondatabase/serverless');

const send = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
};

const clean = (value, max) => String(value || '')
  .replace(/[\u0000-\u001F\u007F]/g, '')
  .trim()
  .slice(0, max);

module.exports = async function handler(req, res) {
  if (!process.env.DATABASE_URL) return send(res, 503, { error: 'Leaderboard unavailable.' });
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT display_name, team_name, score, strokes, created_at
        FROM (
          SELECT DISTINCT ON (lower(display_name))
            display_name, team_name, score, strokes, created_at
          FROM game_scores
          ORDER BY lower(display_name), score DESC, created_at ASC
        ) best
        ORDER BY score DESC, created_at ASC
        LIMIT 15
      `;
      return send(res, 200, {
        ok: true,
        leaderboard: rows.map((r, i) => ({
          rank: i + 1,
          name: r.display_name,
          team: r.team_name,
          score: r.score,
          strokes: r.strokes
        }))
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = clean(body.name, 30);
      const team = clean(body.team, 60);
      const score = Number(body.score);
      const strokes = Number(body.strokes);
      const durationMs = Number(body.durationMs);

      if (name.length < 2) return send(res, 400, { error: 'Please choose a display name with at least 2 characters.' });
      if (!Number.isInteger(score) || !Number.isInteger(strokes) || !Number.isInteger(durationMs)) {
        return send(res, 400, { error: 'Invalid game result.' });
      }
      if (score < 0 || score > 2500 || strokes < 0 || strokes > 160 ||
          durationMs < 18000 || durationMs > 23000 || score > strokes * 20 + 100) {
        return send(res, 400, { error: 'That score could not be verified.' });
      }

      const recent = await sql`
        SELECT 1 FROM game_scores
        WHERE lower(display_name)=lower(${name})
          AND created_at > now() - interval '5 seconds'
        LIMIT 1
      `;
      if (recent.length) return send(res, 429, { error: 'Please wait a few seconds before submitting again.' });

      await sql`
        INSERT INTO game_scores(display_name, team_name, score, strokes, duration_ms)
        VALUES (${name}, ${team}, ${score}, ${strokes}, ${durationMs})
      `;

      const rows = await sql`
        SELECT display_name, team_name, score
        FROM (
          SELECT DISTINCT ON (lower(display_name))
            display_name, team_name, score, created_at
          FROM game_scores
          ORDER BY lower(display_name), score DESC, created_at ASC
        ) best
        ORDER BY score DESC, created_at ASC
        LIMIT 15
      `;
      return send(res, 200, {
        ok: true,
        leaderboard: rows.map((r, i) => ({
          rank: i + 1, name: r.display_name, team: r.team_name, score: r.score
        }))
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('Game API error:', error?.code || error?.name || 'unknown');
    return send(res, 500, { error: 'Leaderboard temporarily unavailable.' });
  }
};
