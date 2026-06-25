/* ==================== MAIN ====================
 * Entry point. Holds the small mutable app state (current game / step / etc.),
 * orchestrates the per-step render pipeline, and wires DOM event listeners.
 *
 * Module browses:
 *   data/boards.js, data/warbands.js, data/games.js — pure data
 *   js/state.js          — game resolution + step expansion
 *   js/board.js          — board SVG, hex math, features, legend
 *   js/warband-panel.js  — side panels (fighters, hands, dice, etc.)
 *   js/poll.js           — per-step opinion polls
 *   js/custom-games.js   — load/save/validate user games
 *
 * Loaded with <script type="module">, so DOM is ready when the module runs.
 */

import { BOARDS } from '../data/boards.js';
import { GAMES }  from '../data/games.js';

import { resolveWarbands, expandSteps } from './state.js';
import { renderBoard, renderLegend, renderFeatures, hexCenter, svgEl } from './board.js';
import {
  renderFighterCards, updateFighterCards, renderFighterTokens,
  renderAbilities, renderActivations, renderDecks, renderWarbandLabels,
  renderHands, renderDice, renderPowerStep,
} from './warband-panel.js';
import { renderPoll, resetStepAnswers } from './poll.js';
import {
  rebuildGameNav, loadCustomFromInput, fillTemplate,
  downloadCurrent, clearCustoms, loadSavedCustoms,
  getFilteredGames, getCurrentTag, setCurrentTag,
} from './custom-games.js';

/* ==================== STATE ==================== */
let currentGame  = null;
let currentBoard = null;
let currentStep  = 0;

/* ==================== SEEN-PUZZLE TRACKER ====================
 * Remembers which puzzles the user has loaded, so the "Next puzzle"
 * button can pick a random unseen one rather than just stepping by
 * index. Persisted in localStorage; if storage fails (private mode,
 * quota), tracking degrades silently to "nothing seen yet". */
const SEEN_KEY = 'underworlds-seen-puzzles-v1';

function loadSeen() {
  try {
    const arr = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) { return new Set(); }
}
function saveSeen(seen) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen))); }
  catch (e) {}
}
function markSeen(gameId) {
  const seen = loadSeen();
  if (seen.has(gameId)) return;
  seen.add(gameId);
  saveSeen(seen);
}
/* Pick a random game the user hasn't seen yet, excluding the current one.
 * Operates on the currently-filtered pool (see custom-games.getFilteredGames),
 * so e.g. when "demo" is selected only demos are eligible. If everything in
 * the pool is seen, reset the seen list (keeping just the current puzzle so
 * we don't immediately re-pick it) and return a random other game from the
 * pool. Returns null if the filtered pool has 0 or 1 entries. */
