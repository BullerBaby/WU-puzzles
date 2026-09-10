/* ==================== PROGRESS ====================
 * Tracks which puzzles you've solved.
 *
 * Local-first: everything works offline and with no account. The solved set
 * lives in localStorage, so closing the tab or rebooting keeps it.
 *
 * Optional cross-device sync via a "save code": the browser generates a
 * random UUID on first use and can push/pull the solved set to the Worker
 * (worker/index.js → /api/progress/:id). Paste the same code on another
 * device to sync. The code IS the identity — no login, no password, no
 * personal data stored.
 *
 * Usage:
 *   markSolved('puzzle-id')       // records + syncs in the background
 *   isSolved('puzzle-id')         // bool
 *   getSolved()                   // array of ids
 *   getSaveCode()                 // the code to show the player
 *   useSaveCode(code)             // adopt a code from another device, then pull
 *   syncNow()                     // manual push/pull, resolves { ok, solved }
 */

const SOLVED_KEY = 'underworlds-solved-v1';
const CODE_KEY = 'underworlds-savecode-v1';

const API_BASE = '';    // same origin as the Worker; see js/leaderboard.js
const TIMEOUT_MS = 6000;

/* ---- local store ---- */
function readSolved() {
  try {
    const raw = localStorage.getItem(SOLVED_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}

function writeSolved(list) {
  try { localStorage.setItem(SOLVED_KEY, JSON.stringify(list)); } catch (e) {}
}

export function getSolved() { return readSolved(); }

export function isSolved(id) { return readSolved().indexOf(id) >= 0; }

export function solvedCount() { return readSolved().length; }

/* Record a solve. Returns true if this was new. Pushes to the server in the
 * background when a save code exists — failures are silent by design, the
 * local copy is what matters. */
export function markSolved(id) {
  if (!id) return false;
  const list = readSolved();
  if (list.indexOf(id) >= 0) return false;
  list.push(id);
  writeSolved(list);
  if (hasSaveCode()) push().catch(function () {});
  return true;
}

export function resetSolved() {
  writeSolved([]);
}

/* ---- save code ---- */
export function hasSaveCode() {
  try { return !!localStorage.getItem(CODE_KEY); } catch (e) { return false; }
}

export function getSaveCode() {
  try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; }
}

/* Create a code if there isn't one yet, and return it. */
export function ensureSaveCode() {
  let code = getSaveCode();
  if (code) return code;
  code = (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  try { localStorage.setItem(CODE_KEY, code); } catch (e) {}
  return code;
}

/* Adopt a code from another device, then pull its progress down and merge. */
export async function useSaveCode(code) {
  const clean = String(code || '').trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(clean)) {
    return { ok: false, reason: 'That doesn\u2019t look like a valid save code.' };
  }
  try { localStorage.setItem(CODE_KEY, clean); } catch (e) {}
  return pull();
}

/* ---- network ---- */
function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    const t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    promise.then(
      function (v) { clearTimeout(t); resolve(v); },
      function (e) { clearTimeout(t); reject(e); }
    );
  });
}

function endpoint() {
  return API_BASE + '/api/progress/' + encodeURIComponent(getSaveCode());
}

/* Upload the local solved set. */
export async function push() {
  if (!hasSaveCode()) return { ok: false, reason: 'no save code' };
  try {
    const res = await withTimeout(fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solved: readSolved() }),
    }), TIMEOUT_MS);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    return { ok: true, solved: data.solved || [] };
  } catch (e) {
    return { ok: false, reason: String(e && e.message || e) };
  }
}

/* Download the server's solved set and union it with the local one, so
 * syncing never loses solves made offline on either device. */
export async function pull() {
  if (!hasSaveCode()) return { ok: false, reason: 'no save code' };
  try {
    const res = await withTimeout(fetch(endpoint(), { cache: 'no-cache' }), TIMEOUT_MS);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    const remote = Array.isArray(data.solved) ? data.solved : [];
    const merged = Array.from(new Set(readSolved().concat(remote)));
    writeSolved(merged);
    // If the union is bigger than what the server had, send the difference back.
    if (merged.length > remote.length) push().catch(function () {});
    return { ok: true, solved: merged };
  } catch (e) {
    return { ok: false, reason: String(e && e.message || e) };
  }
}

/* Pull then push — the safe two-way sync. */
export async function syncNow() {
  ensureSaveCode();
  const res = await pull();
  if (!res.ok) return res;
  return push();
}
