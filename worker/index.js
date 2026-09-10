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

/* ---- Score periods -------------------------------------------------------
 * Boards are stored in time-boxed buckets instead of being wiped on a
 * schedule, so they "reset" automatically and old periods stay available:
 *
 *   board:week:<YYYY-MM-DD>   week starting that Monday at 06:00 local
 *   board:day:<YYYY-MM-DD>    that day from 06:00 to 06:00 local
 *
 * Both boundaries are 06:00 in BOARD_TZ, so a late-night session still
 * counts towards the day it started in.
 */
const BOARD_TZ = 'Europe/Copenhagen';
const RESET_HOUR = 6;

/* Y/M/D of a timestamp as seen in BOARD_TZ. */
function localYMD(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOARD_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find(p => p.type === t).value;
  return { y: Number(get('year')), m: Number(get('month')), d: Number(get('day')) };
}

const pad = (n) => String(n).padStart(2, '0');

/* Which day/week bucket a moment belongs to. Shifting back by RESET_HOUR
 * makes 06:00 the rollover point rather than midnight. */
export function periodKeys(now) {
  const shifted = new Date(now.getTime() - RESET_HOUR * 3600 * 1000);
  const { y, m, d } = localYMD(shifted);
  const dayKey = y + '-' + pad(m) + '-' + pad(d);

  // Find the Monday of that (shifted) local date.
  const asUTC = Date.UTC(y, m - 1, d);
  const dow = new Date(asUTC).getUTCDay();          // 0=Sun … 6=Sat
  const sinceMonday = (dow + 6) % 7;                 // Monday → 0
  const monday = localYMD(new Date(asUTC - sinceMonday * 86400000 + 12 * 3600000));
  const weekKey = monday.y + '-' + pad(monday.m) + '-' + pad(monday.d);

  return { day: dayKey, week: weekKey };
}

function boardKey(period, keys) {
  return period === 'day'
    ? 'board:day:' + keys.day
    : 'board:week:' + keys.week;
}

