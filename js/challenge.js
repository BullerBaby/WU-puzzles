/* ==================== CHALLENGE MODE ====================
 * A run through the puzzles, one attempt each.
 *
 * How it plays:
 *   - Puzzles are ordered easiest→hardest by their `difficulty` (1..5).
 *   - You're served each puzzle exactly once, in that order. No puzzle is
 *     ever repeated within a run.
 *   - Each puzzle's decision (its poll step) is scored simply:
 *       first-try correct → +1 point
 *       wrong answer      → the run ends
 *   - When you clear the final puzzle, the run ends with a perfect score.
 *
 * This module is pure logic + state. main.js owns the DOM and drives it:
 *   startRun(pool) → first puzzle id
 *   solved() / failed()  → called from the poll result hook
 *   nextPuzzleId()       → next puzzle id, or null when the set is exhausted
 *   snapshot()           → { score, cleared, total, position, ... } for the HUD
 *
 * A "poll puzzle" is any game with at least one poll step. Games without a
 * poll can't be scored, so the run skips them.
 */

let active = false;
let order = [];         // array of game objects, easiest first
let idx = 0;            // index into `order`
let score = 0;          // 1 point per correct answer
let cleared = 0;        // puzzles solved this run (== score here)
let difficultyReached = 1;

export function isActive() { return active; }

function difficultyOf(game) {
  const d = Number(game && game.difficulty);
  return (d >= 1 && d <= 5) ? d : 3; // untagged → middle
}

function hasPoll(game) {
  return Array.isArray(game.steps) && game.steps.some(function (s) { return s && s.poll; });
}

/* Build the run order from a pool of games (only scorable ones), easiest
 * first, then by title for a stable tie-break. Returns the first game id,
 * or null if nothing is scorable. */
export function startRun(pool) {
  order = (pool || [])
    .filter(hasPoll)
    .slice()
    .sort(function (a, b) {
      const da = difficultyOf(a), db = difficultyOf(b);
      if (da !== db) return da - db;
      return String(a.title || a.id).localeCompare(String(b.title || b.id));
    });
  if (!order.length) { active = false; return null; }
  active = true;
  idx = 0; score = 0; cleared = 0;
  difficultyReached = difficultyOf(order[0]);
  return order[idx].id;
}

export function currentPuzzleId() {
  return active && order[idx] ? order[idx].id : null;
}

/* Record a first-try solve of the current puzzle. Returns points awarded (1). */
export function solved() {
  if (!active) return 0;
  const game = order[idx];
  score += 1;
  cleared += 1;
  difficultyReached = Math.max(difficultyReached, difficultyOf(game));
  return 1;
}

/* Record a wrong answer — ends the run. Returns the final snapshot. */
export function failed() {
  if (!active) return snapshot();
  active = false;
  return snapshot();
}

/* Advance to the next puzzle. Never repeats: returns null once every puzzle
 * has been served, which signals the run is complete. */
export function nextPuzzleId() {
  if (!active) return null;
  idx += 1;
  if (idx >= order.length) {
    active = false;   // whole set cleared — run complete
    return null;
  }
  return order[idx].id;
}

export function snapshot() {
  return {
    active: active,
    score: score,
    cleared: cleared,
    difficultyReached: difficultyReached,
    total: order.length,
    position: Math.min(idx + 1, order.length),
    complete: cleared >= order.length && order.length > 0,
  };
}

export function endRun() {
  active = false;
  return snapshot();
}
