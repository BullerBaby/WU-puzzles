/* ==================== BOARD ====================
 * Hex math, board SVG rendering, legend, and feature-token placement.
 *
 * Coordinate system: flat-top hexes laid out in a column-offset grid. Files
 * a–k (cols 0–10) map to x; ranks 1–9 map to y, with odd columns offset by
 * COL_OFFSET. R = inradius. Conversions are pure functions of (hex string,
 * board.rows).
 *
 * Rotation: passing rotation=180 to rotateHex/rotateHexes mirrors a hex to
 * the opposite corner of the board. Used both for the boardRotation game
 * field and the live-rotate button.
 */

import { BOARDS } from '../data/boards.js';

/* ---- hex geometry ---- */
export const R = 13;
const COL_STEP = 19.5;
const ROW_STEP = 22.5;
const COL_OFFSET = 11.25;
const BASE_X = 32;
const BASE_Y = 26;

export function hexCenter(hexStr, boardRows) {
  const file = hexStr[0];
  const rank = parseInt(hexStr.slice(1));
  const col = file.charCodeAt(0) - 97;
  return {
    x: BASE_X + col * COL_STEP,
    y: BASE_Y + (boardRows - rank) * ROW_STEP + (col % 2) * COL_OFFSET,
  };
}

/* ---- centered rank conversion ----
 * Convert an internal hex like 'f5' to a midline-relative display coord like
 * 'f0', 'a+1', 'd-3'. The board's midline runs through odd-column hexes at
 * the central rank. Even columns straddle the midline (no zero), skipping
 * directly from -1 to +1. Internal data keeps the old 'f5' format; only the
 * display labels and prose use the new format.
 */
function midRankOf(boardRows) { return Math.ceil(boardRows / 2); }

function newRankOf(hexStr, boardRows) {
  const file = hexStr[0];
  const oldRank = parseInt(hexStr.slice(1));
  const col = file.charCodeAt(0) - 97;
  const mid = midRankOf(boardRows);
  if (col % 2 === 1) return oldRank - mid;          // odd cols sit on midline
  if (oldRank < mid) return oldRank - mid;          // even col, below midline
  return oldRank - (mid - 1);                       // even col, above midline (skips 0)
}

export function toDisplayCoord(hexStr, boardRows) {
  const file = hexStr[0];
  const n = newRankOf(hexStr, boardRows);
  return file + (n > 0 ? '+' : '') + n;
}

function hexPolyPoints(cx, cy) {
  const h = R * Math.sqrt(3) / 2;
  return [
    [cx + R, cy], [cx + R/2, cy + h], [cx - R/2, cy + h],
    [cx - R, cy], [cx - R/2, cy - h], [cx + R/2, cy - h],
  ].map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
}

function rotateHex(hex, rotation, cols, rows) {
  if (rotation !== 180) return hex;
  const col = hex.charCodeAt(0) - 97;
  const rank = parseInt(hex.slice(1));
  return String.fromCharCode(97 + (cols - 1 - col)) + (rows + 1 - rank);
}

function rotateHexes(arr, rotation, cols, rows) {
  return (arr || []).map(h => rotateHex(h, rotation, cols, rows));
}

