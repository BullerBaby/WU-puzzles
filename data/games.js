/* ==================== GAMES ====================
 * Built-in games. Each game is replayable as a sequence of steps. A game can
 * reference shared warband definitions via `warbands: { me, opp }` (see
 * warbands.js) or inline its own `fighters` + `abilities`.
 *
 * Game shape: { id, title, description?, board, round, boardRotation?,
 *               warbands?: { me, opp }, fighters?, abilities?: { me, opp },
 *               decks?: { me, opp }, steps: [...] }
 *
 * Step shape: { notation, title, explanation, dice?, anim?, poll?,
 *               state | diff }
 *   - state: { ... }    → full snapshot
 *   - diff:  { ... }    → merged onto previous step's expanded state
 *
 * State fields: positions, wounds, slain, inspired, glory, tokens, upgrades,
 *               abilitiesUsed, activationsUsed, features, hand, powerStep.
 *
 * See the "Notation reference" section in index.html for a full guide.
 */

export const GAMES = [
  {
    id: 'headsmen-vs-emberwatch-r3-finale',
    title: "Demo - Wielder vs. Ardorn",
    description: "Round 3 of a Headsmen's Curse vs. Emberwatch match. Each side is down to one fighter, both inspired. Glory is tied. Opponent has burned all 4 activations; you have one left. What's the play?",
    round: 3,
    board: 'embergard-1',
    boardRotation: 0,
    warbands: { me: 'headsmens-curse', opp: 'emberwatch' },
    decks: {
      me:  { pair: 'Blazing Assault / Countdown to Cataclysm', plots: ['Countdown to Cataclysm'] },
      opp: { pair: 'Blazing Assault / Emberstone Sentinels',   plots: [] },
    },
    steps: [
      {
        notation: '(R3 — last activation, glory 15-15)',
        title: 'Last stand — your final activation',
        explanation: "Your three retinue fighters are slain; only the Wielder remains, inspired but wounded. Two of the Emberwatch are down; Ardorn stands directly adjacent, inspired and bloodied. Both sides have burned every warscroll ability, the opponent has spent all four activations, and five treasure tokens still lie unclaimed across the board. You have one swing left. Killing the leader nets +3 bounty and scores 'Off with Their Heads' — winning outright. Anything less and the round ends 15-15 → tiebreaker.",
        poll: {
          question: "What's your move?",
          options: [
            'Move to the aqua ghyranis token',
            'Attack Ardorn for the kill',
            'Guard — accept the 15-15 tie and go to tiebreaker',
            'Move to treasure token 4 on i1',
          ],
          correct: 0,
        },
        state: {
          positions: {
            // Alive — directly adjacent (same column, ranks 4 and 5)
            W: '-f1',
            A: 'f0',
            // Slain — last positions before they fell (hidden on the board)
            B: '-d1', S: 'd1', H: 'h0',
            F: 'e2', Y: 'g3',
          },
          wounds: { W: 1, A: 2 },
          slain: ['B', 'S', 'H', 'F', 'Y'],
          inspired: ['W', 'A'],
          glory: [15, 15],
          tokens: { W: ['move'], A: ['charge'] },
          upgrades: {
            W: ['Great Fortitude'],
            A: ['Tested by Fire'],
          },
          abilitiesUsed: {
            me:  ['Eternal Duty', 'Whet the Blade', 'Discorporate', 'Cackling Court'],
            opp: ['Alone We Stand', 'Vanguard Dash', 'Deadly Sentries', 'The Raptors of Sigmar'],
          },
          activationsUsed: { me: 3, opp: 4 },
          features: [
            { type: 'treasure', label: '1', hex: '-d2' },
            { type: 'treasure', label: '2', hex: '-h2' },
            { type: 'treasure', label: '3', hex: 'c1' },
            { type: 'treasure', label: '4', hex: 'i1' },
            { type: 'treasure', label: '5', hex: 'h3' },
            { type: 'aqua', hex: '-f3' },
            { type: 'aqua', hex: 'f3' },
          ],
          hand: {
            me:  { objectives: 3, power: 0 },
            opp: { objectives: 3, power: 0 },
          },
        },
      },
    ],
  },

  {
    id: 'yurik-attack-choice',
    title: "Demo - Yurik's choice",
    description: "Round 2. Yurik Velzaine has two attack profiles — axe at range 1, crossbow at range 4. Two enemies are reachable. Which attack scores more?",
    round: 2,
    board: 'embergard-1',
    boardRotation: 0,
    warbands: { me: 'emberwatch', opp: 'headsmens-curse' },
    decks: {
      me:  { pair: 'Blazing Assault / Emberstone Sentinels',   plots: [] },
      opp: { pair: 'Blazing Assault / Countdown to Cataclysm', plots: ['Countdown to Cataclysm'] },
    },
    steps: [
      {
        notation: '(R2 — Yurik to attack)',
        title: 'Two attacks, one activation',
        explanation: "Yurik is up. Two enemies sit in range: the Sharpener (H) is adjacent at f1 (axe reach), and the Wielder (W) is three hexes away at g4 (crossbow reach). The Sharpener has 2 wounds left and a Dodge save — Dodge doesn't stop hammer attacks, so the axe lands cleanly. The Wielder has 1 wound left, but his Block save contests hammer attacks. Easy kill on a 1-glory fighter, or a riskier shot at the 3-glory leader?",
        poll: {
          question: "Yurik's activation — which attack?",
          options: [
            'Crossbow at W — 1 dmg finishes the leader (+3 glory, contested by Block)',
            'Axe at H — clean 2 dmg kill on the Sharpener (+1 glory)',
            'Crossbow at B — chip 1 wound off the Bearer (no kill, +0 glory)',
            'Guard — pass the activation, save Yurik for next round',
          ],
          correct: 0,
        },
        state: {
          positions: {
            // Me (Emberwatch)
            Y: 'f0',
            A: 'e1',
            F: 'g1',
            // Opp (Headsmens-Curse)
            W: 'g4',
            H: 'f1',
            B: 'd3',
            S: 'h3',
          },
          wounds: { W: 3, H: 1 },
          slain: [],
          inspired: [],
          glory: [3, 4],
          tokens: {},
          upgrades: {},
          abilitiesUsed: {
            me:  ['Vanguard Dash'],
            opp: ['Whet the Blade'],
          },
          activationsUsed: { me: 1, opp: 1 },
          features: [
            { type: 'treasure', label: '1', hex: '-d2' },
            { type: 'treasure', label: '2', hex: '-h2' },
            { type: 'treasure', label: '3', hex: 'c1' },
            { type: 'treasure', label: '4', hex: 'i1' },
            { type: 'treasure', label: '5', hex: 'h3' },
            { type: 'aqua', hex: '-f3' },
            { type: 'aqua', hex: 'f3' },
          ],
          hand: {
            me:  { objectives: 3, power: 3 },
            opp: { objectives: 3, power: 3 },
          },
        },
      },
    ],
  },
{
    id: 'three-vs-five-stub',
    title: 'Stub: 3-fighter warband on Spitewood 2',
    description: "Placeholder showing variable fighter counts and a different board. Replace with a real game when notated.",
    round: 1,
    board: 'spitewood-2',
    boardRotation: 0,
    fighters: {
      L:  { side: 'me',  label: 'L',  name: 'Leader', isLeader: true },
      A:  { side: 'me',  label: 'A',  name: 'Fighter A' },
      Z:  { side: 'me',  label: 'Z',  name: 'Fighter Z' },
      e1: { side: 'opp', label: 'e1', name: 'Enemy leader', isLeader: true },
      e2: { side: 'opp', label: 'e2', name: 'Enemy 2' },
      e3: { side: 'opp', label: 'e3', name: 'Enemy 3' },
      e4: { side: 'opp', label: 'e4', name: 'Enemy 4' },
      e5: { side: 'opp', label: 'e5', name: 'Enemy 5' },
    },
    steps: [
      {
        notation: '(R1 setup — deployment)',
        title: 'Round 1 — opening deployment',
        explanation: "3 vs 5 on Spitewood 2. Four waystones around corners, central stagger.",
        state: {
          positions: { L:'-e4', A:'-c4', Z:'-g4', e1:'e5', e2:'c5', e3:'g5', e4:'i5', e5:'d3' },
          wounds: {}, slain: [], inspired: [],
          glory: [0, 0],
          hand: { me: { objectives: 3, power: 4 }, opp: { objectives: 3, power: 4 } },
          powerStep: [],
        },
      },
    ],
  },
  
  {
    id: 'Test 13may2026',
    title: "'Headsmen's Curse vs Kurnoths Heralds'",
    description: "description",
    round: 1,
    board: 'spitewood-2',
    boardRotation: 0,
    fighters: {
      L:  { side: 'me',  label: 'L',  name: 'Leader', isLeader: true },
      A:  { side: 'me',  label: 'A',  name: 'Fighter A' },
      Z:  { side: 'me',  label: 'Z',  name: 'Fighter Z' },
      e1: { side: 'opp', label: 'e1', name: 'Enemy leader', isLeader: true },
      e2: { side: 'opp', label: 'e2', name: 'Enemy 2' },
      e3: { side: 'opp', label: 'e3', name: 'Enemy 3' },
      e4: { side: 'opp', label: 'e4', name: 'Enemy 4' },
      e5: { side: 'opp', label: 'e5', name: 'Enemy 5' },
    },
    steps: [
      {
        notation: '(R1 setup — deployment)',
        title: 'Round 1 — opening deployment',
        explanation: "3 vs 5 on Spitewood 2. Four waystones around corners, central stagger.",
        state: {
          positions: { L:'-e4', A:'-c4', Z:'-g4', e1:'e5', e2:'c5', e3:'g5', e4:'i5', e5:'d3' },
          wounds: {}, slain: [], inspired: [],
          glory: [0, 0],
          hand: { me: { objectives: 3, power: 4 }, opp: { objectives: 3, power: 4 } },
          powerStep: [],
        },
      },
    ],
  },

  {
    id: 'frederik-vs-mathias-liga',
    title: 'Frederik vs Mathias — Epic Liga battle',
    description: "Recreated from a club-night photo. Round 2: both warbands have closed into a central melee on Spitewood.",
    round: 2,
    board: 'spitewood-2',
    boardRotation: 0,
    decks: {
      me:  { pair: "Hunter's Cunning / Stalking Shadows",   plots: ['Sneak Attack', 'Final Lesson'] },
      opp: { pair: "Power Unbound / Countdown to Cataclysm", plots: ['Ritual Sacrifice'] },
    },
    fighters: {
      // Mathias's warband — visible on the warscroll cards in the photo
      C: { side: 'me',  label: 'C', name: 'Cullon', isLeader: true,
           move: 4, wounds: 4, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { name: 'Lance', range: 1, dice: 3, damage: 3, type: 'hammer' },
           ] },
      Y: { side: 'me',  label: 'Y', name: 'Ylarin',
           move: 4, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Hunting Bow', range: 4, dice: 2, damage: 2, type: 'sword' },
           ] },
      L: { side: 'me',  label: 'L', name: 'Lerwythe',
           move: 3, wounds: 4, glory: 1,
           save: { dice: 2, type: 'block' },
           attacks: [
             { name: 'Hooked Spear', range: 2, dice: 2, damage: 2, type: 'sword' },
           ] },
      S: { side: 'me',  label: 'S', name: 'Skaen',
           move: 4, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Twin Daggers', range: 1, dice: 3, damage: 1, type: 'sword' },
           ] },
      // Frederik's warband — three identical Sentinel-style fighters + a leader
      f1: { side: 'opp', label: '-f4', name: "Frederik's leader", isLeader: true,
            move: 3, wounds: 5, glory: 2,
            save: { dice: 2, type: 'block' },
            attacks: [
              { name: 'Two-handed Blade', range: 1, dice: 3, damage: 3, type: 'sword' },
            ] },
      f2: { side: 'opp', label: '-f3', name: 'Sentinel',
            move: 4, wounds: 3, glory: 1,
            save: { dice: 1, type: 'dodge' },
            attacks: [
              { name: 'Sentinel Spear', range: 2, dice: 2, damage: 2, type: 'sword' },
            ] },
      f3: { side: 'opp', label: '-f2', name: 'Sentinel',
            move: 4, wounds: 3, glory: 1,
            save: { dice: 1, type: 'dodge' },
            attacks: [
              { name: 'Sentinel Spear', range: 2, dice: 2, damage: 2, type: 'sword' },
            ] },
      f4: { side: 'opp', label: '-f1', name: 'Sentinel',
            move: 4, wounds: 3, glory: 1,
            save: { dice: 1, type: 'dodge' },
            attacks: [
              { name: 'Sentinel Spear', range: 2, dice: 2, damage: 2, type: 'sword' },
            ] },
    },
    steps: [
      {
        notation: 'R2 — central melee snapshot',
        title: 'Board position (from photo)',
        explanation: "Snapshot from a club night. Mathias's line (Cullon, Lerwythe, Ylarin, Skaen) presses up from ranks 4-5; Frederik's three Sentinels and their leader meet them at rank 6. Everyone's in striking distance of someone.",
        state: {
          positions: {
            Y: 'c1', S: '-d1', C: 'e1', L: 'f0',
            f1: 'e2', f2: 'f1', f3: 'g2', f4: 'd1',
          },
          glory: [0, 0],
          hand: { me: { objectives: 3, power: 4 }, opp: { objectives: 3, power: 4 } },
        },
      },
    ],
  },
];
