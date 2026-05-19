/* ==================== CUSTOM GAMES ====================
 * Load/save/validate/normalize user-pasted games. Custom games are stored
 * under STORAGE_KEY in localStorage and merged into GAMES on startup.
 *
 * Public API (called from main.js):
 *   rebuildGameNav(currentGameId?) — refresh the game title / counter UI
 *   loadCustomFromInput(onLoaded)  — read textarea, validate, push, save
 *   fillTemplate(currentGame)      — dump current game to textarea
 *   downloadCurrent(currentGame)   — download current game as .json
 *   clearCustoms(onCleared)        — drop all custom games from storage
 *   loadSavedCustoms()             — merge persisted customs into GAMES
 */

import { GAMES }    from '../data/games.js';
import { BOARDS }   from '../data/boards.js';
import { WARBANDS } from '../data/warbands.js';

const STORAGE_KEY = 'underworlds-replay-customs-v1';

function loadCustomsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function saveCustomsToStorage(customs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
    return true;
  } catch (e) {
    return false;
  }
}

function validateGame(g) {
  const errors = [];
  if (!g || typeof g !== 'object' || Array.isArray(g)) {
    errors.push('Game must be a JSON object.');
    return errors;
  }
  if (!g.title || typeof g.title !== 'string') {
    errors.push('Missing "title" (string).');
  }
  if (!g.board || !BOARDS[g.board]) {
    errors.push('Missing or unknown "board". Valid boards: ' + Object.keys(BOARDS).join(', ') + '.');
  }
  // Fighter source: warbands reference (preferred) or inline fighters.
  // At least one must be present.
  const hasWarbands = g.warbands && typeof g.warbands === 'object' &&
                      (g.warbands.me || g.warbands.opp);
  const hasFighters = g.fighters && typeof g.fighters === 'object' &&
                      Object.keys(g.fighters).length > 0;
  if (!hasWarbands && !hasFighters) {
    errors.push('Missing "warbands" (preferred — e.g. {"me":"headsmens-curse","opp":"emberwatch"}) ' +
                'or inline "fighters" object. Valid warband ids: ' + Object.keys(WARBANDS).join(', ') + '.');
  } else if (hasWarbands) {
    ['me', 'opp'].forEach(function(side) {
      const id = g.warbands[side];
      if (id && !WARBANDS[id]) {
        errors.push('Unknown warband for ' + side + ': "' + id + '". Valid: ' + Object.keys(WARBANDS).join(', ') + '.');
      }
    });
    // If inline fighters are also present, they must specify side+label (overrides only)
    if (hasFighters) {
      for (const id in g.fighters) {
        const f = g.fighters[id];
        if (f && f.side && f.side !== 'me' && f.side !== 'opp') {
          errors.push('Override fighter "' + id + '": side must be "me" or "opp" if specified.');
        }
      }
    }
  } else if (hasFighters) {
    // Fully inline — needs side + label per fighter
    for (const id in g.fighters) {
      const f = g.fighters[id];
      if (!f || (f.side !== 'me' && f.side !== 'opp')) {
        errors.push('Fighter "' + id + '" needs side: "me" or "opp".');
      }
      if (!f || !f.label) {
        errors.push('Fighter "' + id + '" needs a label.');
      }
    }
  }
  if (!Array.isArray(g.steps) || !g.steps.length) {
    errors.push('Missing "steps" (non-empty array).');
  } else {
    g.steps.forEach(function(s, i) {
      if (!s || typeof s !== 'object') {
        errors.push('Step ' + (i+1) + ' must be an object.');
        return;
      }
      // A step needs state OR diff (first step usually has state; later may use diff).
      const hasState = s.state && typeof s.state === 'object';
      const hasDiff  = s.diff  && typeof s.diff  === 'object';
      if (!hasState && !hasDiff) {
        errors.push('Step ' + (i+1) + ' needs a "state" or "diff" object.');
      } else if (i === 0 && !hasState) {
        errors.push('Step 1 needs "state" (full snapshot); only later steps can use "diff".');
      } else if (hasState && !s.state.positions) {
        // Only require positions on the first/explicit state — diffs may omit
        if (i === 0) errors.push('Step 1 state needs "positions" object.');
      }
    });
  }
  return errors;
}

function normalizeGame(g) {
  g = Object.assign({}, g);
  if (!g.id || typeof g.id !== 'string') {
    g.id = 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  } else if (g.id.indexOf('custom-') !== 0) {
    g.id = 'custom-' + g.id;
  }
  if (typeof g.round !== 'number') g.round = 1;
  if (typeof g.boardRotation !== 'number') g.boardRotation = 0;
  if (typeof g.description !== 'string') g.description = '';
  g.steps = g.steps.map(function(s) {
    s = Object.assign({}, s);
    s.state = Object.assign({
      positions: {}, wounds: {}, slain: [],
      inspired: [], glory: [0, 0], tokens: {}, upgrades: {}, abilitiesUsed: {}, activationsUsed: {}, features: [], hand: { me: 0, opp: 0 }, powerStep: [],
    }, s.state || {});
    if (!s.notation) s.notation = s.title || '(step)';
    if (typeof s.title !== 'string') s.title = '';
    if (typeof s.explanation !== 'string') s.explanation = '';
    return s;
  });
  return g;
}