/* ---- SVG helpers ---- */
const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/* ==================== RENDER BOARD ==================== */
export function renderBoard(game) {
  const svg = document.getElementById('board-svg');
  const board = BOARDS[game.board] || BOARDS['embergard-1'];
  const rotation = game.boardRotation || 0;

  svg.innerHTML = '';
  const FILES = 'abcdefghijk'.slice(0, board.cols);

  const lastColX = BASE_X + (board.cols - 1) * COL_STEP;
  const lastRowY = BASE_Y + (board.rows - 1) * ROW_STEP + COL_OFFSET;
  const vbW = Math.ceil(lastColX + R + 20);
  const vbH = Math.ceil(lastRowY + R + 22);
  svg.setAttribute('viewBox', '0 0 ' + vbW + ' ' + vbH);

  const excludedSet = new Set(board.excluded || []);
  const staggerSet  = new Set(rotateHexes(board.stagger,  rotation, board.cols, board.rows));
  const blockedSet  = new Set(rotateHexes(board.blocked,  rotation, board.cols, board.rows));
  const waystoneSet = new Set(rotateHexes(board.waystone, rotation, board.cols, board.rows));
  const startingSet = new Set(board.starting || []);

  const hexesG = svgEl('g');
  svg.appendChild(hexesG);
  for (let i = 0; i < FILES.length; i++) {
    for (let rk = 1; rk <= board.rows; rk++) {
      const hexId = FILES[i] + rk;
      if (excludedSet.has(hexId)) continue;
      const { x, y } = hexCenter(hexId, board.rows);
      // Tint based on side relative to the midline. Negative new-rank = your
      // side (blue tint), positive = opp side (coral), zero = midline (neutral).
      const n = newRankOf(hexId, board.rows);
      let cls = 'hex-poly';
      if (n < 0)      cls += ' your-side';
      else if (n > 0) cls += ' opp-side';
      else            cls += ' midline';
      // Special hex types take over the fill regardless of side.
      if (staggerSet.has(hexId))  cls = 'hex-poly stagger';
      if (waystoneSet.has(hexId)) cls = 'hex-poly waystone';
      if (blockedSet.has(hexId))  cls = 'hex-poly blocked';
      const poly = svgEl('polygon', { points: hexPolyPoints(x, y), class: cls, 'data-hex': hexId });
      const title = svgEl('title', {});
      title.textContent = toDisplayCoord(hexId, board.rows);
      poly.appendChild(title);
      hexesG.appendChild(poly);
      // Tiny per-hex coord label, placed near the top of the hex. Naturally
      // hidden behind a fighter when one's there (fighters-layer is on top).
      const coord = svgEl('text', {
        x: x.toFixed(1),
        y: (y - 8.2).toFixed(1),
        'text-anchor': 'middle',
        class: 'hex-coord',
      });
      coord.textContent = toDisplayCoord(hexId, board.rows);
      hexesG.appendChild(coord);
      if (startingSet.has(hexId)) {
        hexesG.appendChild(svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 1.8, class: 'starting-dot' }));
      }
    }
  }

  // Find the visually leftmost x and visually lowest y across all playable hexes,
  // so edge labels can be aligned in a single column / row instead of zig-zagging
  // along the hex grid's serrated edges.
  let minXAll = Infinity, maxYAll = -Infinity;
  for (let i = 0; i < FILES.length; i++) {
    for (let rk = 1; rk <= board.rows; rk++) {
      if (excludedSet.has(FILES[i] + rk)) continue;
      const c = hexCenter(FILES[i] + rk, board.rows);
      if (c.x < minXAll) minXAll = c.x;
      if (c.y > maxYAll) maxYAll = c.y;
    }
  }
  const rowLabelX = minXAll - R - 3;
  const colLabelY = maxYAll + R + 11;

  for (let i = 0; i < FILES.length; i++) {
    // Skip files that are entirely excluded
    let anyPlayable = false;
    for (let rk = 1; rk <= board.rows; rk++) {
      if (!excludedSet.has(FILES[i] + rk)) { anyPlayable = true; break; }
    }
    if (!anyPlayable) continue;
    const x = BASE_X + i * COL_STEP;
    const t = svgEl('text', { x: x.toFixed(1), y: colLabelY.toFixed(1), 'text-anchor': 'middle', class: 'coord-label' });
    t.textContent = FILES[i];
    svg.appendChild(t);
  }
  for (let rk = 1; rk <= board.rows; rk++) {
    // Skip ranks that are entirely excluded
    let anyPlayable = false;
    for (let i = 0; i < FILES.length; i++) {
      if (!excludedSet.has(FILES[i] + rk)) { anyPlayable = true; break; }
    }
    if (!anyPlayable) continue;
    // Use the odd-column y reference (BASE_Y + ... + COL_OFFSET) so the
    // labels align horizontally with the midline hexes (b, d, f, h, j at
    // rank 5). The 0 label sits exactly next to b0/d0/f0/h0/j0.
    const y = BASE_Y + (board.rows - rk) * ROW_STEP + COL_OFFSET;
    const mid = Math.ceil(board.rows / 2);
    const n = rk - mid;  // new-rank value at this y (odd-col reference)
    const txt = n === 0 ? '0' : (n > 0 ? '+' + n : String(n));
    const t = svgEl('text', { x: rowLabelX.toFixed(1), y: (y + 3).toFixed(1), 'text-anchor': 'end', class: 'coord-label' + (n === 0 ? ' midline' : '') });
    t.textContent = txt;
    svg.appendChild(t);
  }

  svg.appendChild(svgEl('g', { id: 'fighters-layer' }));
  svg.appendChild(svgEl('g', { id: 'features-layer' }));
  svg.appendChild(svgEl('g', { id: 'dmg-layer' }));

  const fightersLayer = document.getElementById('fighters-layer');
  for (const id in game.fighters) {
    const info = game.fighters[id];
    const g = svgEl('g', { id: 'f-' + id, class: 'fighter' });
    const isMe = info.side === 'me';
    g.appendChild(svgEl('circle', {
      r: 10,
      fill: isMe ? 'var(--me-fill)' : 'var(--opp-fill)',
      stroke: isMe ? 'var(--me-stroke)' : 'var(--opp-stroke)',
      'stroke-width': info.isLeader ? 2.5 : 1.5,
      class: 'bg'
    }));
    const t = svgEl('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: isMe ? 'var(--me-text)' : 'var(--opp-text)',
      'font-weight': 600,
      'font-size': info.label.length > 1 ? 7 : 10,
      'font-family': 'ui-monospace, monospace',
    });
    t.textContent = info.label;
    g.appendChild(t);
    const wb = svgEl('g', { id: 'w-' + id, opacity: 0 });
    wb.appendChild(svgEl('circle', { cx: 9, cy: -9, r: 5.5, fill: 'var(--danger)', stroke: 'var(--surface)', 'stroke-width': 1.5 }));
    const wbt = svgEl('text', { x: 9, y: -9, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#FFF', 'font-size': 8, 'font-weight': 600 });
    wbt.textContent = '0';
    wb.appendChild(wbt);
    g.appendChild(wb);
    g.appendChild(svgEl('g', { id: 't-' + id, class: 'tokens-group' }));
    fightersLayer.appendChild(g);
  }

  return board;
}

