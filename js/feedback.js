/* ==================== PUZZLE FEEDBACK ====================
 * Thumbs up / down on a puzzle, sent to the Worker (worker/index.js) and
 * stored in KV for later analysis.
 *
 * Your own vote is also remembered in localStorage so the UI can show which
 * way you voted when you come back to a puzzle, without needing a round trip.
 *
 * The voter id is the same random save code used by js/progress.js — not an
 * account, just enough to stop one person spamming the counter and to let a
 * vote be changed rather than double-counted.
 */

import { ensureSaveCode } from './progress.js';

const VOTES_KEY = 'underworlds-votes-v1';
const API_BASE = '';      // same origin as the Worker
const TIMEOUT_MS = 6000;

function readVotes() {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return (v && typeof v === 'object') ? v : {};
  } catch (e) { return {}; }
}

function writeVotes(map) {
  try { localStorage.setItem(VOTES_KEY, JSON.stringify(map)); } catch (e) {}
}

/* 'up' | 'down' | null — how you voted on this puzzle, if at all. */
export function getMyVote(puzzleId) {
  const v = readVotes()[puzzleId];
  return (v === 'up' || v === 'down') ? v : null;
}

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    const t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    promise.then(
      function (v) { clearTimeout(t); resolve(v); },
      function (e) { clearTimeout(t); reject(e); }
    );
  });
}

/* Send a vote. Records locally first so the UI stays responsive even if the
 * network is down; resolves { ok, up, down } when the server confirms. */
export async function sendVote(puzzleId, vote) {
  if (!puzzleId || (vote !== 'up' && vote !== 'down')) {
    return { ok: false, reason: 'bad args' };
  }
  const votes = readVotes();
  votes[puzzleId] = vote;
  writeVotes(votes);

  try {
    const res = await withTimeout(fetch(API_BASE + '/api/feedback/' + encodeURIComponent(puzzleId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: vote, voterId: ensureSaveCode() }),
    }), TIMEOUT_MS);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    return { ok: true, up: data.up, down: data.down };
  } catch (e) {
    // The local record stands; the count just isn't synced.
    return { ok: false, reason: String(e && e.message || e) };
  }
}

/* Current totals for a puzzle. */
export async function fetchTotals(puzzleId) {
  try {
    const res = await withTimeout(
      fetch(API_BASE + '/api/feedback/' + encodeURIComponent(puzzleId), { cache: 'no-cache' }),
      TIMEOUT_MS
    );
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    return { ok: true, up: data.up || 0, down: data.down || 0 };
  } catch (e) {
    return { ok: false, up: 0, down: 0 };
  }
}