async function readBoardAt(env, key) {
  const raw = await env.SCORES.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function handleScores(request, env, url) {
  const keys = periodKeys(new Date());
  const period = (url && url.searchParams.get('period')) === 'day' ? 'day' : 'week';

  if (request.method === 'GET') {
    const board = await readBoardAt(env, boardKey(period, keys));
    board.sort((a, b) => (b.score || 0) - (a.score || 0));
    return json({
      ok: true,
      period: period,
      periodKey: period === 'day' ? keys.day : keys.week,
      entries: board.slice(0, MAX_ENTRIES),
    });
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

    // A run counts towards both the current week and the current day.
    const written = {};
    for (const p of ['week', 'day']) {
      const key = boardKey(p, keys);
      const board = await readBoardAt(env, key);
      board.push(entry);
      board.sort((a, b) => (b.score || 0) - (a.score || 0));
      const trimmed = board.slice(0, MAX_ENTRIES);
      await env.SCORES.put(key, JSON.stringify(trimmed));
      written[p] = trimmed;
    }

    const shown = written[period];
    const rank = shown.findIndex(e => e.ts === entry.ts && e.name === entry.name) + 1;
    return json({
      ok: true,
      period: period,
      rank: rank || null,
      entries: shown,
      weekRank: written.week.findIndex(e => e.ts === entry.ts && e.name === entry.name) + 1 || null,
      dayRank: written.day.findIndex(e => e.ts === entry.ts && e.name === entry.name) + 1 || null,
    });
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

/* ==================== PUZZLE ELO ====================
 * Only puzzles carry a rating — players don't. Each attempt is scored
 * against a fixed nominal player (ELO_ANCHOR), so:
 *
 *   player solves it  → the puzzle "lost"  → its rating falls
 *   player fails it   → the puzzle "won"   → its rating rises
 *
 * A puzzle therefore converges on the rating that matches how often people
 * actually fail it: failed ~50% of the time settles near the anchor, failed
 * more often settles higher.
 *
 *   elo:puzzle:<puzzleId>          → { rating, attempts, solves, updated }
 *   elorated:<puzzleId>:<playerId> → marker: this player already rated it
 *
 * Only a player's FIRST attempt at a puzzle counts, so replaying a small
 * set can't skew the ratings.
 *
 * Every puzzle starts at ELO_START and moves from there based purely on
 * results — there is no authored difficulty tier.
 */
const ELO_START = 1000;                  // where an unrated puzzle begins
const ELO_ANCHOR = 1000;                 // nominal "average player"


/* Ratings move a lot while provisional, then settle. */
function puzzleK(attempts) {
  return Math.max(8, 40 / Math.sqrt(Math.max(1, attempts)));
}

function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

async function readRating(env, key, fallback) {
  const raw = await env.SCORES.get(key);
  if (!raw) return { rating: fallback, attempts: 0, solves: 0, updated: null };
  try {
    const r = JSON.parse(raw);
    return {
      rating: Number(r.rating) || fallback,
      attempts: Number(r.attempts) || 0,
      solves: Number(r.solves) || 0,
      updated: r.updated || null,
    };
  } catch (e) {
    return { rating: fallback, attempts: 0, solves: 0, updated: null };
  }
}

async function handleElo(request, env, url) {
  /* GET /api/elo → every puzzle's rating, easiest first.
   * The app uses this to order a challenge run. */
  if (request.method === 'GET') {
    const list = await env.SCORES.list({ prefix: 'elo:puzzle:' });
    const out = [];
    for (const k of list.keys) {
      const r = await readRating(env, k.name, ELO_START);
      out.push({
        puzzleId: k.name.slice('elo:puzzle:'.length),
        rating: Math.round(r.rating),
        attempts: r.attempts,
        solves: r.solves,
        solveRate: r.attempts ? Math.round((r.solves / r.attempts) * 100) : null,
        provisional: r.attempts < 5,
        updated: r.updated,
      });
    }
    out.sort((a, b) => a.rating - b.rating);   // easiest first
    return json({ ok: true, anchor: ELO_ANCHOR, start: ELO_START, puzzles: out });
  }

  if (request.method !== 'POST') return bad('method not allowed', 405);

  let body;
  try { body = await request.json(); }
  catch (e) { return bad('invalid JSON'); }

  const puzzleId = String(body.puzzleId || '').trim();
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(puzzleId)) return bad('bad puzzle id');

  const playerId = String(body.playerId || '').trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(playerId)) return bad('bad player id');

  if (typeof body.solved !== 'boolean') return bad('solved must be a boolean');
  const solved = body.solved;

  const zKey = 'elo:puzzle:' + puzzleId;
  const markKey = 'elorated:' + puzzleId + ':' + playerId;

  const puzzle = await readRating(env, zKey, ELO_START);

  // This player has already rated this puzzle → report, change nothing.
  if (await env.SCORES.get(markKey)) {
    return json({
      ok: true, counted: false, reason: 'already rated by this player',
      puzzleRating: Math.round(puzzle.rating), puzzleDelta: 0,
    });
  }

  // From the puzzle's point of view: it "wins" when the player fails.
  const expPuzzleWin = expectedScore(puzzle.rating, ELO_ANCHOR);
  const actualPuzzleWin = solved ? 0 : 1;
  const k = puzzleK(puzzle.attempts);
  const delta = k * (actualPuzzleWin - expPuzzleWin);

  const updated = {
    rating: Math.max(100, puzzle.rating + delta),
    attempts: puzzle.attempts + 1,
    solves: puzzle.solves + (solved ? 1 : 0),
    updated: Date.now(),
  };

  await env.SCORES.put(zKey, JSON.stringify(updated));
  await env.SCORES.put(markKey, JSON.stringify({ solved: solved, ts: Date.now() }));

  return json({
    ok: true,
    counted: true,
    puzzleRating: Math.round(updated.rating),
    puzzleDelta: Math.round(delta),
    attempts: updated.attempts,
  });
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
      return handleScores(request, env, url);
    }

    const prog = path.match(/^\/api\/progress\/([^/]+)$/);
    if (prog) {
      return handleProgress(request, env, decodeURIComponent(prog[1]));
    }

    if (path === '/api/elo') {
      return handleElo(request, env, url);
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

    // Everything else: the static site. Assets are normally served before
    // this Worker even runs; we only get here for paths the asset server
    // didn't match, so fall back to index.html (the SPA behaviour we can't
    // use in wrangler.toml without shadowing /api/*).
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }
    return assetRes;
  },
};
