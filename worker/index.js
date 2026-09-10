/* ==================== WU-PUZZLES WORKER ====================
 * One Worker does two jobs:
 *
 *   1. Serves the static site (index.html, css/, js/, data/) via the ASSETS
 *      binding. Anything that isn't /api/* falls through to the site.
 *
 *   2. Provides a tiny JSON API backed by Workers KV:
 *
 *      GET  /api/scores            → top scores, high→low
 *      POST /api/scores            → { name, score, cleared } submit a run
 *
 *      GET  /api/progress/:id      → { solved: [...], updated }
 *      POST /api/progress/:id      → { solved: [...] } replace saved progress
 *
 *      GET  /api/feedback          → all puzzles' up/down totals (analysis)
 *      GET  /api/feedback/:puzzle  → { up, down } for one puzzle
 *      POST /api/feedback/:puzzle  → { vote: 'up'|'down', voterId }
 *
 * The progress `:id` is a random UUID the browser generates and keeps in
 * localStorage (a "save code"). It's the whole identity — no login, no
 * passwords, no personal data. Players can paste the code on another device
 * to sync. See js/progress.js on the frontend.
 *
 * Because the site and API share an origin there is no CORS to configure.
 * The permissive CORS headers below only matter if you later host the site
 * somewhere else; tighten ALLOW_ORIGIN if you do.
 */

const ALLOW_ORIGIN = '*';       // same-origin in practice; '*' keeps local dev easy
const MAX_ENTRIES  = 100;       // how many scores to keep on the board
const MAX_NAME_LEN = 20;
const MAX_SOLVED   = 500;       // sanity cap on a progress payload

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': ALLOW_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

/* Clamp a submitted name to something safe to display. */
function cleanName(raw) {
  return String(raw == null ? '' : raw)
    .replace(/[\u0000-\u001F\u007F]/g, '')   // strip control chars
    .trim()
    .slice(0, MAX_NAME_LEN) || 'Anon';
}

async function readBoard(env) {
  const raw = await env.SCORES.get('board');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function handleScores(request, env) {
  if (request.method === 'GET') {
    const board = await readBoard(env);
    board.sort((a, b) => (b.score || 0) - (a.score || 0));
    return json({ ok: true, entries: board.slice(0, MAX_ENTRIES) });
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); }
    catch (e) { return bad('invalid JSON'); }

    const score = Number(body.score);
    // Never trust the client: a run can't score more than the puzzle count,
    // and MAX_ENTRIES is a generous ceiling on that.
    if (!Number.isInteger(score) || score < 0 || score > 1000) {
      return bad('score out of range');
    }

    const entry = {
      name: cleanName(body.name),
      score: score,
      cleared: Number.isInteger(Number(body.cleared)) ? Number(body.cleared) : score,
      ts: Date.now(),
    };

    const board = await readBoard(env);
    board.push(entry);
    board.sort((a, b) => (b.score || 0) - (a.score || 0));
    const trimmed = board.slice(0, MAX_ENTRIES);
    await env.SCORES.put('board', JSON.stringify(trimmed));

    const rank = trimmed.findIndex(e => e.ts === entry.ts && e.name === entry.name) + 1;
    return json({ ok: true, rank: rank || null, entries: trimmed });
  }

  return bad('method not allowed', 405);
}

async function handleProgress(request, env, id) {
  // Only accept plausible save codes so KV can't be sprayed with junk keys.
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return bad('bad save code');
  const key = 'progress:' + id;

  if (request.method === 'GET') {
    const raw = await env.SCORES.get(key);
    if (!raw) return json({ ok: true, solved: [], updated: null });
    try {
      const data = JSON.parse(raw);
      return json({ ok: true, solved: data.solved || [], updated: data.updated || null });
    } catch (e) {
      return json({ ok: true, solved: [], updated: null });
    }
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); }
    catch (e) { return bad('invalid JSON'); }

    if (!Array.isArray(body.solved)) return bad('solved must be an array');
    const solved = body.solved
      .filter(v => typeof v === 'string' && v.length && v.length <= 100)
      .slice(0, MAX_SOLVED);

    const payload = { solved: solved, updated: Date.now() };
    await env.SCORES.put(key, JSON.stringify(payload));
    return json({ ok: true, solved: solved, updated: payload.updated });
  }

  return bad('method not allowed', 405);
}

