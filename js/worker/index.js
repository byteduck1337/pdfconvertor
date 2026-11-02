const USERNAME_RE = /^[a-zA-Z0-9_]{2,15}$/;
const MAX_SESSIONS = 100000;
const MAX_TIME = 100000000;
const MAX_MASTERED = 10000;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
});

const handleOptions = () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
});

const getRateKey = (request) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return `rate:${ip}`;
};

const checkRateLimit = async (env, request, limit = 10) => {
  if (!env.KV) return true;
  const key = getRateKey(request);
  const current = parseInt((await env.KV.get(key)) || '0', 10);
  if (current >= limit) return false;
  await env.KV.put(key, String(current + 1), { expirationTtl: 60 });
  return true;
};

const validatePayload = (body) => {
  if (!body || typeof body !== 'object') return 'invalid_payload';
  if (!USERNAME_RE.test(body.username || '')) return 'invalid_username';
  const s = Number(body.sessions);
  const t = Number(body.time_studied);
  const m = Number(body.mastered);
  if (!Number.isFinite(s) || s < 0 || s > MAX_SESSIONS) return 'invalid_sessions';
  if (!Number.isFinite(t) || t < 0 || t > MAX_TIME) return 'invalid_time';
  if (!Number.isFinite(m) || m < 0 || m > MAX_MASTERED) return 'invalid_mastered';
  return null;
};

const handleLeaderboard = async (env) => {
  if (!env.DB) return json([], 200);
  try {
    const { results } = await env.DB.prepare(
      'SELECT username, sessions, time_studied, mastered FROM scores ORDER BY mastered DESC, time_studied DESC LIMIT 100'
    ).all();
    return json(results || [], 200);
  } catch {
    return json({ error: 'internal' }, 500);
  }
};

const handleSubmit = async (env, request) => {
  const allowed = await checkRateLimit(env, request, 10);
  if (!allowed) return json({ error: 'rate_limited' }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const err = validatePayload(body);
  if (err) return json({ error: err }, 400);

  if (body.session_id && env.KV) {
    const key = `session:${body.session_id}`;
    const seen = await env.KV.get(key);
    if (seen) return json({ ok: true }, 200);
    await env.KV.put(key, '1', { expirationTtl: 3600 });
  }

  if (!env.DB) return json({ ok: true }, 200);

  try {
    await env.DB.prepare(
      `INSERT INTO scores (username, sessions, time_studied, mastered, updated_at)
       VALUES (?, ?, ?, ?, unixepoch())
       ON CONFLICT(username) DO UPDATE SET
         sessions = MAX(scores.sessions, excluded.sessions),
         time_studied = MAX(scores.time_studied, excluded.time_studied),
         mastered = MAX(scores.mastered, excluded.mastered),
         updated_at = unixepoch()`
    ).bind(
      body.username,
      Number(body.sessions),
      Number(body.time_studied),
      Number(body.mastered)
    ).run();

    return json({ ok: true }, 200);
  } catch {
    return json({ error: 'internal' }, 500);
  }
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return handleOptions();

    const url = new URL(request.url);

    if (url.pathname === '/leaderboard' && request.method === 'GET') {
      return handleLeaderboard(env);
    }

    if (url.pathname === '/submit' && request.method === 'POST') {
      return handleSubmit(env, request);
    }

    return json({ error: 'not_found' }, 404);
  }
};