function showStatus(msg, kind) {
  const el = document.getElementById('custom-status');
  el.textContent = msg;
  el.className = 'custom-status' + (kind ? ' ' + kind : '');
}

export function rebuildGameNav(currentGameId) {
  const titleEl   = document.getElementById('game-title');
  const counterEl = document.getElementById('game-counter');
  const prevBtn   = document.getElementById('game-prev');
  const nextBtn   = document.getElementById('game-next');
  const randomBtn = document.getElementById('game-random');
  if (!titleEl || !counterEl || !prevBtn || !nextBtn) return;
  let idx = -1;
  if (currentGameId) idx = GAMES.findIndex(function(g) { return g.id === currentGameId; });
  if (idx < 0) idx = 0;
  const g = GAMES[idx];
  if (!g) {
    titleEl.textContent = '(no games)';
    counterEl.textContent = '';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;
    return;
  }
  titleEl.textContent = g.title + (g.id.indexOf('custom-') === 0 ? '  (custom)' : '');
  counterEl.textContent = (idx + 1) + ' of ' + GAMES.length;
  prevBtn.disabled = (idx === 0);
  nextBtn.disabled = (idx === GAMES.length - 1);
  if (randomBtn) randomBtn.disabled = (GAMES.length <= 1);
}

export function loadCustomFromInput(onLoaded) {
  const input = document.getElementById('custom-input').value.trim();
  if (!input) {
    showStatus('Paste game JSON in the box above first.', 'error');
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    showStatus('JSON parse error — ' + e.message + '. Tip: no trailing commas, double-quote keys and strings.', 'error');
    return;
  }
  const games = Array.isArray(parsed) ? parsed : [parsed];
  if (!games.length) {
    showStatus('No games found in input.', 'error');
    return;
  }
  const allErrors = [];
  const validated = [];
  games.forEach(function(g, i) {
    const errs = validateGame(g);
    if (errs.length) {
      allErrors.push('Game ' + (i+1) + ':\n  • ' + errs.join('\n  • '));
    } else {
      validated.push(normalizeGame(g));
    }
  });
  if (allErrors.length) {
    showStatus(allErrors.join('\n\n'), 'error');
    return;
  }
  validated.forEach(function(g) {
    const idx = GAMES.findIndex(function(x) { return x.id === g.id; });
    if (idx >= 0) GAMES[idx] = g;
    else GAMES.push(g);
  });
  const customs = GAMES.filter(function(g) { return g.id.indexOf('custom-') === 0; });
  const saved = saveCustomsToStorage(customs);
  const firstNew = validated[0];
  rebuildGameNav(firstNew.id);
  if (typeof onLoaded === 'function') onLoaded(firstNew.id);
  const word = validated.length === 1 ? 'game' : 'games';
  showStatus('Loaded ' + validated.length + ' ' + word + '.' + (saved ? '' : ' (Note: couldn\'t save to localStorage — game will be lost on reload.)'), 'success');
}

export function fillTemplate(currentGame) {
  if (!currentGame) return;
  const clone = JSON.parse(JSON.stringify(currentGame));
  delete clone.id;
  clone.title = currentGame.title + ' (copy)';
  document.getElementById('custom-input').value = JSON.stringify(clone, null, 2);
  showStatus('Template loaded into the box. Edit, then click "Load game".', '');
}

export function downloadCurrent(currentGame) {
  if (!currentGame) return;
  const clone = JSON.parse(JSON.stringify(currentGame));
  const blob = new Blob([JSON.stringify(clone, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (currentGame.id || 'game') + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus('Downloaded ' + a.download, 'success');
}

export function clearCustoms(onCleared) {
  const customCount = GAMES.filter(function(g) { return g.id.indexOf('custom-') === 0; }).length;
  if (!customCount) {
    showStatus('No custom games to clear.', '');
    return;
  }
  if (!confirm('Clear all ' + customCount + ' custom game' + (customCount === 1 ? '' : 's') + ' from this browser?')) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  for (let i = GAMES.length - 1; i >= 0; i--) {
    if (GAMES[i].id.indexOf('custom-') === 0) GAMES.splice(i, 1);
  }
  rebuildGameNav(GAMES.length ? GAMES[0].id : null);
  if (GAMES.length && typeof onCleared === 'function') onCleared(GAMES[0].id);
  showStatus('Custom games cleared.', 'success');
}

/* Merge persisted customs into GAMES. Called once at app startup. */
export function loadSavedCustoms() {
  const saved = loadCustomsFromStorage();
  saved.forEach(function(g) {
    try {
      const errs = validateGame(g);
      if (!errs.length) GAMES.push(normalizeGame(g));
    } catch (e) {}
  });
}
