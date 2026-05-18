# Authoring puzzles with AI

You can describe a Warhammer Underworlds puzzle in plain English (or hand a photo to a vision-capable AI), and let the AI emit the JSON the app expects. Then paste that JSON into **Load your own game** at the top of the page.

This guide gives you:
- A ready-to-paste **AI prompt** with all the schema and reference data the AI needs.
- A **schema reference** for hand-editing or debugging.
- A worked example: description in, JSON out.

---

## Quick start

1. Open ChatGPT, Claude.ai, Gemini, or any LLM with at least 8k context (vision-capable if you want to use a photo).
2. Paste the **AI prompt** below.
3. Add your description (or attach a photo) and send.
4. Copy the JSON the AI returns.
5. In the app, open **Load your own game**, paste, click **Load game**.

If the JSON fails to load, the app will tell you what's missing. The AI also sometimes drops a field — re-prompt with "this failed because X" and it'll usually fix it.

---

## The AI prompt

Copy everything between the `=== BEGIN AI PROMPT ===` and `=== END AI PROMPT ===` markers and paste it as your first message to the AI. Then send a second message with your puzzle description (or attach the photo).

```
=== BEGIN AI PROMPT ===
You are converting a Warhammer Underworlds puzzle description (or photo of a game state) into the JSON format used by the WU-puzzles app. Output ONE valid JSON object, with no prose, no comments, and no markdown fences — just raw JSON.

# COORDINATE SYSTEM

Hexes are labeled by file letter (column, a–k left to right) + signed rank (distance from the board's midline). The board midline is rank 0.

- Positive ranks (opp side, toward the opponent's edge): bare number, e.g. f1, d3, h4.
- Zero (only on odd columns b, d, f, h, j — these sit ON the midline): bare 0, e.g. b0, d0, f0, h0, j0.
- Negative ranks (your side, toward your edge): dash prefix, e.g. -f1, -d3, -h4.

Important rules:
- Even columns (a, c, e, g, i, k) have NO 0 hex. They straddle the midline, going from -1 directly to +1.
- Maximum rank magnitude is 4 (boards have 9 ranks total, midline + 4 either side).
- Hex IDs are strings. "f0" and "-d4" are correct; the JS number 0 is not.

Excluded (non-existent) hexes on the standard 9×11 board:
your-side corners cut: -a4, -b4, -j4, -k4 (these are NOT playable hexes; do not place anything on them).
opp-side corners cut: a4, a5, b4, c5, e5, g5, i5, k5, j4, k4 (also not playable; never place fighters/tokens there).

# AVAILABLE BOARDS

- "embergard-1" — Spinning Scythes. Stagger hexes at -g3, e3.
- "embergard-2" — Chained Pillars. Stagger at -b2, j2. Blocked at -e1, g2.
- "spitewood-1" — brown. Stagger at -d2, h2. Waystones at -c2, i3.
- "spitewood-2" — green. Stagger at f0. Waystones at -c2, -i2, c3, i3.

# AVAILABLE WARBANDS

Each warband has fixed fighter IDs (one-letter codes used in positions/wounds/etc.) and a leader.

- "headsmens-curse" — Headsmen's Curse:
    W = Wielder of Doom (leader),  B = Bearer of Punishment,
    S = Scriptor of Suffering,     H = Sharpener of Sins.
- "emberwatch" — Ardorn's Emberwatch:
    A = Ardorn (leader),  F = Farasa,  Y = Yurik Velzaine.
- "generic-4" — placeholder 4-fighter warband (use when the opponent's warband isn't one of the above):
    o1 (leader), o2, o3, o4.

If a player's warband is none of these, use "generic-4" for that side and put the real warband name in the title or description.

# WHAT THE WARBAND PROVIDES (DON'T REDEFINE)

When you reference a warband via `"warbands": { "me": "id", "opp": "id" }`, the app automatically loads each warband's fighters with their full base stats and abilities. DO NOT include any of the following in your output — they come from the warband:

- Fighter names, labels, leader flag
- Move, Wounds, Glory, Save (dice + type)
- Attack profiles (uninspired and inspired) — name, range, dice, damage, type, cleave, notes
- Warscroll abilities

In particular: **do not output a `fighters: { ... }` block** with stats. Just reference the warband. The `fighters` block is only for advanced per-fighter overrides (e.g. testing a homebrew variant); for normal puzzles, leave it out entirely.

What you DO supply per fighter, in the step's `state` object, is the DYNAMIC info: where they stand (`positions`), how many wounds they've taken (`wounds`), whether they're inspired or slain, what tokens/upgrades they carry. None of that lives in the warband.

# DECK PAIRS AND PLOT CARDS

The decks field is descriptive — it's shown in the UI but doesn't drive logic. Use real Underworlds names where known, or leave plots as an empty array.

Examples:
- "Blazing Assault / Countdown to Cataclysm" + plot "Countdown to Cataclysm"
- "Blazing Assault / Emberstone Sentinels" + plot "Sigmar Watches Over Us"

# SCHEMA

The top-level object:

{
  "id": "kebab-case-unique-id",
  "title": "Demo - short human title",
  "description": "1-2 sentences setting the scene.",
  "round": 1 | 2 | 3,
  "board": "<one of the board ids above>",
  "warbands": { "me": "<warband id>", "opp": "<warband id>" },
  "decks": {
    "me":  { "pair": "<deck pair name>", "plots": ["<plot 1>", "<plot 2>"] },
    "opp": { "pair": "<deck pair name>", "plots": [] }
  },
  "steps": [ <one or more step objects> ]
}

Each step:

{
  "notation": "(short tag for the activity log, e.g. '(R2 — Yurik to attack)')",
  "title": "Step title shown above the explanation",
  "explanation": "Longer prose explaining what's happening.",
  "poll": {
    "question": "What's your move?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": <0-indexed integer of the best option>
  },
  "state": { <state object — see below — required for the FIRST step> }
}

Subsequent steps can use "diff" instead of "state" to specify only what changed since the previous step. For a single-step puzzle (most common), use "state" only.

State object — all fields optional; omit what doesn't apply:

{
  "positions": { "<fighter-id>": "<hex>" },  // alive fighters' hexes
  "wounds":    { "<fighter-id>": <int>    },  // wounds TAKEN (not remaining)
  "slain":     ["<fighter-id>", ...],         // fighters off the board
  "inspired":  ["<fighter-id>", ...],
  "glory":     [<me glory>, <opp glory>],
  "tokens":    { "<fighter-id>": ["move"|"charge"|"guard"|"stagger", ...] },
  "upgrades":  { "<fighter-id>": ["<upgrade card name>", ...] },
  "abilitiesUsed": {
    "me":  ["<warscroll ability name>", ...],
    "opp": ["<warscroll ability name>", ...]
  },
  "activationsUsed": { "me": <0-4>, "opp": <0-4> },
  "features": [
    { "type": "treasure", "label": "1"|"2"|"3"|"4"|"5", "hex": "<hex>" },
    { "type": "aqua",                                    "hex": "<hex>" }
    // "delved": true on a treasure shows a red outline on the token
  ],
  "hand": {
    "me":  { "objectives": <int>, "power": <int> },  // cards in hand
    "opp": { "objectives": <int>, "power": <int> }
  }
}

# STANDARD TOKEN PLACEMENT

If the puzzle doesn't specify where tokens are, use these defaults for a stadard 5-treasure + 2-aqua setup:

  Treasures:  -d2 (1), -h2 (2), c1 (3), i1 (4), h3 (5)
  Aqua Ghyranis: -f3, f3

For non-standard setups, place tokens wherever the source describes.

# COMMON PITFALLS TO AVOID

- Do not include fighter base stats (move, wounds, save, attacks, name, etc.) — these come from the warband automatically. The `fighters` field is reserved for rare per-fighter overrides.
- Do not include the warband's warscroll abilities in the schema — they're loaded from the warband. The state's `abilitiesUsed` array does belong though; it tracks which abilities have been spent this round.
- Don't write "a0" — column a is even and has no 0 hex.
- Don't place fighters on excluded hexes (corners).
- Wounds is wounds TAKEN, e.g. a fighter with 3 max wounds and 1 wound taken has 2 left.
- Glory is [me, opp] — get the order right.
- Fighter IDs are single letters or 2-char codes (W, A, o1) — never the full name.
- "me" is the side asking the question (the protagonist of the puzzle); "opp" is the other side.
- Inspired fighters go in the inspired array; the wounds threshold is warband-specific (don't add fighters to inspired just because they're hurt).

# WORKED EXAMPLE

Input:
"Round 3 finale. My Wielder (Headsmen's Curse, leader, inspired, one wound left) is at the centre of the board. Ardorn (Emberwatch leader, inspired, two wounds left) sits one hex toward the opp side. All other fighters on both sides are slain. Glory is tied 15-15. Opponent has used all 4 activations; I have one left. Standard 5 treasures + 2 aqua. Best play: grab the aqua token instead of going for the leader kill."

Output:
{
  "id": "wielder-vs-ardorn-finale",
  "title": "Demo - Wielder vs. Ardorn",
  "description": "Round 3 of a Headsmen's Curse vs. Emberwatch match. Each side is down to one fighter, both inspired. Glory is tied. Opponent has burned all 4 activations; you have one left. What's the play?",
  "round": 3,
  "board": "embergard-1",
  "warbands": { "me": "headsmens-curse", "opp": "emberwatch" },
  "decks": {
    "me":  { "pair": "Blazing Assault / Countdown to Cataclysm", "plots": ["Countdown to Cataclysm"] },
    "opp": { "pair": "Blazing Assault / Emberstone Sentinels",   "plots": [] }
  },
  "steps": [
    {
      "notation": "(R3 — last activation, glory 15-15)",
      "title": "Last stand — your final activation",
      "explanation": "Wielder is the last fighter standing on your side, inspired with one wound left. Ardorn stands adjacent, inspired, with two wounds left. Both sides have burned every activation; only your last one remains.",
      "poll": {
        "question": "What's your move?",
        "options": [
          "Move to the aqua ghyranis token",
          "Attack Ardorn for the kill",
          "Guard — accept the 15-15 tie",
          "Move to treasure token 4 on i1"
        ],
        "correct": 0
      },
      "state": {
        "positions": { "W": "f0", "A": "f1" },
        "wounds":    { "W": 1, "A": 2 },
        "slain":     ["B", "S", "H", "F", "Y"],
        "inspired":  ["W", "A"],
        "glory":     [15, 15],
        "activationsUsed": { "me": 3, "opp": 4 },
        "features": [
          { "type": "treasure", "label": "1", "hex": "-d2" },
          { "type": "treasure", "label": "2", "hex": "-h2" },
          { "type": "treasure", "label": "3", "hex": "c1"  },
          { "type": "treasure", "label": "4", "hex": "i1"  },
          { "type": "treasure", "label": "5", "hex": "h3"  },
          { "type": "aqua", "hex": "-f3" },
          { "type": "aqua", "hex": "f3"  }
        ],
        "hand": {
          "me":  { "objectives": 3, "power": 0 },
          "opp": { "objectives": 3, "power": 0 }
        }
      }
    }
  ]
}

# READING FROM A PHOTO

When the user attaches a photo of a board state instead of typing a description:

1. Identify the board by looking at unique markings (stagger hex positions, waystones). Pick the matching id from the AVAILABLE BOARDS list.
2. Identify each fighter on the board by their colour/sculpt and assign them their warband fighter-id.
3. For each fighter, read off its hex coordinate using the file (column) and signed rank (distance from midline, negative below, positive above).
4. Look for wound counters (dice or markers near a fighter showing damage taken).
5. Identify treasure and aqua tokens, noting their hex positions.
6. If glory/activation state is shown on the tracker, read those too. If not, leave them at defaults (0-0 for early-round, set sensibly otherwise).
7. Ask the user clarifying questions if anything is ambiguous (e.g. "is this fighter inspired?" if there's no obvious marker).

# FINAL CHECK BEFORE EMITTING

Before you output the JSON:
- Every hex string is in centered notation (signed, files a–k, ranks -4 to +4).
- No hex references a non-existent corner (cross-check against the excluded list).
- Glory is a 2-element array, not an object.
- Wounds is wounds taken, not remaining.
- The "correct" poll index is within bounds of options.
- The JSON parses (mentally — balanced braces, no trailing commas).

Now wait for the user's puzzle description (or photo).
=== END AI PROMPT ===
```

