/* ==================== SOLVE MODE ====================
 * Lets a puzzle be answered by MOVING fighters on the board instead of
 * picking a poll option. A step opts in with a `solution`:
 *
 *   solution: {
 *     movable: 'me',                    // which side you can move (default 'me')
 *     prompt:  'Move your fighters…',   // optional heading in the answer panel
 *     accept: {                         // required END position of each fighter
 *       I: 'slain',                     //   'slain'  → must be dead
 *       C: 'e2',                        //   a hex    → must be exactly there
 *       B: ['c1', 'd1'],                //   [hexes]  → any one of these
 *     },
 *     othersMayMove: false,             // default: fighters not listed in
 *   }                                   //   `accept` must end where they began
 *
 * Moves are NOT checked against Move distance or other rules — the accepted
 * end positions decide what counts as correct. The one rule that IS applied is
 * traps: a fighter that enters a hex holding a `trap` feature takes 2 damage
 * (slain if that reaches their Wounds) and the trap is removed. That makes
 * ordering matter, exactly as in the game.
 *
 * This module is pure logic (no DOM) so it can be tested on its own.
 * main.js owns the rendering and the click handling.
 */

const TRAP_DAMAGE = 2;
const STORE_KEY = 'underworlds-solve-v1';

let session = null;

/* ---------- helpers ---------- */
function clone(v) { return JSON.parse(JSON.stringify(v)); }

function snap(state) {
  return {
    positions: clone(state.positions || {}),
    wounds:    clone(state.wounds || {}),
    slain:     clone(state.slain || []),
    features:  clone(state.features || []),
  };
}

function nameOf(game, id) {
  const f = game.fighters[id] || {};
  return f.name || f.label || id;
}

export function hasSolution(step) { return !!(step && step.solution); }

/* ---------- session lifecycle ---------- */
export function isActive(gameId, stepIdx) {
  return !!session && session.gameId === gameId && session.stepIdx === stepIdx;
}

export function clearSession() { session = null; }

/* Create the session for this step if there isn't one yet. */
export function ensureSession(game, stepIdx, baseState) {
  if (isActive(game.id, stepIdx)) return session;
  const sol = game.steps[stepIdx].solution;
  session = {
    gameId: game.id,
    stepIdx: stepIdx,
    movable: sol.movable || 'me',
    initial: snap(baseState),
    cur: snap(baseState),
    history: [],
    selected: null,
    locked: false,
    message: '',
    result: null,        // null | 'correct' | 'wrong'
  };
  return session;
}

export function getSession() { return session; }

/* After a correct answer the puzzle may continue to a follow-up step (e.g. a
 * reveal via `revealOnCorrect`). That step's own state still has the fighters
 * where they started, so it should keep showing the moves that were made. */
export function carriesTo(game, stepIdx) {
  return !!session && session.gameId === game.id
    && session.result === 'correct' && stepIdx === session.stepIdx + 1;
}

/* The step's base state with the player's moves applied (a copy). */
export function currentState(baseState) {
  if (!session) return baseState;
  return Object.assign({}, baseState, clone(session.cur));
}

/* ---------- queries ---------- */
export function fighterAt(hex) {
  if (!session) return null;
  const p = session.cur.positions;
  for (const id in p) {
    if (p[id] === hex && session.cur.slain.indexOf(id) < 0) return id;
  }
  return null;
}

export function canMove() {
  return !!session && !session.locked;
}

export function moveCount() { return session ? session.history.length : 0; }

/* ---------- interaction ---------- */
/* Handle a tap on a hex. Returns { changed } — true when the board changed
 * and needs re-rendering. Also sets session.message for the status line. */
