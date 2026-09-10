# Warhammer Underworlds Puzzles

A static, single-page replay tool for Warhammer Underworlds games. Built with
vanilla HTML / CSS / ES modules — no build step, no dependencies. Drop it on
any static host (GitHub Pages, Netlify, Cloudflare Pages).

## Project structure

```
.
├── index.html              Page markup only
├── css/
│   └── styles.css          All styles (light + dark)
├── data/
│   ├── boards.js           BOARD_SHAPE + BOARDS — built-in board definitions
│   ├── warbands.js         WARBANDS — shared warband definitions (fighters + abilities)
│   ├── cards.js            CARDS — universal Rivals card catalogue + lookups
│   └── games.js            GAMES — built-in replayable games (with difficulty)
└── js/
    ├── main.js             Entry point: state, applyStep, controls, event wiring
    ├── state.js            resolveWarbands, expandSteps, diff merging
    ├── board.js            Hex math, board SVG, legend, feature tokens
    ├── warband-panel.js    Fighter cards, hands, dice, abilities, activations, decks
    ├── poll.js             Per-step opinion polls (localStorage)
    ├── challenge.js        Challenge mode — endless ramping run + scoring
    ├── leaderboard.js      Personal best (local) + optional global board
    └── custom-games.js     User-pasted games: load / save / validate / download
```

## Challenge mode

The left panel has a **Challenge run**: an endless mode that serves puzzles
easiest-first by their `difficulty` (1–5). Solve each puzzle's decision on the
first try to score points and grow your streak; a wrong answer ends the run.
When you clear the hardest puzzle the run loops back at a higher "ramp", so the
same puzzles are worth progressively more.

- **Score** = `100 × difficulty × streakMultiplier × rampMultiplier`.
- **Personal best** is always kept locally (`localStorage`), no network needed.
- **Global board** is optional. Because this is a static site with no backend,
  it talks to a small hosted key-value endpoint. To enable it, open
  `js/leaderboard.js` and set `REMOTE.url` — e.g. create a free bin at
  [jsonblob.com](https://jsonblob.com) (initialise it to `[]`) and paste its
  API URL. Leave `REMOTE.url` empty to ship with local-only scores. The UI
  degrades gracefully when the board is unset or unreachable.

Set a puzzle's tier with a `difficulty: 1..5` field in `data/games.js`
(untagged puzzles default to 3).

## Adding content

- **A new board** → add an entry to `data/boards.js`.
- **A new warband** → add an entry to `data/warbands.js`.
- **A new game** → append an entry to `data/games.js`, or paste JSON into the
  "Load your own game" panel at runtime (saved in `localStorage`).

Each module has a header comment describing its shape.

## Running locally

ES modules require an HTTP server (they don't work from `file://` because of
CORS). From the project root:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/
```

Or push to GitHub Pages, which serves over HTTPS automatically.