---

## Tips for getting good results

**Be specific about who's where.** "Wielder at f0" is clearer than "Wielder in the middle". If you're describing rather than uploading a photo, use the file+rank notation — the AI handles it more reliably than relative descriptions.

**Mention which warband is yours.** The AI needs to know whether to use `"me": "headsmens-curse"` or `"me": "emberwatch"`. "I was playing Headsmen's Curse against Emberwatch" is enough.

**Round and activations matter.** "Round 2, I've used 1 activation, opp 2" lets the AI fill in `activationsUsed` correctly.

**Tell it what the correct answer is.** The AI doesn't know the right play unless you tell it. End your description with something like "Best move: grab the aqua token because it secures a tiebreaker win without risk."

**Iterate.** First pass is usually 90% right. If a hex is wrong or a fighter is missing, just say "Yurik is at f1, not e2 — fix that" and the AI will re-emit.

---

## Schema reference (cheatsheet)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique per game, kebab-case |
| `title` | string | Shown above the board |
| `description` | string | 1-2 sentences scene-setter |
| `round` | 1, 2, or 3 | The game round |
| `board` | string | `embergard-1` etc. |
| `warbands` | `{me, opp}` | Both are warband IDs |
| `decks` | `{me, opp}` | Each has `pair` and `plots` |
| `steps` | array | One step per state shown |

