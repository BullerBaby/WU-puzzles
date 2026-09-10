/* ==================== LEADERBOARD ====================
 * Two-tier high-score store for Challenge mode:
 *
 *   1. Personal best — always available, kept in localStorage on this
 *      browser. Never needs a network. This is the source of truth for
 *      "your best".
 *
 *   2. Global board — shared across everyone, served by the Cloudflare
 *      Worker in worker/index.js and stored in Workers KV. Because the site
 *      and the API are served by the same Worker, the endpoint is just a
 *      relative path — nothing to configure. If the API is unreachable the
 *      UI falls back to the personal board with a quiet offline note.
 *
 * Hosting the site somewhere other than the Worker? Set API_BASE to the
 * Worker's absolute URL, e.g. 'https://wu-puzzles.<you>.workers.dev'.
 *
 * Score entry shape: { name, score, cleared, ts }
 */

const PB_KEY = 'underworlds-challenge-pb-v1';
const NAME_KEY = 'underworlds-challenge-name-v1';

/* Same-origin by default. Only set this if the site is hosted separately
 * from the Worker that serves /api/*. */
const API_BASE = '';

const REMOTE = {
  url: API_BASE + '/api/scores',
  timeoutMs: 6000,
  maxEntries: 25,     // how many rows the UI shows
};

export function isGlobalEnabled() {
  return true;   // the API ships with the app
}

/* ---- Player name ---- */
export function getPlayerName() {
  try { return localStorage.getItem(NAME_KEY) || ''; }
  catch (e) { return ''; }
}
export function setPlayerName(name) {
  const clean = String(name || '').trim().slice(0, 20);
  try { localStorage.setItem(NAME_KEY, clean); } catch (e) {}
  return clean;
}

/* ---- Personal best (local) ---- */
export function getPersonalBest() {
  try {
    const raw = localStorage.getItem(PB_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return (v && typeof v.score === 'number') ? v : null;
  } catch (e) { return null; }
}

/* Records a finished run locally. Returns { isBest, best }. */
export function recordPersonal(entry) {
  const prev = getPersonalBest();
  const isBest = !prev || entry.score > prev.score;
  if (isBest) {
    try { localStorage.setItem(PB_KEY, JSON.stringify(entry)); } catch (e) {}
  }
  return { isBest, best: isBest ? entry : prev };
}

/* ---- Global board (remote, optional) ---- */
function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    const t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    promise.then(
      function (v) { clearTimeout(t); resolve(v); },
      function (e) { clearTimeout(t); reject(e); }
    );
  });
}

/* Fetch the global board, sorted high→low. Resolves with entries: [] on any
 * failure so the UI can degrade quietly. */
export async function fetchGlobal(period) {
  const p = period === 'day' ? 'day' : 'week';
  try {
    const url = REMOTE.url + '?period=' + p;
    const res = await withTimeout(fetch(url, { cache: 'no-cache' }), REMOTE.timeoutMs);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    entries.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    return {
      ok: true,
      period: data.period || p,
      periodKey: data.periodKey || null,
      entries: entries.slice(0, REMOTE.maxEntries),
    };
  } catch (e) {
    return { ok: false, entries: [], reason: String(e && e.message || e) };
  }
}

/* Submit a finished run. We POST just this one entry and let the Worker
 * merge it into the board server-side — no read-modify-write from the
 * browser, so simultaneous finishers can't clobber each other.
 * Resolves to { ok, rank?, entries } — ok:false means it stayed local-only. */
export async function submitGlobal(entry) {
  try {
    const res = await withTimeout(fetch(REMOTE.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: entry.name,
        score: entry.score,
        cleared: entry.cleared,
      }),
    }), REMOTE.timeoutMs);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return {
      ok: true,
      rank: data.rank || null,
      weekRank: data.weekRank || null,
      dayRank: data.dayRank || null,
      entries: entries,
    };
  } catch (e) {
    return { ok: false, entries: [], reason: String(e && e.message || e) };
  }
}