function pickRandomUnseen(currentId) {
  let seen = loadSeen();
  const filtered = getFilteredGames();
  let pool = filtered.filter(function(g) { return g.id !== currentId && !seen.has(g.id); });
  if (pool.length === 0) {
    // All seen in this filter — reset, retaining only the current id so we don't loop.
    seen = new Set(currentId ? [currentId] : []);
    saveSeen(seen);
    pool = filtered.filter(function(g) { return g.id !== currentId; });
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ==================== APPLY STEP ==================== */
function applyStep(idx) {
  const game = currentGame;
  const board = currentBoard;
  const step = game.steps[idx];
  const state = step._state || step.state;

  for (const id in game.fighters) {
    const pos = state.positions[id];
    const el = document.getElementById('f-' + id);
    if (!el) continue;
    const slain = (state.slain || []).indexOf(id) >= 0;
    const inspired = (state.inspired || []).indexOf(id) >= 0;
    if (pos) {
      const { x, y } = hexCenter(pos, board.rows);
      el.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
    }
    el.classList.toggle('slain', slain);
    el.classList.toggle('inspired', inspired);
    const wounds = (state.wounds || {})[id] || 0;
    const wb = document.getElementById('w-' + id);
    if (wounds > 0 && !slain) {
      wb.setAttribute('opacity', '1');
      wb.querySelector('text').textContent = wounds;
    } else {
      wb.setAttribute('opacity', '0');
    }
    renderFighterTokens(id, (state.tokens || {})[id], slain);
  }

  if (step.anim && step.anim.attack) {
    const af = step.anim.attack;
    const prev = idx > 0 ? (game.steps[idx-1]._state || game.steps[idx-1].state) : null;
    const tpos = (prev && prev.positions[af.target]) || state.positions[af.target];
    if (tpos) {
      const { x, y } = hexCenter(tpos, board.rows);
      const layer = document.getElementById('dmg-layer');
      const wrap = svgEl('g', { transform: 'translate(' + x.toFixed(1) + ',' + (y - 18).toFixed(1) + ')' });
      const inner = svgEl('g', { class: 'dmg-flash' });
      const tx = svgEl('text', { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--danger)' });
      tx.textContent = '−' + af.dmg;
      inner.appendChild(tx);
      wrap.appendChild(inner);
      layer.appendChild(wrap);
      setTimeout(function() { if (wrap.parentNode) wrap.remove(); }, 1500);
    }
  }

  const gl = state.glory || [0, 0];
  document.getElementById('glory-me').textContent = gl[0];
  document.getElementById('glory-opp').textContent = gl[1];
  document.getElementById('curr-notation').textContent = step.notation || '';
  document.getElementById('curr-title').textContent = step.title || '';
  document.getElementById('curr-explanation').textContent = step.explanation || '';
  document.getElementById('step-indicator').textContent = (idx + 1) + ' / ' + game.steps.length;
  document.getElementById('current-round').textContent = game.round || 1;

  renderDice(step.dice);
  renderPowerStep(state.powerStep);
  renderHands(state);
  renderFeatures(state, board);
  updateFighterCards(state, game);
  renderAbilities(game, state);
  renderActivations(state);
  renderPoll(game, idx, function(stepIdx) {
    // If this step opts in, reveal the next step (e.g. the opponent's hidden
    // power card) as soon as the correct option is chosen.
    const s = game.steps[stepIdx];
    if (s && s.revealOnCorrect && stepIdx === currentStep && stepIdx + 1 < game.steps.length) {
      goStep(1);
    }
  });

  const lines = document.querySelectorAll('.notation-line');
  for (let i = 0; i < lines.length; i++) {
    lines[i].classList.toggle('current', i === idx);
  }
  // Scroll the active line into view, but ONLY within the notation-log container.
  // Using element.scrollIntoView() would scroll the whole document when the log
  // doesn't have its own scroll context — making the page jump when changing
  // puzzles or stepping through. This manual version is contained.
  const active = lines[idx];
  if (active) {
    const container = active.parentElement;
    if (container) {
      const cTop = container.scrollTop;
      const cBot = cTop + container.clientHeight;
      const aTop = active.offsetTop;
      const aBot = aTop + active.offsetHeight;
      if (aTop < cTop)      container.scrollTop = aTop;
      else if (aBot > cBot) container.scrollTop = aBot - container.clientHeight;
    }
  }
  document.getElementById('btn-prev').disabled = (idx === 0);
  document.getElementById('btn-next').disabled = (idx === game.steps.length - 1);
}

function goStep(delta) {
  const ni = currentStep + delta;
  if (ni < 0 || ni >= currentGame.steps.length) return;
  currentStep = ni;
  applyStep(currentStep);
}

function buildLog(game) {
  const log = document.getElementById('notation-log');
  log.innerHTML = '';
  game.steps.forEach(function(s, i) {
    const div = document.createElement('div');
    div.className = 'notation-line';
    div.textContent = (i + 1) + '.  ' + (s.notation || s.title || '(step ' + (i+1) + ')');
    div.onclick = function() { currentStep = i; applyStep(i); };
    log.appendChild(div);
  });
}

function loadGame(gameId) {
  const game = GAMES.find(function(g) { return g.id === gameId; });
  if (!game) return;
  resolveWarbands(game);
  expandSteps(game);
  currentGame = game;
  currentBoard = BOARDS[game.board] || BOARDS['embergard-1'];
  currentStep = 0;
  markSeen(game.id);
  rebuildGameNav(game.id);
  renderBoard(game);
  renderLegend(game);
  renderFighterCards(game);
  renderWarbandLabels(game);
  renderDecks(game);
  buildLog(game);
  setTimeout(function() { applyStep(0); }, 50);
}

function navGame(delta) {
  if (!currentGame) return;
  // Step through the filtered pool (set by the tag dropdown). If the
  // current game isn't in the pool (e.g. user just changed the tag),
  // jump to the first or last game in the pool depending on direction.
  const pool = getFilteredGames();
  if (!pool.length) return;
  const idx = pool.findIndex(function(g) { return g.id === currentGame.id; });
  if (idx < 0) {
    loadGame(pool[delta > 0 ? 0 : pool.length - 1].id);
    return;
  }
  const next = idx + delta;
  if (next < 0 || next >= pool.length) return;
  loadGame(pool[next].id);
}

function navRandom() {
  if (!currentGame) return;
  const pick = pickRandomUnseen(currentGame.id);
  if (pick) loadGame(pick.id);
}

/* ==================== INIT ==================== */
// Merge persisted custom games into GAMES before building the nav.
loadSavedCustoms();
rebuildGameNav();

document.getElementById('game-prev').addEventListener('click', function() { navGame(-1); });
document.getElementById('game-next').addEventListener('click', function() { navGame(1); });
document.getElementById('game-random').addEventListener('click', navRandom);

// Tag filter dropdown — change the filter, then refresh the counter / button
// states. If the user is sitting on a puzzle that isn't in the newly-selected
// tag's pool, jump to the first puzzle in that pool (much less confusing than
// leaving them on an off-filter game with prev/next disabled).
const tagFilterEl = document.getElementById('tag-filter');
if (tagFilterEl) {
  tagFilterEl.addEventListener('change', function() {
    setCurrentTag(tagFilterEl.value);
    const pool = getFilteredGames();
    const stillInPool = currentGame && pool.some(function(g) { return g.id === currentGame.id; });
    if (!stillInPool && pool.length) {
      loadGame(pool[0].id);
    } else {
      rebuildGameNav(currentGame ? currentGame.id : null);
    }
  });
}

document.getElementById('btn-prev').addEventListener('click', function() { goStep(-1); });
document.getElementById('btn-next').addEventListener('click', function() { goStep(1); });

document.getElementById('btn-load-custom').addEventListener('click', function() {
  loadCustomFromInput(loadGame);
});
document.getElementById('btn-template').addEventListener('click', function() {
  fillTemplate(currentGame);
});
document.getElementById('btn-download').addEventListener('click', function() {
  downloadCurrent(currentGame);
});
document.getElementById('btn-clear-custom').addEventListener('click', function() {
  clearCustoms(loadGame);
});

document.getElementById('btn-copy-prompt').addEventListener('click', async function() {
  const btn = this;
  const original = btn.textContent;
  try {
    const res = await fetch('AUTHORING.md', { cache: 'no-cache' });
    if (!res.ok) throw new Error('fetch failed (' + res.status + ')');
    const text = await res.text();
    const m = text.match(/^=== BEGIN AI PROMPT ===\s*([\s\S]*?)^=== END AI PROMPT ===/m);
    if (!m) throw new Error('prompt block not found in AUTHORING.md');
    await navigator.clipboard.writeText(m[1].trim());
    btn.textContent = '✓ Copied — paste into your AI';
    setTimeout(function() { btn.textContent = original; }, 2400);
  } catch (e) {
    btn.textContent = '✗ ' + e.message;
    setTimeout(function() { btn.textContent = original; }, 3000);
  }
});

document.getElementById('poll-reset').addEventListener('click', function() {
  if (!currentGame) return;
  if (!confirm('Clear your answer for this step?')) return;
  resetStepAnswers(currentGame.id, currentStep);
  renderPoll(currentGame, currentStep);
});

document.addEventListener('keydown', function(e) {
  if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'ArrowLeft')  { goStep(-1); e.preventDefault(); }
  if (e.key === 'ArrowRight') { goStep(1); e.preventDefault(); }
});

// Initial load: prefer the first game in the user's persisted tag filter.
// If their saved tag filter is empty (or its pool is empty), fall back
// to the very first game in GAMES.
(function initialLoad() {
  const pool = getFilteredGames();
  const first = (pool.length ? pool[0] : GAMES[0]);
  if (first) loadGame(first.id);
})();