/* ---- Puzzle feedback (thumbs up / down) ----
 * Stored two ways so it's useful now and analysable later:
 *
 *   feedback:<puzzleId>          → { up, down, updated }  running totals,
 *                                   cheap to read for display
 *   vote:<puzzleId>:<voterId>    → { vote, ts }  one row per voter so a
 *                                   person can change their mind without
 *                                   double-counting, and so you can export
 *                                   the raw data later
 *
 * voterId is the browser's save code (a random UUID). It isn't an account —
 * it just stops one person spamming the counter and lets a vote be updated.
 */
async function handleFeedback(request, env, puzzleId) {
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(puzzleId)) return bad('bad puzzle id');
  const aggKey = 'feedback:' + puzzleId;

  async function readAgg() {
    const raw = await env.SCORES.get(aggKey);
    if (!raw) return { up: 0, down: 0, updated: null };
    try {
      const a = JSON.parse(raw);
      return {
        up: Number(a.up) || 0,
        down: Number(a.down) || 0,
        updated: a.updated || null,
      };
    } catch (e) { return { up: 0, down: 0, updated: null }; }
  }

  if (request.method === 'GET') {
    const agg = await readAgg();
    return json({ ok: true, puzzleId: puzzleId, up: agg.up, down: agg.down });
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); }
    catch (e) { return bad('invalid JSON'); }

    const vote = body.vote === 'up' ? 'up' : body.vote === 'down' ? 'down' : null;
    if (!vote) return bad("vote must be 'up' or 'down'");

    const voter = String(body.voterId || '').trim();
    if (!/^[A-Za-z0-9-]{8,64}$/.test(voter)) return bad('bad voter id');

    const voteKey = 'vote:' + puzzleId + ':' + voter;
    const prevRaw = await env.SCORES.get(voteKey);
    let prev = null;
    if (prevRaw) {
      try { prev = JSON.parse(prevRaw).vote; } catch (e) { prev = null; }
    }

    // Same vote again → no change, just report current totals.
    if (prev === vote) {
      const agg = await readAgg();
      return json({ ok: true, puzzleId: puzzleId, up: agg.up, down: agg.down, unchanged: true });
    }

    const agg = await readAgg();
    if (prev === 'up') agg.up = Math.max(0, agg.up - 1);
    if (prev === 'down') agg.down = Math.max(0, agg.down - 1);
    if (vote === 'up') agg.up += 1;
    else agg.down += 1;
    agg.updated = Date.now();

    await env.SCORES.put(voteKey, JSON.stringify({ vote: vote, ts: Date.now() }));
    await env.SCORES.put(aggKey, JSON.stringify(agg));

    return json({ ok: true, puzzleId: puzzleId, up: agg.up, down: agg.down, changed: prev ? 'updated' : 'new' });
  }

  return bad('method not allowed', 405);
}

/* All feedback totals at once, for your own analysis.
 * GET /api/feedback  →  [{ puzzleId, up, down }, ...] */
async function handleFeedbackList(env) {
  const list = await env.SCORES.list({ prefix: 'feedback:' });
  const out = [];
  for (const k of list.keys) {
    const raw = await env.SCORES.get(k.name);
    if (!raw) continue;
    try {
      const a = JSON.parse(raw);
      out.push({
        puzzleId: k.name.slice('feedback:'.length),
        up: Number(a.up) || 0,
        down: Number(a.down) || 0,
        updated: a.updated || null,
      });
    } catch (e) { /* skip malformed */ }
  }
  out.sort((a, b) => (b.up + b.down) - (a.up + a.down));
  return json({ ok: true, feedback: out });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS' && path.startsWith('/api/')) {
      return json({ ok: true });
    }

    if (path === '/api/scores') {
      return handleScores(request, env);
    }

    const prog = path.match(/^\/api\/progress\/([^/]+)$/);
    if (prog) {
      return handleProgress(request, env, decodeURIComponent(prog[1]));
    }

    if (path === '/api/feedback') {
      return handleFeedbackList(env);
    }

    const fb = path.match(/^\/api\/feedback\/([^/]+)$/);
    if (fb) {
      return handleFeedback(request, env, decodeURIComponent(fb[1]));
    }

    if (path.startsWith('/api/')) {
      return bad('not found', 404);
    }

    // Everything else: the static site.
    return env.ASSETS.fetch(request);
  },
};
