const { neon } = require('@neondatabase/serverless');
const send = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
};
const clean = (value, max) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '';

// Share one projection for GET and POST so gold/combo never disappear after saving.
async function bestRuns(sql) {
  const rows = await sql`
    SELECT display_name, team_name, score, distance, flowers, golden_flowers, max_combo
    FROM (
      SELECT DISTINCT ON (lower(display_name))
        display_name, team_name, score, distance, flowers, golden_flowers, max_combo, created_at
      FROM runner_scores
      ORDER BY lower(display_name), score DESC, created_at ASC
    ) best
    ORDER BY score DESC, created_at ASC
    LIMIT 15
  `;
  return rows.map((r, i) => ({
    rank: i + 1, name: r.display_name, team: r.team_name,
    score: r.score, distance: r.distance, flowers: r.flowers,
    goldenFlowers: r.golden_flowers, maxCombo: r.max_combo
  }));
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.DATABASE_URL) return send(res, 503, { error: 'Leaderboard unavailable.' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') return send(res, 200, { ok: true, leaderboard: await bestRuns(sql) });
    let b;
    try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch (_) { return send(res, 400, { error: 'Invalid JSON.' }); }
    if (!b || typeof b !== 'object' || Array.isArray(b)) return send(res, 400, { error: 'Invalid game result.' });
    const name = clean(b.name, 30), team = clean(b.team, 60);
    const { score, distance, flowers, durationMs } = b;
    const goldenFlowers = b.goldenFlowers === undefined ? 0 : b.goldenFlowers;
    const maxCombo = b.maxCombo === undefined ? 0 : b.maxCombo;
    if (name.length < 2) return send(res, 400, { error: 'Please choose a display name with at least 2 characters.' });
    if (![score, distance, flowers, goldenFlowers, maxCombo, durationMs].every(Number.isInteger)) {
      return send(res, 400, { error: 'Invalid game result.' });
    }
    if (score < 0 || score > 100000 || distance < 0 || distance > 100000 ||
        flowers < 0 || flowers > 200 || goldenFlowers < 0 || goldenFlowers > Math.min(100, flowers) ||
        maxCombo < 0 || maxCombo > Math.min(100, flowers) || durationMs < 1000 || durationMs > 600000) {
      return send(res, 400, { error: 'Game result is outside the allowed range.' });
    }
    // Plausibility checks only: this casual leaderboard is not a cheat-proof competition.
    const maxDistance = Math.floor(durationMs / 1000 * 100 + 250);
    const baseScore = distance + flowers * 100 + goldenFlowers * 200;
    if (distance > maxDistance || score < baseScore - 2 || score > baseScore + flowers * 100) {
      return send(res, 400, { error: 'Score is outside expected bounds. Please start a fresh run.' });
    }
    const recent = await sql`
      SELECT 1 FROM runner_scores
      WHERE lower(display_name) = lower(${name})
        AND created_at > now() - interval '5 seconds'
      LIMIT 1
    `;
    if (recent.length) return send(res, 429, { error: 'Please wait a few seconds before submitting again.' });
    await sql`
      INSERT INTO runner_scores(display_name, team_name, score, distance, flowers, golden_flowers, max_combo, duration_ms)
      VALUES (${name}, ${team}, ${score}, ${distance}, ${flowers}, ${goldenFlowers}, ${maxCombo}, ${durationMs})
    `;
    return send(res, 200, { ok: true, leaderboard: await bestRuns(sql) });
  } catch (error) {
    console.error('Runner API error:', error?.code || error?.name || 'unknown');
    return send(res, 500, { error: 'Leaderboard temporarily unavailable.' });
  }
};
