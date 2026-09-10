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
│   └── games.js            GAMES — built-in replayable games
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

The left panel has a **Challenge run**: puzzles are served **easiest-first by
their measured Elo rating**, with a random wobble so the order varies between
runs. Solve each puzzle's decision on the first try to score 1 point; a wrong
answer ends the run. Each puzzle appears once per run.

- **Score** = 1 point per puzzle solved on the first try.
- **Leaderboards** are global, with **This week** (resets Mondays 06:00) and
  **Today** (resets 06:00) views.
- **Puzzle ratings** — puzzles carry an Elo rating, players don't. Solving a
  puzzle lowers its rating, failing raises it, so each converges on its real
  difficulty. Every puzzle starts at 1000. There is no authored difficulty
  field; difficulty is measured, not declared.

The backend (leaderboards, ratings, progress, feedback) is a Cloudflare
Worker in `worker/` backed by Workers KV — see `SETUP-BACKEND.md`.

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
