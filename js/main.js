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
import { renderBoard, renderFeatures, hexCenter, svgEl } from './board.js';
import {
  renderFighterCards, updateFighterCards, renderFighterTokens,
  renderAbilities, renderActivations, renderDecks, renderWarbandLabels,
  renderHands, renderDice, renderPowerStep, tokenLabel,
} from './warband-panel.js';
import { renderPoll, resetStepAnswers } from './poll.js';
import {
  rebuildGameNav, loadCustomFromInput, fillTemplate,
  downloadCurrent, clearCustoms, loadSavedCustoms,
  getFilteredGames, getCurrentTag, setCurrentTag,
} from './custom-games.js';
import * as Challenge from './challenge.js';
import * as Leaderboard from './leaderboard.js';

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
  rebuildHexTitles(state, game);
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
  }, function(result) {
    // Challenge-mode scoring hook (no-op outside a run).
    onPollResult(game, result);
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

/* Compose one consolidated <title> per hex listing everything currently in it,
 * e.g. "b1 — Treasure 3, Fighter Ylarin (inspired), Guard token". Individual
 * board elements (fighters, feature tokens, action tokens) no longer carry
 * their own titles, so the hex is the single hover target. */
function rebuildHexTitles(state, game) {
  const positions = state.positions || {};
  const slain = state.slain || [];
  const inspired = state.inspired || [];
  const wounds = state.wounds || {};
  const tokens = state.tokens || {};
  const features = state.features || [];

  // Group feature descriptions by hex.
  const featByHex = {};
  features.forEach(function(f) {
    if (!f || !f.hex) return;
    let d;
    if (f.type === 'treasure')  d = 'Treasure ' + (f.label || '?');
    else if (f.type === 'aqua') d = 'Aqua Ghyranis';
    else                        d = (f.type || 'Feature');
    if (f.delved) d += ' (delved)';
    (featByHex[f.hex] = featByHex[f.hex] || []).push(d);
  });

  // Group fighter descriptions by hex.
  const fighterByHex = {};
  for (const id in positions) {
    const hex = positions[id];
    if (!hex || slain.indexOf(id) >= 0) continue;
    const info = game.fighters[id] || {};
    let d = 'Fighter ' + (info.name || id);
    const extras = [];
    if (inspired.indexOf(id) >= 0) extras.push('inspired');
    if (wounds[id] > 0) extras.push(wounds[id] + ' wound' + (wounds[id] > 1 ? 's' : ''));
    if (extras.length) d += ' (' + extras.join(', ') + ')';
    (fighterByHex[hex] = fighterByHex[hex] || []).push(d);
    // The fighter's action tokens are physically in that hex too.
    (tokens[id] || []).forEach(function(t) {
      (fighterByHex[hex] = fighterByHex[hex] || []).push(tokenLabel(t));
    });
  }

  document.querySelectorAll('.hex-poly').forEach(function(poly) {
    const hex = poly.getAttribute('data-hex');
    const title = poly.querySelector('title');
    if (!title) return;
    const type = poly.getAttribute('data-hextype');
    const parts = [];
    if (featByHex[hex])    parts.push.apply(parts, featByHex[hex]);
    if (fighterByHex[hex]) parts.push.apply(parts, fighterByHex[hex]);
    let text = hex + (type ? ' — ' + type : '');
    if (parts.length) text += (type ? ', ' : ' — ') + parts.join(', ');
    title.textContent = text;
  });
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
  // In a challenge run, clear any stored poll answers for this game so it
  // plays fresh (important when the run loops back to an already-solved
  // puzzle on a higher ramp).
  if (Challenge.isActive()) {
    (game.steps || []).forEach(function(s, i) {
      if (s && s.poll) resetStepAnswers(game.id, i);
    });
  }
  rebuildGameNav(game.id);
  decorateDifficulty(game);
  renderBoard(game);
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

/* ==================== CHALLENGE MODE ====================
 * Wires the Challenge controller (js/challenge.js) and leaderboard
 * (js/leaderboard.js) to the DOM. In a run, solving a puzzle's poll on the
 * first try scores points and auto-loads the next (harder) puzzle; a wrong
 * answer ends the run and shows the results overlay. */

const $ = function (id) { return document.getElementById(id); };

/* Append 1–5 difficulty pips to the puzzle title. */
function decorateDifficulty(game) {
  const titleEl = $('game-title');
  if (!titleEl) return;
  const existing = titleEl.querySelector('.difficulty-pips');
  if (existing) existing.remove();
  const d = Number(game && game.difficulty);
  if (!(d >= 1 && d <= 5)) return;
  const wrap = document.createElement('span');
  wrap.className = 'difficulty-pips';
  wrap.title = 'Difficulty ' + d + '/5';
  for (let i = 1; i <= 5; i++) {
    const pip = document.createElement('span');
    pip.className = 'difficulty-pip' + (i <= d ? ' on' : '');
    wrap.appendChild(pip);
  }
  titleEl.appendChild(wrap);
}

/* Called by the poll result hook for every fresh option click. */
function onPollResult(game, result) {
  if (!Challenge.isActive()) return;
  if (!currentGame || game.id !== currentGame.id) return;
  if (game.id !== Challenge.currentPuzzleId()) return;

  if (result.correct && result.firstTry) {
    const award = Challenge.solved();
    updateHud(true, award);
    // Give the solved state a beat to show, then load the next puzzle — or
    // finish the run if every puzzle has been cleared.
    setTimeout(function () {
      const nextId = Challenge.nextPuzzleId();
      if (nextId) {
        loadGame(nextId);
      } else {
        // Whole set cleared — run complete.
        finishRun(Challenge.snapshot());
      }
    }, 850);
  } else if (!result.correct) {
    // Any wrong click ends the run (first try or not — you already committed).
    const snap = Challenge.failed();
    finishRun(snap);
  }
}

function startRun() {
  const nameInput = $('challenge-name');
  if (nameInput) Leaderboard.setPlayerName(nameInput.value);
  const pool = getFilteredGames();
  const firstId = Challenge.startRun(pool);
  if (!firstId) {
    setLeaderboardNote('No scorable puzzles in this pool.');
    return;
  }
  $('challenge-idle').hidden = true;
  $('challenge-hud').hidden = false;
  hideResult();
  updateHud(false, 0);
  loadGame(firstId);
}

function quitRun() {
  const snap = Challenge.endRun();
  finishRun(snap, /*quiet*/ true);
}

function finishRun(snap, quiet) {
  $('challenge-hud').hidden = true;
  $('challenge-idle').hidden = false;

  const entry = {
    name: Leaderboard.getPlayerName() || 'Anon',
    score: snap.score,
    cleared: snap.cleared,
    difficultyReached: snap.difficultyReached,
    ts: Date.now(),
  };
  const { isBest } = Leaderboard.recordPersonal(entry);
  renderBest();

  // Show results overlay unless the user simply quit at zero.
  if (!(quiet && snap.score === 0)) {
    showResult(snap, isBest, entry);
  }
  // Submit to the global board in the background (best-effort).
  if (snap.score > 0) {
    Leaderboard.submitGlobal(entry).then(function (res) {
      if (res.ok) {
        const rankEl = $('result-rank');
        if (rankEl) rankEl.textContent = 'Global rank #' + res.rank;
      }
      if (lbTab === 'global') renderLeaderboard();
    });
  }
}

/* ---- HUD ---- */
function updateHud(justSolved, award) {
  const s = Challenge.snapshot();
  $('hud-score').textContent = s.score;
  $('hud-cleared').textContent = s.cleared;
  $('hud-progress').textContent = s.position + ' / ' + s.total;
  if (justSolved && award > 0) {
    const a = $('hud-award');
    a.textContent = '+' + award;
    a.classList.remove('pop');
    void a.offsetWidth; // reflow to restart animation
    a.classList.add('pop');
  }
}

/* ---- Results overlay ---- */
function showResult(snap, isBest, entry) {
  const heading = $('result-heading');
  if (heading) heading.textContent = snap.complete ? 'All clear!' : 'Run over';
  $('result-score').textContent = snap.score;
  const unit = snap.score === 1 ? ' point' : ' points';
  $('result-sub').textContent = snap.complete
    ? 'Perfect — every puzzle solved (' + snap.score + unit + ')'
    : snap.cleared + (snap.cleared === 1 ? ' puzzle' : ' puzzles') + ' cleared of ' + snap.total;
  const badge = $('result-badge');
  if (isBest && snap.score > 0) {
    badge.hidden = false;
    badge.textContent = '★ New personal best!';
  } else {
    badge.hidden = true;
  }
  const rankEl = $('result-rank');
  rankEl.textContent = Leaderboard.isGlobalEnabled() && snap.score > 0
    ? 'Submitting to global board…'
    : '';
  $('result-overlay').hidden = false;
}
function hideResult() { $('result-overlay').hidden = true; }

/* ---- Personal best line + leaderboard ---- */
function renderBest() {
  const best = Leaderboard.getPersonalBest();
  const el = $('challenge-best');
  if (el) el.textContent = best ? 'Your best: ' + best.score : '';
}

let lbTab = Leaderboard.isGlobalEnabled() ? 'global' : 'personal';

function setLeaderboardNote(txt) {
  const n = $('leaderboard-note');
  if (n) n.textContent = txt || '';
}

function renderLeaderboardList(entries, opts) {
  const list = $('leaderboard-list');
  list.innerHTML = '';
  if (!entries || !entries.length) {
    const empty = document.createElement('div');
    empty.className = 'leaderboard-empty';
    empty.textContent = opts && opts.emptyText || 'No scores yet — start a run!';
    list.appendChild(empty);
    return;
  }
  const myName = Leaderboard.getPlayerName();
  entries.slice(0, 25).forEach(function (e, i) {
    const li = document.createElement('li');
    if (opts && opts.highlightSelf && e.name === myName) li.classList.add('you');
    const rank = document.createElement('span'); rank.className = 'lb-rank'; rank.textContent = (i + 1);
    const name = document.createElement('span'); name.className = 'lb-name';
    name.textContent = e.name || 'Anon';
    const score = document.createElement('span'); score.className = 'lb-score'; score.textContent = e.score;
    li.appendChild(rank); li.appendChild(name); li.appendChild(score);
    list.appendChild(li);
  });
}

function renderLeaderboard() {
  // Toggle tab visuals
  $('lb-tab-global').classList.toggle('active', lbTab === 'global');
  $('lb-tab-personal').classList.toggle('active', lbTab === 'personal');

  if (lbTab === 'personal') {
    const best = Leaderboard.getPersonalBest();
    renderLeaderboardList(best ? [best] : [], { emptyText: 'No personal best yet.', highlightSelf: false });
    setLeaderboardNote('Saved on this device.');
    return;
  }
  // Global
  if (!Leaderboard.isGlobalEnabled()) {
    renderLeaderboardList([], { emptyText: 'Global board not configured.' });
    setLeaderboardNote('Set a remote URL in js/leaderboard.js to enable the shared board.');
    return;
  }
  setLeaderboardNote('Loading…');
  Leaderboard.fetchGlobal().then(function (res) {
    if (res.ok) {
      renderLeaderboardList(res.entries, { emptyText: 'No scores yet — be the first!', highlightSelf: true });
      setLeaderboardNote('Shared with everyone.');
    } else {
      renderLeaderboardList([], { emptyText: 'Global board offline.' });
      setLeaderboardNote('Couldn’t reach the shared board — showing nothing.');
    }
  });
}

/* ---- Challenge wiring ---- */
(function wireChallenge() {
  const nameInput = $('challenge-name');
  if (nameInput) nameInput.value = Leaderboard.getPlayerName();
  renderBest();
  renderLeaderboard();

  const startBtn = $('challenge-start');
  if (startBtn) startBtn.addEventListener('click', startRun);
  const quitBtn = $('challenge-quit');
  if (quitBtn) quitBtn.addEventListener('click', quitRun);

  const again = $('result-again');
  if (again) again.addEventListener('click', function () { hideResult(); startRun(); });
  const close = $('result-close');
  if (close) close.addEventListener('click', function () { hideResult(); renderLeaderboard(); });

  const gTab = $('lb-tab-global');
  const pTab = $('lb-tab-personal');
  if (gTab) gTab.addEventListener('click', function () { lbTab = 'global'; renderLeaderboard(); });
  if (pTab) pTab.addEventListener('click', function () { lbTab = 'personal'; renderLeaderboard(); });
})();

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
