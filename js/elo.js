/* ==================== PUZZLE ELO ====================
 * Puzzles carry a rating; players don't. Each attempt is reported to the
 * Worker, which nudges the puzzle's rating: solved → it falls, failed → it
 * rises. A puzzle converges on the rating that matches how often people
 * actually fail it.
 *
 * The challenge run uses these ratings to serve puzzles easiest-first (with
 * some deliberate shuffle so the order isn't identical every time).
 *
 * Only a player's first attempt at a given puzzle counts, so replaying the
 * set can't skew the ratings.
 */

import { ensureSaveCode } from './progress.js';

const API_BASE = '';
const TIMEOUT_MS = 6000;

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    const t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    promise.then(
      function (v) { clearTimeout(t); resolve(v); },
      function (e) { clearTimeout(t); reject(e); }
    );
  });
}

/* Report an attempt so the puzzle's rating can adjust. */
export async function reportAttempt(puzzleId, solved) {
  if (!puzzleId) return { ok: false, reason: 'no puzzle' };
  try {
    const res = await withTimeout(fetch(API_BASE + '/api/elo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puzzleId: puzzleId,
        playerId: ensureSaveCode(),
        solved: !!solved,
      }),
    }), TIMEOUT_MS);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    return {
      ok: true,
      counted: !!data.counted,
      puzzleRating: data.puzzleRating,
      puzzleDelta: data.puzzleDelta || 0,
    };
  } catch (e) {
    return { ok: false, reason: String(e && e.message || e) };
  }
}

/* One puzzle's current rating. Resolves { ok:false } if unreachable or the
 * puzzle has no rating yet (nobody has attempted it). */
export async function fetchPuzzleRating(puzzleId) {
  const res = await fetchPuzzleRatings();
  if (!res.ok) return { ok: false };
  const r = res.ratings[puzzleId];
  if (!r) return { ok: false, unrated: true, start: res.anchor };
  return { ok: true, ...r };
}

/* All puzzle ratings as { puzzleId: { rating, attempts, provisional } }.
 * Resolves with an empty map if the API can't be reached — callers fall back
 * every puzzle is then treated as unrated. */
export async function fetchPuzzleRatings() {
  try {
    const res = await withTimeout(
      fetch(API_BASE + '/api/elo', { cache: 'no-cache' }),
      TIMEOUT_MS
    );
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    const map = {};
    (data.puzzles || []).forEach(function (p) {
      map[p.puzzleId] = {
        rating: p.rating,
        attempts: p.attempts,
        provisional: p.provisional,
        solveRate: p.solveRate,
      };
    });
    return { ok: true, ratings: map, anchor: data.anchor };
  } catch (e) {
    return { ok: false, ratings: {}, reason: String(e && e.message || e) };
  }
}
