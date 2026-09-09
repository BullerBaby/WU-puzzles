/* ==================== CHALLENGE MODE ====================
 * An endless, ramping run built on top of the existing puzzles.
 *
 * How it plays:
 *   - Puzzles are ordered easiest→hardest by their `difficulty` (1..5).
 *   - You're served them in that order. When you clear the hardest, the run
 *     loops back to the start but at a higher "ramp", which raises the score
 *     multiplier — so the same puzzles are worth progressively more.
 *   - Each puzzle's decision (its poll step) is scored:
 *       first-try correct → points, and your streak grows
 *       wrong answer      → the run ends
 *   - Points for a solve = BASE × difficulty × streakMultiplier × rampMultiplier
 *
 * This module is pure logic + state. main.js owns the DOM and drives it:
 *   startRun(pool) → first puzzle id
 *   solved()  / failed()  → called from the poll result hook
 *   nextPuzzleId()        → what to load after a solve
 *   snapshot()            → { score, streak, cleared, ... } for the HUD
 *
 * A "poll puzzle" is any game with at least one poll step. Games without a
 * poll can't be scored, so the run skips them.
 */

const BASE = 100;

let active = false;
let order = [];         // array of game objects, easiest first
let idx = 0;            // index into `order`
let ramp = 0;           // how many full loops completed (0 on first pass)
let score = 0;
let streak = 0;
let bestStreak = 0;
let cleared = 0;        // puzzles solved this run
let difficultyReached = 1;
let lastAward = 0;      // points from the most recent solve (for HUD pop)

export function isActive() { return active; }

function difficultyOf(game) {
  const d = Number(game && game.difficulty);
  return (d >= 1 && d <= 5) ? d : 3; // untagged → middle
}

function hasPoll(game) {
  return Array.isArray(game.steps) && game.steps.some(function (s) { return s && s.poll; });
}

/* streak multiplier: 1.0, 1.2, 1.4 ... capped at 3.0 (i.e. +0.2 per prior solve) */
function streakMult() {
  return Math.min(3, 1 + streak * 0.2);
}
/* ramp multiplier: +50% per completed loop */
function rampMult() {
  return 1 + ramp * 0.5;
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
  idx = 0; ramp = 0; score = 0; streak = 0; bestStreak = 0;
  cleared = 0; difficultyReached = difficultyOf(order[0]); lastAward = 0;
  return order[idx].id;
}

export function currentPuzzleId() {
  return active && order[idx] ? order[idx].id : null;
}

/* Record a first-try solve of the current puzzle. Returns the points awarded. */
export function solved() {
  if (!active) return 0;
  const game = order[idx];
  const award = Math.round(BASE * difficultyOf(game) * streakMult() * rampMult());
  score += award;
  lastAward = award;
  streak += 1;
  if (streak > bestStreak) bestStreak = streak;
  cleared += 1;
  difficultyReached = Math.max(difficultyReached, difficultyOf(game));
  return award;
}

/* Record a wrong answer — ends the run. Returns the final snapshot. */
export function failed() {
  if (!active) return snapshot();
  active = false;
  return snapshot();
}

/* Advance to the next puzzle. Loops with a ramp increase at the end.
 * Returns the next game id (always defined while a run is active). */
export function nextPuzzleId() {
  if (!active) return null;
  idx += 1;
  if (idx >= order.length) {   // looped the whole set → ramp up
    idx = 0;
    ramp += 1;
  }
  return order[idx].id;
}

export function snapshot() {
  return {
    active: active,
    score: score,
    streak: streak,
    bestStreak: bestStreak,
    cleared: cleared,
    ramp: ramp,
    difficultyReached: difficultyReached,
    lastAward: lastAward,
    total: order.length,
    position: idx + 1,
    streakMult: streakMult(),
    rampMult: rampMult(),
  };
}

export function endRun() {
  active = false;
  return snapshot();
}
