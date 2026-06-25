/* ==================== BOARD ====================
 * Hex math, board SVG rendering, legend, and feature-token placement.
 *
 * Coordinate systems:
 *   - 0° / 180°: flat-top hexes on an 11×9 grid (canonical). Files a–k,
 *     ranks ±4. Asymmetric col rule: odd cols pass through midline (have
 *     a rank-0 hex); even cols straddle (skip rank 0).
 *   - 90° / 270°: pointy-top hexes on a 9×11 grid (rotated, with its own
 *     fresh coordinate system). Files a–i, ranks ±5. Symmetric col rule:
 *     every col has a rank-0 hex.
 *
 * The rotated coordinate system is INDEPENDENT of the canonical: a hex
 * named "a0" in a 90° view is its own hex, not a translated canonical "a0".
 * `rotateHex(canonicalId, rotation)` translates a canonical hex to its
 * corresponding rotated-frame hex, used to display the canonical board's
 * stagger/blocked/etc. positions in the rotated view.
 */

import { BOARDS } from '../data/boards.js';

/* ---- hex geometry ----
 * Two orientations switched by the resolved board's `orientation`:
 *   flat-top   (0° / 180°): flat top and bottom, points on left/right.
 *                            Adjacent cols step horizontally; odd cols
 *                            offset vertically by COL_OFFSET.
 *   pointy-top (90° / 270°): points on top and bottom, flat on sides.
 *                            Adjacent rows step vertically; odd rows
 *                            offset horizontally. */
export const R = 13;
const SQRT3 = Math.sqrt(3);
// Flat-top step sizes (used at 0° and 180°)
const COL_STEP    = 1.5 * R;          // = 19.5
const ROW_STEP    = R * SQRT3;        // ≈ 22.5
const COL_OFFSET  = ROW_STEP / 2;     // ≈ 11.25
// Pointy-top step sizes (used at 90° and 270°)
const PT_COL_STEP = R * SQRT3;        // ≈ 22.5
const PT_ROW_STEP = 1.5 * R;          // = 19.5
const PT_ROW_OFF  = PT_COL_STEP / 2;  // ≈ 11.25
const BASE_X = 32;
const BASE_Y = 26;

/* ---- centered rank notation ----
 * Flat-top boards: midline only passes through odd cols (b0, d0, f0, h0, j0).
 *   Even cols skip rank 0, going from -1 to +1.
 * Pointy-top boards: midline passes through every col (a0, b0, ..., i0).
 *   Symmetric col rule: n = absRank - mid for all cols. */

function parseHex(hexStr, boardRows, orientation) {
  const pointy = (orientation === 'pointy-top');
  let s = hexStr;
  let negative = false;
  if (s.charAt(0) === '-') { negative = true; s = s.slice(1); }
  const file = s.charAt(0);
  const n = parseInt(s.slice(1), 10);
  const col = file.charCodeAt(0) - 97;
  const mid = Math.ceil(boardRows / 2);
  let absoluteRank;
  if (pointy) {
    absoluteRank = negative ? (mid - n) : (n === 0 ? mid : mid + n);
  } else {
    if (negative)            absoluteRank = mid - n;
    else if (n === 0)        absoluteRank = mid;
    else if (col % 2 === 1)  absoluteRank = mid + n;
    else                     absoluteRank = (mid - 1) + n;
  }
  return { file, col, rank: absoluteRank };
}

function formatHex(file, absoluteRank, boardRows, orientation) {
  const pointy = (orientation === 'pointy-top');
  const col = file.charCodeAt(0) - 97;
  const mid = Math.ceil(boardRows / 2);
  let n;
  if (pointy) {
    n = absoluteRank - mid;
  } else {
    if (col % 2 === 1)            n = absoluteRank - mid;
    else if (absoluteRank < mid)  n = absoluteRank - mid;
    else                          n = absoluteRank - (mid - 1);
  }
  if (n < 0) return '-' + file + Math.abs(n);
  return file + n;
}

