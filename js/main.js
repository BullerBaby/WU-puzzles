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
} from './custom-games.js';

/* ==================== STATE ==================== */
let currentGame  = null;
let currentBoard = null;
let currentStep  = 0;
let playing      = false;
let playTimer    = null;

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
  renderPoll(game, idx);

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
  if (playing) togglePlay();
  const ni = currentStep + delta;
  if (ni < 0 || ni >= currentGame.steps.length) return;
  currentStep = ni;
  applyStep(currentStep);
}

function togglePlay() {
  const btn = document.getElementById('btn-play');
  if (playing) {
    clearTimeout(playTimer);
    playing = false;
    btn.textContent = '▶ Play';
  } else {
    playing = true;
    btn.textContent = '⏸ Pause';
    const advance = function() {
      if (!playing) return;
      if (currentStep < currentGame.steps.length - 1) {
        currentStep++;
        applyStep(currentStep);
        playTimer = setTimeout(advance, 2500);
      } else {
        playing = false;
        btn.textContent = '▶ Play';
      }
    };
    playTimer = setTimeout(advance, 600);
  }
}

function rotateBoard() {
  if (!currentGame) return;
  currentGame.boardRotation = ((currentGame.boardRotation || 0) === 180) ? 0 : 180;
  renderBoard(currentGame);
  renderLegend(currentGame);
  setTimeout(function() { applyStep(currentStep); }, 50);
}

function buildLog(game) {
  const log = document.getElementById('notation-log');
  log.innerHTML = '';
  game.steps.forEach(function(s, i) {
    const div = document.createElement('div');
    div.className = 'notation-line';
    div.textContent = (i + 1) + '.  ' + (s.notation || s.title || '(step ' + (i+1) + ')');
    div.onclick = function() { if (playing) togglePlay(); currentStep = i; applyStep(i); };
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
  if (playing) togglePlay();
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
  const idx = GAMES.findIndex(function(g) { return g.id === currentGame.id; });
  const next = idx + delta;
  if (next < 0 || next >= GAMES.length) return;
  loadGame(GAMES[next].id);
}

/* ==================== INIT ==================== */
// Merge persisted custom games into GAMES before building the nav.
loadSavedCustoms();
rebuildGameNav();

document.getElementById('game-prev').addEventListener('click', function() { navGame(-1); });
document.getElementById('game-next').addEventListener('click', function() { navGame(1); });

document.getElementById('btn-prev').addEventListener('click', function() { goStep(-1); });
document.getElementById('btn-next').addEventListener('click', function() { goStep(1); });
document.getElementById('btn-play').addEventListener('click', togglePlay);
document.getElementById('btn-rotate').addEventListener('click', rotateBoard);

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
  if (e.key === ' ')          { togglePlay(); e.preventDefault(); }
  if (e.key === 'r' || e.key === 'R') { rotateBoard(); }
});

loadGame(GAMES[0].id);
