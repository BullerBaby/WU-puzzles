/* ==================== CUSTOM GAMES ====================
 * Load/save/validate/normalize user-pasted games. Custom games are stored
 * under STORAGE_KEY in localStorage and merged into GAMES on startup.
 *
 * Also owns the tag-filter UI on the game-row: each game can carry an
 * optional `tags: ['demo', ...]` array. The dropdown shows the union
 * of all tags found across GAMES, plus an "All puzzles" option. The
 * selected tag is persisted under TAG_STORAGE_KEY and consulted by
 * navGame / navRandom / rebuildGameNav to constrain the visible pool.
 *
 * Public API (called from main.js):
 *   rebuildGameNav(currentGameId?) — refresh the game title / counter UI
 *   loadCustomFromInput(onLoaded)  — read textarea, validate, push, save
 *   fillTemplate(currentGame)      — dump current game to textarea
 *   downloadCurrent(currentGame)   — download current game as .json
 *   clearCustoms(onCleared)        — drop all custom games from storage
 *   loadSavedCustoms()             — merge persisted customs into GAMES
 *   getFilteredGames()             — GAMES filtered by current tag selection
 *   getCurrentTag()                — current tag filter ('' = all)
 *   setCurrentTag(tag)             — set the tag filter and persist
 */

import { GAMES }    from '../data/games.js';
import { BOARDS }   from '../data/boards.js';
import { WARBANDS } from '../data/warbands.js';

const STORAGE_KEY = 'underworlds-replay-customs-v1';
const TAG_STORAGE_KEY = 'underworlds-replay-tag-v1';

/* ==================== TAG FILTER ==================== */

function loadTagFromStorage() {
  try { return localStorage.getItem(TAG_STORAGE_KEY) || ''; }
  catch (e) { return ''; }
}
function saveTagToStorage(tag) {
  try { localStorage.setItem(TAG_STORAGE_KEY, tag || ''); }
  catch (e) {}
}

let currentTag = loadTagFromStorage();

export function getCurrentTag() { return currentTag; }
export function setCurrentTag(tag) {
  currentTag = tag || '';
  saveTagToStorage(currentTag);
}

/* Return the list of GAMES that match the current tag filter. An empty
 * tag means "all". A game matches if its `tags` array contains the
 * selected tag (case-insensitive). */
export function getFilteredGames() {
  if (!currentTag) return GAMES.slice();
  const want = currentTag.toLowerCase();
  return GAMES.filter(function(g) {
    if (!Array.isArray(g.tags)) return false;
    return g.tags.some(function(t) { return String(t).toLowerCase() === want; });
  });
}

/* Collect every distinct tag used across all games, with a count. Tags
 * are compared case-insensitively but the original casing of the first
 * occurrence is preserved for display. Sorted alphabetically. */
function collectAllTags() {
  const map = new Map(); // lowercase → { display, count }
  GAMES.forEach(function(g) {
    if (!Array.isArray(g.tags)) return;
    g.tags.forEach(function(t) {
      const s = String(t).trim();
      if (!s) return;
      const key = s.toLowerCase();
      if (map.has(key)) map.get(key).count += 1;
      else map.set(key, { display: s, count: 1 });
    });
  });
  return Array.from(map.values()).sort(function(a, b) {
    return a.display.localeCompare(b.display);
  });
}