/* Translate a CANONICAL hex ID (flat-top, 11×9) into the rotated frame's
 * hex ID. Used to display the canonical board's features (stagger, blocked,
 * etc.) in their correct location on a rotated view.
 *
 *   90° CW: (col, absRank) → newCol = absRank - 1, newRank = cols - col
 *           Result is in the 9×11 pointy-top frame.
 *   180°:   (col, absRank) → newCol = cols-1-col, newRank = rows+1-rank
 *           Result is in the 11×9 flat-top frame (mirrored).
 *   270°:   (col, absRank) → newCol = rows - rank, newRank = col + 1
 *           Result is in the 9×11 pointy-top frame.  */
function rotateHex(canonicalHex, rotation, canonCols, canonRows) {
  const r = ((rotation || 0) % 360 + 360) % 360;
  if (r === 0) return canonicalHex;
  const { col, rank } = parseHex(canonicalHex, canonRows, 'flat-top');
  let newCol, newRank, newRows, outOrientation;
  if (r === 90) {
    newCol = rank - 1;
    newRank = canonCols - col;
    newRows = canonCols;      // 11 rows in rotated frame
    outOrientation = 'pointy-top';
  } else if (r === 180) {
    newCol = canonCols - 1 - col;
    newRank = canonRows + 1 - rank;
    newRows = canonRows;      // 9 rows in rotated (= canonical) frame
    outOrientation = 'flat-top';
  } else if (r === 270) {
    newCol = canonRows - rank;
    newRank = col + 1;
    newRows = canonCols;
    outOrientation = 'pointy-top';
  } else {
    return canonicalHex;
  }
  return formatHex(String.fromCharCode(97 + newCol), newRank, newRows, outOrientation);
}

function rotateHexes(arr, rotation, canonCols, canonRows) {
  return (arr || []).map(h => rotateHex(h, rotation, canonCols, canonRows));
}

/* Resolve a board for rendering at a given rotation. For 0° and 180°,
 * returns a flat-top 11×9. For 90° and 270°, returns a pointy-top 9×11.
 * The returned board's `excluded`, `stagger`, `blocked`, `waystone`, and
 * `starting` lists are pre-rotated, so the renderer iterates directly. */
export function resolveBoard(boardId, rotation) {
  const board = BOARDS[boardId] || BOARDS['embergard-1'];
  const r = ((rotation || 0) % 360 + 360) % 360;
  const orientation = (r === 90 || r === 270) ? 'pointy-top' : 'flat-top';
  const swap = (r === 90 || r === 270);
  return {
    ...board,
    cols: swap ? board.rows : board.cols,
    rows: swap ? board.cols : board.rows,
    orientation,
    rotation: r,
    excluded: rotateHexes(board.excluded, r, board.cols, board.rows),
    stagger:  rotateHexes(board.stagger,  r, board.cols, board.rows),
    blocked:  rotateHexes(board.blocked,  r, board.cols, board.rows),
    waystone: rotateHexes(board.waystone, r, board.cols, board.rows),
    starting: rotateHexes(board.starting, r, board.cols, board.rows),
  };
}

export function hexCenter(hexStr, board) {
  // Accept either a board object or a plain numeric rows (legacy callers).
  const orientation = (typeof board === 'object' && board) ? (board.orientation || 'flat-top') : 'flat-top';
  const rows = (typeof board === 'object' && board) ? board.rows : board;
  const { col, rank } = parseHex(hexStr, rows, orientation);
  const rowInv = rows - rank;  // 0 = top row, rows-1 = bottom row
  if (orientation === 'pointy-top') {
    return {
      x: BASE_X + col * PT_COL_STEP + (rowInv % 2) * PT_ROW_OFF,
      y: BASE_Y + rowInv * PT_ROW_STEP,
    };
  }
  return {
    x: BASE_X + col * COL_STEP,
    y: BASE_Y + rowInv * ROW_STEP + (col % 2) * COL_OFFSET,
  };
}

