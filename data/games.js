/* ==================== GAMES ====================
 * Built-in games. Each game is replayable as a sequence of steps. A game can
 * reference shared warband definitions via `warbands: { me, opp }` (see
 * warbands.js) or inline its own `fighters` + `abilities`.
 *
 * Game shape: { id, title, description?, tags?, difficulty?, date?, location?,
 *               credit?, board, round, boardRotation?,
 *   - difficulty: integer 1 (easiest) .. 5 (hardest). Drives ordering and
 *     scoring in Challenge mode (js/challenge.js). Untagged games default to 3.
 *               warbands?: { me, opp }, fighters?, abilities?: { me, opp },
 *               decks?: { me, opp }, steps: [...] }
 *
 * Step shape: { explanation, dice?, anim?, poll?,
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
    title: "Headsmen's Curse vs Emberwatch, Last activation",
    description: "Round 3, last activation of the game. Glory is tied 15-15.",
    tags: ['Tiebreaker'],
    difficulty: 1,
    date: '',
    location: '',
    credit: '',
    round: 3,
    board: 'embergard-1',
    boardRotation: 0,
    warbands: { me: 'headsmens-curse', opp: 'emberwatch' },
    decks: {
      me:  { pair: 'Blazing Assault / Countdown to Cataclysm' },
      opp: { pair: 'Blazing Assault / Emberstone Sentinels' },
    },
    steps: [
      {
        explanation: "Round 3, last activation of the game. Glory is tied 15-15 and opponent has no power cards or objective cards left. How to secure victory?",
        poll: {
          question: "What's your move?",
          options: [
            'Move to your own aqua ghyranis token',
            'Attack Ardorn for the kill',
            'Guard — accept the 15-15 tie and go to tiebreaker',
            'Move to treasure token 4 on i1',
          ],
          correct: 3,
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
    title: "Demo - Cullon's choice",
    description: "Round 2. Which attack should Cullon use?",
    tags: ['Probability'],
    difficulty: 2,
    date: '',
    location: '',
    credit: '',
    round: 2,
    board: 'embergard-1',
    boardRotation: 0,
    warbands: { me: 'kurnoths-heralds', opp: 'headsmens-curse' },
    decks: {
      me:  { pair: 'Hunting Grounds / Pillage and Plunder' },
      opp: { pair: 'Blazing Assault / Countdown to Cataclysm' },
    },
    steps: [
      {
        explanation: "Cullon is about to attack. Which attack is best?",
        poll: {
          question: "Cullon's activation — which attack?",
          options: [
            'Axe — 2 hammer dice for 2 damage',
            'Hooves — 4 sword dice for 1 damage [Crit Grapple]',
          ],
          correct: 1,
        },
        state: {
          positions: {
            // Me (Kurnoth's Heralds) — Y and L pulled back; Cullon stays in melee at e1
            Y: 'h2',
            C: 'e1',
            L: 'i3',
            // Opp (Headsmens-Curse) — unchanged
            W: 'g4',
            H: 'f1',
            B: 'd3',
            S: 'h3',
          },
          wounds: { W: 3, H: 2 },
          slain: [],
          inspired: [],
          glory: [3, 4],
          tokens: {
            // Everyone has charged this round — except Cullon, who moved
            // into melee range and is now spending his activation attacking.
            Y: ['charge'],
            C: ['move'],
            L: ['charge'],
            W: ['charge'],
            H: ['charge'],
            B: ['charge'],
            S: ['charge'],
          },
          upgrades: {},
          abilitiesUsed: {
            me:  ['Swift Sentinels', 'The Endless Hunt', "Herald's Pride", 'Precision Volley'],
            opp: ['Eternal Duty', 'Whet the Blade', 'Discorporate', 'Cackling Court'],
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
    description: "Round 3 finale of Kurnoth's Heralds into Ardorn's Emberwatch. Your leader is still standing, one Emberwatch fighter remains, glory is tied 20-20, the opponent has one power card left, and the game is on its final activation.",
    tags: ['Cards'],
    difficulty: 3,
    date: '',
    location: '',
    credit: '',
    round: 3,
    board: 'embergard-1',
    boardRotation: 0,
    warbands: { me: 'kurnoths-heralds', opp: 'emberwatch' },
    decks: {
      me:  { pair: 'Hunting Grounds / Pillage and Plunder' },
      opp: { pair: 'Blazing Assault / Countdown to Cataclysm' },
    },
    steps: [
      {
        revealOnCorrect: true,
        explanation: "Glory is tied 20-20, the opponent has one power card left, and the game is on its final activation.",
        poll: {
          question: "What's your move?",
          options: [
            'Move to treasure token 5 on f2',
            'Move to treasure token 4 on i1',
            'Charge Ardorn on -c1',
            'Go on guard',
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
        explanation: "Ardorn's last power card is revealed: Violent Blast.",
        diff: {
          hand: { opp: { power: ['Violent Blast'] } },
        },
      },
    ],
  },
];
