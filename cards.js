/* ==================== BOARDS ====================
 * Built-in board definitions. Each board has a `cols`/`rows` count, a list of
 * `excluded` hexes (cut corners), and arrays of special-hex coordinates.
 *
 * Coordinate system: files a–k left to right, ranks centred on the midline.
 * Hexes on the midline (only odd cols b/d/f/h/j) are <file>0 (e.g. b0).
 * Hexes on your side use -<file><n> (e.g. -f1, -d4 = your back row).
 * Hexes on opp side use <file><n> (e.g. f1, d4 = opp back row).
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
  excluded: ['-a4','-b4','-j4','-k4','a4','a5','b4','c5','e5','g5','i5','k5','j4','k4'],
};

export const BOARDS = {
  'embergard-1': Object.assign({
    name: 'Embergard 1 — Spinning Scythes',
    stagger:  ['-g3', 'e3'], blocked: [], waystone: [],
    starting: ['-b2','b1','-c3','c3','-d1','d3','e2', '-g2','-h3','h2','-i3','-i1','j2','k3'],
  }, BOARD_SHAPE),
  'embergard-2': Object.assign({
    name: 'Embergard 2 — Chained Pillars',
    stagger:  ['-b2', 'j2'], blocked: ['-e1', 'g2'], waystone: [],
    starting: ['-c4','-e4','-g4','-i4','-d3','-f3','-h3', 'c5','e5','g5','i5','d3','f3','h3'],
  }, BOARD_SHAPE),
  'spitewood-1': Object.assign({
    name: 'Spitewood 1 — brown',
    stagger:  ['-d2', 'h2'], blocked: [], waystone: ['-c2', 'i3'],
    starting: ['-c4','-e4','-g4','-i4','-d3','-f3','-h3', 'c5','e5','g5','i5','d3','f3','h3'],
  }, BOARD_SHAPE),
  'spitewood-2': Object.assign({
    name: 'Spitewood 2 — green',
    stagger:  ['f0'], blocked: [], waystone: ['-c2', '-i2', 'c3', 'i3'],
    starting: ['-c4','-e4','-g4','-i4','-d3','-f3','-h3', 'c5','e5','g5','i5','d3','f3','h3'],
  }, BOARD_SHAPE),
};