Per step:

| Field | Type | Notes |
|---|---|---|
| `notation` | string | Tag for the log line |
| `title` | string | Bold heading above explanation |
| `explanation` | string | Prose describing the situation |
| `poll` | object | `{question, options, correct}` |
| `state` | object | First step only; later steps can use `diff` |
| `diff` | object | Subset of state — only changed fields |

State fields summarised:

| Field | Type | Notes |
|---|---|---|
| `positions` | `{fid: hex}` | Where alive fighters are |
| `wounds` | `{fid: int}` | Wounds **taken** |
| `slain` | `[fid, ...]` | Off the board |
| `inspired` | `[fid, ...]` | Flipped to inspired side |
| `glory` | `[int, int]` | `[me, opp]` |
| `tokens` | `{fid: [name, ...]}` | move / charge / guard / stagger |
| `upgrades` | `{fid: [card-name, ...]}` | Upgrade cards on fighter |
| `abilitiesUsed` | `{me: [...], opp: [...]}` | Warscroll abilities marked used |
| `activationsUsed` | `{me: 0-4, opp: 0-4}` | Activations spent this round |
| `features` | `[{type, label?, hex, delved?}]` | Treasure / aqua tokens |
| `hand` | `{me, opp}` each `{objectives, power}` | Card counts |