/* ==================== RENDER LEGEND ==================== */
export function renderLegend(game) {
  const board = BOARDS[game.board] || BOARDS['embergard-1'];
  const aside = document.getElementById('legend-side');
  aside.innerHTML = '';

  function block(title, items) {
    const b = document.createElement('div');
    b.className = 'legend-block';
    const h = document.createElement('h4');
    h.textContent = title;
    b.appendChild(h);
    const ul = document.createElement('ul');
    items.forEach(function(it) {
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = it.dotClass;
      if (it.dotText) dot.textContent = it.dotText;
      li.appendChild(dot);
      const label = document.createElement('span');
      label.textContent = it.label;
      li.appendChild(label);
      ul.appendChild(li);
    });
    b.appendChild(ul);
    return b;
  }

  // (Fighters now live in the warband panels, not the legend.)

  aside.appendChild(block('Status', [
    { dotClass: 'legend-dot inspired', label: 'Inspired' },
  ]));

  aside.appendChild(block('Features', [
    { dotClass: 'legend-feat treasure', dotText: '1', label: 'Treasure token (1–5)' },
    { dotClass: 'legend-feat aqua',     dotText: 'A', label: 'Aqua Ghyranis' },
    { dotClass: 'legend-feat delved',   dotText: '4', label: 'Delved (red outline)' },
  ]));

  aside.appendChild(block('Action tokens', [
    { dotClass: 'legend-tok move',    dotText: 'M', label: 'Move action' },
    { dotClass: 'legend-tok charge',  dotText: 'C', label: 'Charge action' },
    { dotClass: 'legend-tok guard',   dotText: 'G', label: 'Guard' },
    { dotClass: 'legend-tok stagger', dotText: 'S', label: 'Stagger' },
  ]));

  const hexItems = [{ dotClass: 'legend-hex starting', label: 'Starting hex' }];
  if (board.stagger  && board.stagger.length)  hexItems.push({ dotClass: 'legend-hex stagger',  label: 'Stagger hex' });
  if (board.blocked  && board.blocked.length)  hexItems.push({ dotClass: 'legend-hex blocked',  label: 'Blocked hex' });
  if (board.waystone && board.waystone.length) hexItems.push({ dotClass: 'legend-hex waystone', label: 'Waystone hex' });
  aside.appendChild(block('Hex types', hexItems));
}

