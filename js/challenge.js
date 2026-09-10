/* ==================== CHALLENGE MODE ====================
 * A run through the puzzles, one attempt each.
 *
 * How it plays:
 *   - Puzzles are ordered easiest→hardest by their measured Elo rating.
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

export function isActive() { return active; }

function hasPoll(game) {
  return Array.isArray(game.steps) && game.steps.some(function (s) { return s && s.poll; });
}

/* How far a puzzle can jump from its "true" position in the order. Ratings
 * are Elo points, so this is a rating-sized wobble: puzzles within roughly
 * this much of each other can swap places, but an easy one won't leap past a
 * much harder one. */
const ORDER_JITTER = 120;

/* Where an unrated puzzle sits until it has results. Mirrors ELO_START in
 * worker/index.js. */
const ELO_START = 1000;

function ratingOf(game, ratings) {
  const r = ratings && ratings[game.id];
  return (r && typeof r.rating === 'number') ? r.rating : ELO_START;
}

/* Build the run order from a pool of games (only scorable ones), easiest
 * first by Elo rating, with a random wobble so the order varies between
 * runs. Pass the ratings map from Elo.fetchPuzzleRatings(); without it every
 * puzzle is treated as unrated and the order is effectively random.
 * Returns the first game id, or null if nothing is scorable. */
export function startRun(pool, ratings) {
  order = (pool || [])
    .filter(hasPoll)
    .map(function (g) {
      // Sort on rating plus noise, so near-equal puzzles shuffle but the
      // overall easy→hard progression holds.
      const jitter = (Math.random() * 2 - 1) * ORDER_JITTER;
      return { game: g, key: ratingOf(g, ratings) + jitter };
    })
    .sort(function (a, b) { return a.key - b.key; })
    .map(function (x) { return x.game; });
  if (!order.length) { active = false; return null; }
  active = true;
  idx = 0; score = 0; cleared = 0;
  return order[idx].id;
}

export function currentPuzzleId() {
  return active && order[idx] ? order[idx].id : null;
}

/* Record a first-try solve of the current puzzle. Returns points awarded (1). */
export function solved() {
  if (!active) return 0;
  score += 1;
  cleared += 1;
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
    total: order.length,
    position: Math.min(idx + 1, order.length),
    complete: cleared >= order.length && order.length > 0,
  };
}

export function endRun() {
  active = false;
  return snapshot();
}
