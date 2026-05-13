/* ==================== GAME RESOLUTION & STATE EXPANSION ====================
 * Two preprocessing passes run once per game load:
 *
 *   1. resolveWarbands(game): if game.warbands = { me, opp }, pulls fighters
 *      and abilities from the WARBANDS registry. Inline game.fighters keys
 *      override warband fighters (useful for renaming or tweaking one stat).
 *
 *   2. expandSteps(game): walks game.steps and computes each step's full
 *      _state. A step can declare its state two ways:
 *        - state: { ... }    → full snapshot (no inheritance)
 *        - diff:  { ... }    → merged onto the previous step's _state
 *      In diff mode, OBJECT fields (positions, wounds, tokens, upgrades,
 *      abilitiesUsed, hand) deep-merge with the previous; ARRAY fields
 *      (slain, inspired, features) and scalars (glory) replace when present.
 *      Field value `null` resets that field to its default (empty).
 *      `powerStep` always defaults to [] for each step — it never inherits.
 */

import { WARBANDS } from '../data/warbands.js';

export function resolveWarbands(game) {
  if (!game.warbands) return;
  const fighters = {};
  const abilities = { me: [], opp: [] };
  ['me', 'opp'].forEach(function(side) {
    const wbId = game.warbands[side];
    if (!wbId) return;
    const wb = WARBANDS[wbId];
    if (!wb) { console.warn('Unknown warband:', wbId); return; }
    abilities[side] = (wb.abilities || []).slice();
    for (const code in wb.fighters) {
      fighters[code] = Object.assign({}, wb.fighters[code], { side: side });
    }
  });
  // Merge inline overrides (per-fighter tweaks)
  if (game.fighters) {
    for (const code in game.fighters) {
      fighters[code] = Object.assign({}, fighters[code] || {}, game.fighters[code]);
    }
  }
  game.fighters = fighters;
  if (!game.abilities) game.abilities = abilities;
  else {
    // Per-side abilities override is allowed
    if (!game.abilities.me)  game.abilities.me  = abilities.me;
    if (!game.abilities.opp) game.abilities.opp = abilities.opp;
  }
}

export function defaultState() {
  return {
    positions: {}, wounds: {}, slain: [],
    inspired: [], glory: [0, 0], tokens: {}, upgrades: {},
    abilitiesUsed: {}, activationsUsed: {}, features: [], hand: { me: 0, opp: 0 },
    powerStep: [],
  };
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/* Shallow merge of two objects with null-as-delete on the patch side. */
function mergeShallow(prev, patch) {
  const out = Object.assign({}, prev || {});
  for (const k in patch) {
    if (patch[k] === null) delete out[k];
    else out[k] = patch[k];
  }
  return out;
}

/* Merge hand object: top level (me/opp) shallow merge, but each side itself
 * is also merged (so `hand: { me: { power: [...] } }` keeps me.objectives). */
function mergeHand(prev, patch) {
  const out = Object.assign({}, prev || {});
  ['me', 'opp'].forEach(function(side) {
    if (!(side in patch)) return;
    if (patch[side] === null) { out[side] = 0; return; }
    if (typeof patch[side] === 'number') { out[side] = patch[side]; return; }
    // Patch is an object — deep-merge with existing
    const existing = isPlainObject(prev && prev[side]) ? prev[side] : {};
    out[side] = mergeShallow(existing, patch[side]);
  });
  return out;
}

function applyDiff(prev, diff) {
  const out = {};
  for (const k in prev) out[k] = prev[k];
  out.powerStep = []; // never inherits — must be re-specified each step
  for (const k in diff) {
    const v = diff[k];
    if (v === null) {
      const def = defaultState()[k];
      out[k] = Array.isArray(def) ? [] : (isPlainObject(def) ? {} : def);
      continue;
    }
    if (k === 'positions' || k === 'wounds' || k === 'tokens' ||
        k === 'upgrades'  || k === 'abilitiesUsed' || k === 'activationsUsed') {
      out[k] = mergeShallow(prev[k] || {}, v);
    } else if (k === 'hand') {
      out[k] = mergeHand(prev[k], v);
    } else {
      // Arrays (slain, inspired, features), scalars (glory), powerStep: replace
      out[k] = v;
    }
  }
  return out;
}

export function expandSteps(game) {
  const base = defaultState();
  let prev = base;
  game.steps.forEach(function(step) {
    let next;
    if (step.state) {
      // Full state — fill in defaults for any missing fields
      next = Object.assign({}, base);
      for (const k in step.state) next[k] = step.state[k];
    } else if (step.diff) {
      next = applyDiff(prev, step.diff);
    } else {
      // No state and no diff: inherit but reset powerStep
      next = Object.assign({}, prev);
      next.powerStep = [];
    }
    step._state = next;
    prev = next;
  });
}
