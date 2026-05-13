/* ==================== BOARDS ====================
 * Built-in board definitions. Each board has a `cols`/`rows` count, a list of
 * `excluded` hexes (cut corners), and arrays of special-hex coordinates.
 *
 * Coordinate system: files a–k left to right, ranks 1–9 from your edge
 * (rank 1) up to opponent's (rank 9).
 *
 * Special-hex arrays:
 *   - stagger:  staggered/feature hexes (warm tinted)
 *   - blocked:  blocked hexes (cannot be entered)
 *   - waystone: waystone/objective hexes (green tinted)
 *   - starting: starting-position hexes (marked with a small dot)
 *
 * To add a board, add a new entry here and reference it by id from a game.
 */

export const BOARD_SHAPE = {
  cols: 11, rows: 9,
  excluded: ['a1','b1','j1','k1','a8','a9','b9','c9','e9','g9','i9','k9','j9','k8'],
};

export const BOARDS = {
  'embergard-1': Object.assign({
    name: 'Embergard 1 — Spinning Scythes',
    stagger:  ['g2', 'e7'], blocked: [], waystone: [],
    starting: ['b2','e1','g1','i1','d2','f2','h2', 'c9','e9','g9','i9','d8','f8','h8'],
  }, BOARD_SHAPE),
  'embergard-2': Object.assign({
    name: 'Embergard 2 — Chained Pillars',
    stagger:  ['b3', 'j7'], blocked: ['e4', 'g6'], waystone: [],
    starting: ['c1','e1','g1','i1','d2','f2','h2', 'c9','e9','g9','i9','d8','f8','h8'],
  }, BOARD_SHAPE),
  'spitewood-1': Object.assign({
    name: 'Spitewood 1 — brown',
    stagger:  ['d3', 'h7'], blocked: [], waystone: ['c3', 'i7'],
    starting: ['c1','e1','g1','i1','d2','f2','h2', 'c9','e9','g9','i9','d8','f8','h8'],
  }, BOARD_SHAPE),
  'spitewood-2': Object.assign({
    name: 'Spitewood 2 — green',
    stagger:  ['f5'], blocked: [], waystone: ['c3', 'i3', 'c7', 'i7'],
    starting: ['c1','e1','g1','i1','d2','f2','h2', 'c9','e9','g9','i9','d8','f8','h8'],
  }, BOARD_SHAPE),
};
