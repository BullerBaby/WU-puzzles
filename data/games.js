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
    id: 'ylarin-last-activation-tiebreaker',
    title: "Kurnoth's Heralds vs. Emberwatch — Last Activation",
    description: "Round 3 finale of Kurnoth's Heralds into Ardorn's Emberwatch. Your leader is still standing, one Emberwatch fighter remains, glory is tied 20-20, and the game is on its final activation.",
    round: 3,
    board: 'embergard-1',
    warbands: { me: 'kurnoths-heralds', opp: 'emberwatch' },
    decks: {
      me:  { pair: 'Hunting Grounds / Pillage to Plunder', plots: [] },
      opp: { pair: 'Blazing Assault / Countdown to Cataclysm', plots: ['Countdown to Cataclysm'] },
    },
    steps: [
      {
        notation: '(R3 — last activation, glory 20-20)',
        title: 'Last activation decision',
        explanation: "Ylarin stands on j3 while Ardorn clings to 3 wounds remaining on -c1. With glory tied at 20-20, both warscrolls spent, and the final activation of the game remaining, the question is whether to secure a tie-breaker edge rather than make an unnecessary combat play.",
        poll: {
          question: "What's your move?",
          options: [
            'Move to treasure token 5 on f2',
            'Move to treasure token 4 on i1',
            'Charge Ardorn on -c1',
            'Guard in place and accept the 20-20 tie',
          ],
          correct: 1,
        },
        state: {
          positions: { Y: 'j3', A: '-c1' },
          wounds:    { A: 2 },
          slain:     ['C', 'L', 'F', 'oY'],
          inspired:  [],
          glory:     [20, 20],
          abilitiesUsed: {
            me:  ['Swift Sentinels', 'The Endless Hunt', "Herald's Pride", 'Precision Volley'],
            opp: ['Alone We Stand', 'Vanguard Dash', 'Deadly Sentries', 'The Raptors of Sigmar'],
          },
          activationsUsed: { me: 3, opp: 4 },
          features: [
            { type: 'treasure', label: '1', hex: '-d2' },
            { type: 'treasure', label: '2', hex: '-h2' },
            { type: 'treasure', label: '3', hex: 'c1'  },
            { type: 'treasure', label: '4', hex: 'i1'  },
            { type: 'treasure', label: '5', hex: 'f2'  },
            { type: 'aqua', hex: '-f3' },
            { type: 'aqua', hex: 'b2'  },
          ],
          hand: {
            me:  { objectives: 0, power: 0 },
            opp: { objectives: 0, power: 1 },
          },
        },
      },
      {
        notation: '(R3 — Emberwatch reveals power card)',
        title: 'Violent Blast in opponent\'s hand',
        explanation: "Ardorn's last power card is revealed: Violent Blast. A gambit that could have struck Ylarin had he closed within range — pushing for treasure 5 on f2 would have put him in danger. Stepping onto i1 for treasure 4 keeps Ylarin clear of the threat while still claiming the tiebreaker.",
        diff: {
          hand: { opp: { power: ['Violent Blast'] } },
        },
      },
    ],
  },
];