export function clickHex(game, hex, opts) {
  opts = opts || {};
  const s = session;
  if (!s || s.locked) return { changed: false };
  const here = fighterAt(hex);

  // Tapping one of your own fighters selects it (tap again to deselect).
  if (here && game.fighters[here] && game.fighters[here].side === s.movable) {
    s.selected = (s.selected === here) ? null : here;
    s.message = s.selected ? nameOf(game, here) + ' selected \u2014 tap a hex to move them there.' : '';
    return { changed: true };
  }

  // Nothing selected: nothing to do.
  if (!s.selected) {
    s.message = here ? 'That isn\u2019t one of your fighters.' : 'Tap one of your fighters first.';
    return { changed: true };
  }

  if (here) { s.message = 'That hex is occupied.'; return { changed: true }; }
  if (opts.blocked) { s.message = 'That hex is blocked.'; return { changed: true }; }

  // ---- move ----
  const id = s.selected;
  s.history.push(clone(s.cur));
  const from = s.cur.positions[id];
  s.cur.positions[id] = hex;
  s.selected = null;
  s.result = null;
  let msg = nameOf(game, id) + ' moved to ' + hex + '.';

  // Trap: 2 damage to whoever enters, then the trap is removed.
  const ti = s.cur.features.findIndex(function (f) { return f.type === 'trap' && f.hex === hex; });
  if (ti >= 0) {
    s.cur.features.splice(ti, 1);
    const w = (s.cur.wounds[id] || 0) + TRAP_DAMAGE;
    s.cur.wounds[id] = w;
    const max = (game.fighters[id] || {}).wounds;
    if (max != null && w >= max) {
      s.cur.slain.push(id);
      delete s.cur.positions[id];
      msg = nameOf(game, id) + ' entered the trap on ' + hex + ' \u2014 2 damage, slain. The trap is gone.';
    } else {
      msg = nameOf(game, id) + ' entered the trap on ' + hex + ' \u2014 2 damage. The trap is gone.';
    }
  }
  s.message = msg;
  return { changed: true, moved: id, from: from, to: hex };
}

export function undo() {
  const s = session;
  if (!s || !s.history.length) return false;
  s.cur = s.history.pop();
  s.selected = null;
  s.locked = false;
  s.result = null;
  s.message = 'Last move undone.';
  return true;
}

export function reset() {
  const s = session;
  if (!s) return;
  s.cur = clone(s.initial);
  s.history = [];
  s.selected = null;
  s.locked = false;
  s.result = null;
  s.message = 'Back to the starting position.';
}

/* ---------- checking ---------- */
export function check(game) {
  const s = session;
  const sol = game.steps[s.stepIdx].solution;
  const accept = sol.accept || {};
  const wrong = [];

  for (const id in game.fighters) {
    const req = accept[id];
    const alive = s.cur.slain.indexOf(id) < 0;
    const now = s.cur.positions[id];
    const startedSlain = s.initial.slain.indexOf(id) >= 0;

    if (req === undefined) {
      if (sol.othersMayMove) continue;
      // Not part of the solution: must be exactly as it started.
      if (startedSlain) { if (alive) wrong.push(id); }
      else if (!alive || now !== s.initial.positions[id]) wrong.push(id);
    } else if (req === 'slain') {
      if (alive) wrong.push(id);
    } else {
      const ok = [].concat(req);
      if (!alive || ok.indexOf(now) < 0) wrong.push(id);
    }
  }
  return { correct: wrong.length === 0, wrong: wrong };
}

/* ---------- attempt tracking (mirrors what polls do with clicks) ---------- */
function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}
function writeStore(o) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) {}
}

/* Record a submitted answer. `firstTry` is true if it's the first one ever
 * made for this puzzle (since the last reset). */
export function recordAttempt(gameId, correct) {
  const all = readStore();
  const rec = all[gameId] || { attempts: 0, solved: false };
  const firstTry = rec.attempts === 0;
  rec.attempts += 1;
  if (correct) rec.solved = true;
  all[gameId] = rec;
  writeStore(all);
  return { firstTry: firstTry };
}

export function hasAttempted(gameId) {
  const rec = readStore()[gameId];
  return !!(rec && rec.attempts > 0);
}

export function resetAttempts(gameId) {
  const all = readStore();
  if (all[gameId]) { delete all[gameId]; writeStore(all); }
}
