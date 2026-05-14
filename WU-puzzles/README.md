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
│   └── games.js            GAMES — built-in replayable games
└── js/
    ├── main.js             Entry point: state, applyStep, controls, event wiring
    ├── state.js            resolveWarbands, expandSteps, diff merging
    ├── board.js            Hex math, board SVG, legend, feature tokens
    ├── warband-panel.js    Fighter cards, hands, dice, abilities, activations, decks
    ├── poll.js             Per-step opinion polls (localStorage)
    └── custom-games.js     User-pasted games: load / save / validate / download
```

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
