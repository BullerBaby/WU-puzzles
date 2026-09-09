/* ==================== LEADERBOARD ====================
 * Two-tier high-score store for Challenge mode:
 *
 *   1. Personal best — always available, kept in localStorage on this
 *      browser. Never needs a network. This is the source of truth for
 *      "your best".
 *
 *   2. Global board — optional, shared across everyone. Because this app is
 *      a static site with no backend, the global board talks to a small
 *      hosted key-value endpoint (see REMOTE below). If that endpoint is
 *      unset or unreachable, everything still works — the UI just shows the
 *      personal board and a quiet "global board offline" note.
 *
 * Swapping the backend: set REMOTE.url to any endpoint that supports
 * GET (returns the JSON array) and PUT (replaces it with the posted JSON
 * array). jsonblob.com works with no signup; a Firebase RTDB URL, a
 * Cloudflare Worker KV, or your own tiny API work just as well. If you
 * prefer no global board at all, set REMOTE.url to '' (empty string).
 *
 * Score entry shape: { name, score, streak, cleared, difficultyReached, ts }
 */

const PB_KEY = 'underworlds-challenge-pb-v1';
const NAME_KEY = 'underworlds-challenge-name-v1';

/* ---- Remote config -------------------------------------------------------
 * Default is empty so the project ships without calling any third party.
 * Drop in a jsonblob URL (create one at https://jsonblob.com — it hands you
 * a URL like https://jsonblob.com/api/jsonBlob/<id>) to enable the shared
 * board. The blob must be initialised to an empty array: []
 */
const REMOTE = {
  url: '',            // e.g. 'https://jsonblob.com/api/jsonBlob/1234567890'
  timeoutMs: 6000,
  maxEntries: 25,     // keep the board small
};

export function isGlobalEnabled() {
  return typeof REMOTE.url === 'string' && REMOTE.url.length > 0;
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

/* Fetch the global board, sorted high→low. Resolves to [] on any failure. */
export async function fetchGlobal() {
  if (!isGlobalEnabled()) return { ok: false, entries: [], reason: 'disabled' };
  try {
    const res = await withTimeout(fetch(REMOTE.url, { cache: 'no-cache' }), REMOTE.timeoutMs);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    const entries = Array.isArray(data) ? data : [];
    entries.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    return { ok: true, entries: entries };
  } catch (e) {
    return { ok: false, entries: [], reason: String(e && e.message || e) };
  }
}

/* Submit a finished run to the global board. Best-effort: read-merge-write.
 * Resolves to { ok, rank?, entries } — ok:false means it stayed local-only. */
export async function submitGlobal(entry) {
  if (!isGlobalEnabled()) return { ok: false, entries: [], reason: 'disabled' };
  try {
    const current = await fetchGlobal();
    const entries = current.ok ? current.entries.slice() : [];
    entries.push(entry);
    entries.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    const trimmed = entries.slice(0, REMOTE.maxEntries);
    const res = await withTimeout(fetch(REMOTE.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trimmed),
    }), REMOTE.timeoutMs);
    if (!res.ok) throw new Error('http ' + res.status);
    const rank = trimmed.indexOf(entry) + 1;
    return { ok: true, rank: rank, entries: trimmed };
  } catch (e) {
    return { ok: false, entries: [], reason: String(e && e.message || e) };
  }
}