---

## Coordinate cheatsheet

```
rank 4   .  .  .  d4 .  f4 .  h4 .  .  .       opp back row
rank 3   .  b3 c3 d3 e3 f3 g3 h3 i3 j3 .       opp deployment
rank 2   a3 b2 c2 d2 e2 f2 g2 h2 i2 j2 k3
rank 1   a2 b1 c1 d1 e1 f1 g1 h1 i1 j1 k2
rank 0   a1 b0 c1 d0 e1 f0 g1 h0 i1 j0 k1      midline (zero only on odd cols)
rank -1  -a1 -b1 -c1 -d1 -e1 -f1 -g1 -h1 -i1 -j1 -k1
rank -2  -a2 -b2 -c2 -d2 -e2 -f2 -g2 -h2 -i2 -j2 -k2
rank -3  -a3 -b3 -c3 -d3 -e3 -f3 -g3 -h3 -i3 -j3 -k3      your deployment
rank -4   .   .  -c4 -d4 -e4 -f4 -g4 -h4 -i4  .   .       your back row
```

Note: rank 0 (midline) has 5 hexes (b0, d0, f0, h0, j0) — only odd columns. Rank labels apply to odd-column hexes; even-column hexes sit halfway between consecutive labels.

---

## Available warbands (full reference)

### Headsmen's Curse
- **W** — Wielder of Doom (leader). 5 wounds, Move 4, Block 2.
- **B** — Bearer of Punishment. 4 wounds, Move 3, Dodge 2.
- **S** — Scriptor of Suffering. 3 wounds, Move 4, Dodge 1.
- **H** — Sharpener of Sins. 3 wounds, Move 4, Dodge 2.

### Ardorn's Emberwatch
- **A** — Ardorn (leader). 5 wounds, Move 3, Block 1.
- **F** — Farasa. 5 wounds, Move 3, Block 1.
- **Y** — Yurik Velzaine. 5 wounds, Move 3, Block 1. Two attack profiles (axe range 1 + crossbow range 4).

### Generic 4-fighter (placeholder)
- **o1** (leader), **o2**, **o3**, **o4**. Stats are configurable; the default profile is treated as opaque for puzzle purposes.

---

## Where to put your hex coordinates

The `hex` string format is exactly what the board displays. If the board shows `b0` in a hex, you write `"b0"`. If it shows `-f3`, you write `"-f3"`. The dash is a literal minus sign character; the file letter follows immediately, no space.

Invalid examples that will fail:
- `"f-3"` — wrong place for the dash. Use `"-f3"`.
- `"a0"` — column a has no 0 hex. Use `"a1"` (just above midline) or `"-a1"` (just below).
- `"f+1"` — no plus prefix on positives. Use `"f1"`.
- `"f10"` — ranks go 0 to ±4 only. Max is `"f4"` or `"-f4"`.