/* ==================== RENDER FEATURE TOKENS ====================
 * Tokens are placed inside the hex (flat-top hex, R = 13).
 * Vertical extents: hex spans y in [-11.25, +11.25]; horizontal half-width at y is
 *   halfWidth(y) = 13 - 0.5774 * |y|
 * Token radius FEATURE_R is small enough to fit fully inside even when offset to the
 * lower half of the hex and when multiple tokens are stacked horizontally. When a
 * non-slain fighter occupies the hex, tokens push to y = +7 so both stay visible;
 * otherwise tokens center in the hex.
 */
const FEATURE_R = 3.2;

export function renderFeatures(state, board) {
  const layer = document.getElementById('features-layer');
  if (!layer) return;
  layer.innerHTML = '';

  // Clear any previous feature-hex tints
  const allPolys = document.querySelectorAll('.hex-poly.has-feature');
  allPolys.forEach(function(p) { p.classList.remove('has-feature'); });

  const features = (state && state.features) || [];
  if (!features.length || !board) return;

  // Hexes occupied by alive fighters
  const occupied = new Set();
  const positions = state.positions || {};
  const slain = state.slain || [];
  for (const fid in positions) {
    if (positions[fid] && slain.indexOf(fid) < 0) occupied.add(positions[fid]);
  }

  // Group features by hex (for stacking)
  const byHex = {};
  features.forEach(function(f) {
    if (!f || !f.hex) return;  // null hex = off-board
    if (!byHex[f.hex]) byHex[f.hex] = [];
    byHex[f.hex].push(f);
  });

  for (const hex in byHex) {
    // Tint the hex so it's visually distinguishable
    const poly = document.querySelector('.hex-poly[data-hex="' + hex + '"]');
    if (poly) poly.classList.add('has-feature');

    const center = hexCenter(hex, board.rows);
    const group = byHex[hex];
    const hasFighter = occupied.has(hex);
    const yOff = hasFighter ? 7.0 : 0;
    const xs = stackXOffsets(group.length, yOff);
    group.forEach(function(f, i) {
      drawFeatureToken(layer, f, center.x + xs[i], center.y + yOff);
    });
  }
}

function stackXOffsets(n, yOff) {
  if (n === 1) return [0];
  const r = FEATURE_R;
  // A regular flat-top hex has inradius 11.258. For a circle at (cx, cy) the
  // binding constraint near the diagonal edges is:
  //   0.866 * |cx| + 0.5 * |cy| <= 11.258 - r
  // Solving for |cx|:
  const usable = ((11.258 - r - 0.5 * Math.abs(yOff)) / 0.866) - 0.2;  // small inset
  if (usable <= 0) {
    const z = []; for (let i = 0; i < n; i++) z.push(0); return z;
  }
  const desiredStep = r * 2 + 0.4;  // touching with a small gap
  const maxStep = (usable * 2) / (n - 1);
  const step = Math.min(desiredStep, maxStep);
  const half = step * (n - 1) / 2;
  const out = [];
  for (let i = 0; i < n; i++) out.push(-half + i * step);
  return out;
}

function drawFeatureToken(layer, feature, cx, cy) {
  const r = FEATURE_R;
  const isTreasure = feature.type === 'treasure';
  const cls = isTreasure ? 'treasure' : 'aqua';
  const g = svgEl('g', { class: 'feature-token', transform: 'translate(' + cx.toFixed(2) + ',' + cy.toFixed(2) + ')' });
  // Delved → red outline on the token itself (mirrors how inspired colours the fighter's stroke).
  const circleCls = 'feature-circle ' + cls + (feature.delved ? ' delved' : '');
  const c = svgEl('circle', { cx: 0, cy: 0, r: r, class: circleCls });
  const tip = svgEl('title');
  let tipText = isTreasure
    ? 'Treasure token ' + (feature.label || '?')
    : 'Aqua Ghyranis';
  if (feature.delved) tipText += ' (delved)';
  tip.textContent = tipText;
  c.appendChild(tip);
  g.appendChild(c);
  const lbl = svgEl('text', {
    x: 0, y: 0.25,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    class: 'feature-label ' + cls,
  });
  lbl.textContent = isTreasure ? String(feature.label || '?') : 'A';
  g.appendChild(lbl);
  layer.appendChild(g);
}