function hexPolyPoints(cx, cy, pointy) {
  const h = R * SQRT3 / 2;
  if (pointy) {
    // Points top/bottom, flats on sides.
    return [
      [cx, cy - R],      [cx + h, cy - R/2], [cx + h, cy + R/2],
      [cx, cy + R],      [cx - h, cy + R/2], [cx - h, cy - R/2],
    ].map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
  }
  // Flats top/bottom, points on sides.
  return [
    [cx + R, cy],        [cx + R/2, cy + h], [cx - R/2, cy + h],
    [cx - R, cy],        [cx - R/2, cy - h], [cx + R/2, cy - h],
  ].map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
}

/* ---- SVG helpers ---- */
const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/* ==================== RENDER BOARD ====================
 * Rotation model:
 *   - Hex POSITIONS: hexes are rendered at their canonical (flat-top 11×9)
 *     positions, then the whole hex group gets an SVG rotate transform for
 *     90/180/270°. This keeps the visual layout consistent.
 *   - Hex LABELS: each canonical hex is shown with its ROTATED-frame ID
 *     (via rotateHex). The label is counter-rotated so it appears upright.
 *   - Hex COLORS: tinting is based on the rotated-frame ID's rank sign
 *     (negative=blue your-side, positive=coral opp, zero=neutral midline).
 *   - AXIS LABELS: placed OUTSIDE the rotation group, in their natural
 *     visual positions (rank numbers on left, file letters on bottom).
 */