function populateTagFilter() {
  const sel = document.getElementById('tag-filter');
  const wrap = document.getElementById('tag-filter-wrap');
  if (!sel || !wrap) return;
  const tags = collectAllTags();
  if (!tags.length) {
    // No tags anywhere — hide the dropdown entirely.
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  // Rebuild options. Preserve current selection if still valid.
  const totalCount = GAMES.length;
  const opts = ['<option value="">All puzzles (' + totalCount + ')</option>'];
  tags.forEach(function(t) {
    const sel = (t.display.toLowerCase() === currentTag.toLowerCase()) ? ' selected' : '';
    const label = t.display + ' (' + t.count + ')';
    opts.push('<option value="' + escapeAttr(t.display) + '"' + sel + '>' + escapeHtml(label) + '</option>');
  });
  sel.innerHTML = opts.join('');
  // If the persisted tag is no longer present in any game, reset it silently.
  const stillValid = !currentTag || tags.some(function(t) {
    return t.display.toLowerCase() === currentTag.toLowerCase();
  });
  if (!stillValid) {
    currentTag = '';
    saveTagToStorage('');
    sel.value = '';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function escapeAttr(s) { return escapeHtml(s); }

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
  // Optional metadata strings — all default to '' (rendered as blank line).
  if (typeof g.date !== 'string')     g.date = '';
  if (typeof g.location !== 'string') g.location = '';
  if (typeof g.credit !== 'string')   g.credit = '';
  // Normalize tags: drop non-strings, trim, drop empties, de-dupe (case-insens).
  if (Array.isArray(g.tags)) {
    const seen = Object.create(null);
    g.tags = g.tags
      .map(function(t) { return typeof t === 'string' ? t.trim() : ''; })
      .filter(function(t) {
        if (!t) return false;
        const k = t.toLowerCase();
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      });
  } else {
    g.tags = [];
  }
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

/* Render the small meta line under the title: date · location · credit.
 * Each field is optional; the line hides entirely when all three are empty.
 * Pass null to clear the line (used when no current game). */
function renderGameMeta(g) {
  const el = document.getElementById('game-meta');
  if (!el) return;
  const parts = [];
  if (g && typeof g.date === 'string' && g.date.trim())     parts.push(g.date.trim());
  if (g && typeof g.location === 'string' && g.location.trim()) parts.push(g.location.trim());
  if (g && typeof g.credit === 'string' && g.credit.trim()) parts.push(g.credit.trim());
  if (!parts.length) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  // Build with explicit separator spans so the middle-dot can carry its own styling.
  el.innerHTML = parts.map(escapeHtml).join('<span class="game-meta-sep">·</span>');
}

export function rebuildGameNav(currentGameId) {
  // Refresh the tag dropdown first (new customs may have introduced new tags,
  // or a tag's last game may have been removed).
  populateTagFilter();

  const titleEl   = document.getElementById('game-title');
  const counterEl = document.getElementById('game-counter');
  const prevBtn   = document.getElementById('game-prev');
  const nextBtn   = document.getElementById('game-next');
  const randomBtn = document.getElementById('game-random');
  if (!titleEl || !counterEl || !prevBtn || !nextBtn) return;

  // Navigation operates on the filtered pool, not the full GAMES list.
  const pool = getFilteredGames();

  // Locate the current game within the filtered pool. If it isn't there
  // (e.g. user just changed the tag and is sitting on a game from a
  // different category), we still show its title but disable prev/next —
  // the random button stays enabled when the filter pool is non-empty,
  // so the user can jump into the filtered set.
  let idx = -1;
  if (currentGameId) idx = pool.findIndex(function(g) { return g.id === currentGameId; });

  if (!pool.length) {
    // No games match the current tag at all.
    const fallback = currentGameId ? GAMES.find(function(g) { return g.id === currentGameId; }) : null;
    titleEl.textContent = fallback ? fallback.title : '(no games)';
    counterEl.textContent = currentTag ? 'no puzzles tagged "' + currentTag + '"' : '';
    renderGameMeta(fallback);
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = true;
    return;
  }

  if (idx < 0) {
    // Current game isn't in the filtered pool — still display it, but
    // surface that prev/next will skip out of it on the next click.
    const fallback = currentGameId ? GAMES.find(function(g) { return g.id === currentGameId; }) : null;
    const g = fallback || pool[0];
    titleEl.textContent = g.title + (g.id.indexOf('custom-') === 0 ? '  (custom)' : '');
    counterEl.textContent = '(not in current filter — ' + pool.length + ' available)';
    renderGameMeta(g);
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    if (randomBtn) randomBtn.disabled = (pool.length === 0);
    return;
  }

  const g = pool[idx];
  titleEl.textContent = g.title + (g.id.indexOf('custom-') === 0 ? '  (custom)' : '');
  counterEl.textContent = (idx + 1) + ' of ' + pool.length;
  renderGameMeta(g);
  prevBtn.disabled = (idx === 0);
  nextBtn.disabled = (idx === pool.length - 1);
  if (randomBtn) randomBtn.disabled = (pool.length <= 1);
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