export function renderBoard(game) {
  const svg = document.getElementById('board-svg');
  const board = BOARDS[game.board] || BOARDS['embergard-1'];
  const rotation = ((game.boardRotation || 0) % 360 + 360) % 360;
  const isQuarter = (rotation === 90 || rotation === 270);

  svg.innerHTML = '';

  const canonCols = board.cols;
  const canonRows = board.rows;
  const FILES = 'abcdefghijk'.slice(0, canonCols);

  // Canonical (unrotated) content extent.
  const canonW = Math.ceil(BASE_X + (canonCols - 1) * COL_STEP + R + 20);
  const canonH = Math.ceil(BASE_Y + (canonRows - 1) * ROW_STEP + COL_OFFSET + R + 22);
  const cx = canonW / 2;
  const cy = canonH / 2;

  // ViewBox: rotated dims for 90°/270°, plus margin for axis labels on left/bottom.
  const margin = { left: 28, bottom: 22 };
  let vbX, vbY, vbW, vbH;
  if (isQuarter) {
    vbX = (cx - cy) - margin.left;
    vbY = (cy - cx);
    vbW = canonH + margin.left;
    vbH = canonW + margin.bottom;
  } else {
    vbX = -margin.left;
    vbY = 0;
    vbW = canonW + margin.left;
    vbH = canonH + margin.bottom;
  }
  svg.setAttribute('viewBox', vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH);

  const excludedSet = new Set(board.excluded || []);
  const staggerSet  = new Set(board.stagger  || []);
  const blockedSet  = new Set(board.blocked  || []);
  const waystoneSet = new Set(board.waystone || []);
  const startingSet = new Set(board.starting || []);

  // Hex content group — rotated for 90/180/270.
  const hexGroup = svgEl('g');
  if (rotation !== 0) {
    hexGroup.setAttribute('transform', 'rotate(' + rotation + ' ' + cx + ' ' + cy + ')');
  }
  svg.appendChild(hexGroup);

  // Render each canonical hex at its canonical position.
  for (let i = 0; i < canonCols; i++) {
    for (let rk = 1; rk <= canonRows; rk++) {
      const canonId = formatHex(FILES[i], rk, canonRows, 'flat-top');
      if (excludedSet.has(canonId)) continue;

      // Compute the displayed (rotated-frame) ID.
      const displayId = rotateHex(canonId, rotation, canonCols, canonRows);

      const x = BASE_X + i * COL_STEP;
      const y = BASE_Y + (canonRows - rk) * ROW_STEP + (i % 2) * COL_OFFSET;

      // Side tinting based on the displayed (rotated) ID.
      const sign = displayId.charAt(0) === '-' ? -1 : (displayId.indexOf('0') > 0 ? 0 : 1);
      let cls = 'hex-poly';
      if (sign < 0)      cls += ' your-side';
      else if (sign > 0) cls += ' opp-side';
      else               cls += ' midline';
      // Special hex types remain attached to the canonical hex (they're a
      // physical property of the board card, not the coord system).
      if (staggerSet.has(canonId))  cls = 'hex-poly stagger';
      if (waystoneSet.has(canonId)) cls = 'hex-poly waystone';
      if (blockedSet.has(canonId))  cls = 'hex-poly blocked';

      // Always render flat-top polygon — the visual rotation happens via the
      // parent group's transform, which turns flat-top into pointy-top
      // for 90°/270°.
      const poly = svgEl('polygon', { points: hexPolyPoints(x, y, false), class: cls, 'data-hex': displayId });
      const title = svgEl('title', {});
      let hexDesc = displayId;
      if (staggerSet.has(canonId))       hexDesc = displayId + ' — Stagger hex';
      else if (waystoneSet.has(canonId)) hexDesc = displayId + ' — Waystone hex';
      else if (blockedSet.has(canonId))  hexDesc = displayId + ' — Blocked hex';
      else if (startingSet.has(canonId)) hexDesc = displayId + ' — Starting hex';
      title.textContent = hexDesc;
      poly.appendChild(title);
      hexGroup.appendChild(poly);

      // Per-hex coord label — counter-rotated so it reads upright after the
      // parent rotation.
      const coord = svgEl('text', {
        x: x.toFixed(1),
        y: (y - 8.2).toFixed(1),
        'text-anchor': 'middle',
        class: 'hex-coord',
      });
      if (rotation !== 0) {
        coord.setAttribute('transform', 'rotate(' + (-rotation) + ' ' + x.toFixed(1) + ' ' + (y - 8.2).toFixed(1) + ')');
      }
      coord.textContent = displayId;
      hexGroup.appendChild(coord);

      if (startingSet.has(canonId)) {
        const dot = svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 1.8, class: 'starting-dot' });
        const dotTitle = svgEl('title', {});
        dotTitle.textContent = displayId + ' — Starting hex';
        dot.appendChild(dotTitle);
        hexGroup.appendChild(dot);
      }
    }
  }

  // --- AXIS LABELS (outside the rotation group) ---
  // Compute the rotated visual position of every canonical hex, then for each
  // displayed col/rank, place its label at the appropriate edge.
  function rotPoint(x, y) {
    if (rotation === 0) return { x, y };
    const rad = rotation * Math.PI / 180;
    const cosR = Math.cos(rad), sinR = Math.sin(rad);
    const dx = x - cx, dy = y - cy;
    return { x: cx + dx * cosR - dy * sinR, y: cy + dx * sinR + dy * cosR };
  }

  // Visual bounds of the rotated content (for placing labels at the edges).
  let visMinX = Infinity, visMaxX = -Infinity, visMinY = Infinity, visMaxY = -Infinity;
  for (let i = 0; i < canonCols; i++) {
    for (let rk = 1; rk <= canonRows; rk++) {
      const canonId = formatHex(FILES[i], rk, canonRows, 'flat-top');
      if (excludedSet.has(canonId)) continue;
      const x = BASE_X + i * COL_STEP;
      const y = BASE_Y + (canonRows - rk) * ROW_STEP + (i % 2) * COL_OFFSET;
      const p = rotPoint(x, y);
      if (p.x < visMinX) visMinX = p.x;
      if (p.x > visMaxX) visMaxX = p.x;
      if (p.y < visMinY) visMinY = p.y;
      if (p.y > visMaxY) visMaxY = p.y;
    }
  }
  const rowLabelX = visMinX - R - 3;
  const colLabelY = visMaxY + R + 11;

  // Determine the displayed frame's dimensions and orientation.
  const dispCols = isQuarter ? canonRows : canonCols;
  const dispRows = isQuarter ? canonCols : canonRows;
  const dispOrient = isQuarter ? 'pointy-top' : 'flat-top';
  const dispFILES = 'abcdefghijk'.slice(0, dispCols);
  const dispMid = Math.ceil(dispRows / 2);

  // For each rotated col, find a visible canonical hex that maps to it and use
  // that hex's bottom-most visual position for the file-letter label.
  for (let dispCol = 0; dispCol < dispCols; dispCol++) {
    let bottomX = null, bottomY = -Infinity;
    for (let i = 0; i < canonCols; i++) {
      for (let rk = 1; rk <= canonRows; rk++) {
        const canonId = formatHex(FILES[i], rk, canonRows, 'flat-top');
        if (excludedSet.has(canonId)) continue;
        const dispId = rotateHex(canonId, rotation, canonCols, canonRows);
        const { col: dCol } = parseHex(dispId, dispRows, dispOrient);
        if (dCol !== dispCol) continue;
        const x = BASE_X + i * COL_STEP;
        const y = BASE_Y + (canonRows - rk) * ROW_STEP + (i % 2) * COL_OFFSET;
        const p = rotPoint(x, y);
        if (p.y > bottomY) { bottomY = p.y; bottomX = p.x; }
      }
    }
    if (bottomX !== null) {
      const t = svgEl('text', { x: bottomX.toFixed(1), y: colLabelY.toFixed(1), 'text-anchor': 'middle', class: 'coord-label' });
      t.textContent = dispFILES[dispCol];
      svg.appendChild(t);
    }
  }

  // For each rotated rank, find a visible canonical hex that maps to it and
  // use that hex's leftmost visual position for the rank-number label.
  for (let dispRk = 1; dispRk <= dispRows; dispRk++) {
    let leftX = Infinity, leftY = null;
    for (let i = 0; i < canonCols; i++) {
      for (let rk = 1; rk <= canonRows; rk++) {
        const canonId = formatHex(FILES[i], rk, canonRows, 'flat-top');
        if (excludedSet.has(canonId)) continue;
        const dispId = rotateHex(canonId, rotation, canonCols, canonRows);
        const { rank: dRank } = parseHex(dispId, dispRows, dispOrient);
        if (dRank !== dispRk) continue;
        const x = BASE_X + i * COL_STEP;
        const y = BASE_Y + (canonRows - rk) * ROW_STEP + (i % 2) * COL_OFFSET;
        const p = rotPoint(x, y);
        if (p.x < leftX) { leftX = p.x; leftY = p.y; }
      }
    }
    if (leftY !== null) {
      const n = dispRk - dispMid;
      const t = svgEl('text', {
        x: rowLabelX.toFixed(1),
        y: (leftY + 3).toFixed(1),
        'text-anchor': 'end',
        class: 'coord-label' + (n === 0 ? ' midline' : ''),
      });
      t.textContent = String(n);
      svg.appendChild(t);
    }
  }

  svg.appendChild(svgEl('g', { id: 'fighters-layer' }));
  svg.appendChild(svgEl('g', { id: 'features-layer' }));
  svg.appendChild(svgEl('g', { id: 'dmg-layer' }));

  const fightersLayer = document.getElementById('fighters-layer');
  for (const id in game.fighters) {
    const info = game.fighters[id];
    const g = svgEl('g', { id: 'f-' + id, class: 'fighter' });
    const isMe = info.side === 'me';
    const fTitle = svgEl('title', { id: 'ftitle-' + id });
    fTitle.textContent = info.name || info.label;
    g.appendChild(fTitle);
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
/* The board legend was removed: every element that used to be explained in
 * the legend (feature tokens, action tokens, inspired fighters, special hex
 * types) now carries its own SVG <title>, so the explanation shows on hover
 * over the actual element on the board. Kept as a safe no-op so existing
 * callers don't break. */
export function renderLegend(game) {
  const aside = document.getElementById('legend-side');
  if (aside) aside.innerHTML = '';
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
