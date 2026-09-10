# Deploying WU-puzzles to Cloudflare

One Cloudflare Worker serves **both** the static site and the API that saves
highscores and progress. That means one project, one deploy, and no CORS
setup — the site calls `/api/...` on its own origin.

```
wu-puzzles.<you>.workers.dev
├── /                     → index.html, css/, js/, data/   (static site)
├── /api/scores           → global leaderboard   (GET / POST)
└── /api/progress/:code   → saved progress       (GET / POST)
                                  ↕
                           Workers KV ("SCORES")
```

## 1. KV namespace — already done ✅

The `SCORES` namespace exists and its id is already filled into
`wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SCORES"
id = "e2aa2729d6fb4012b127cf09e4aea244"
```

Nothing to do here. (For reference, the CLI equivalent is
`npx wrangler kv namespace create SCORES`, but the dashboard route under
**Storage & databases → KV** works just as well and needs no Node install.)

## 2. Commit and push

```bash
git add wrangler.toml .assetsignore worker/ js/progress.js js/leaderboard.js js/main.js SETUP-BACKEND.md
git commit -m "Add Cloudflare Worker backend for scores and progress"
git push
```

## 3. Deploy

In the Cloudflare dashboard: **Compute → Workers & Pages → Create
application**, connect the `BullerBaby/WU-puzzles` repo, and use:

| Field | Value |
|---|---|
| Project name | `wu-puzzles` |
| Build command | *(leave empty)* |
| Deploy command | `npx wrangler deploy` |

Deploy. Your site is then live at `wu-puzzles.<you>.workers.dev`.

> The deploy command only works **after** the repo contains `wrangler.toml`. Without `wrangler.toml`
> in the repo, `wrangler deploy` has nothing to deploy and will fail.

Alternatively, deploy straight from your machine with `npx wrangler deploy`.

## 4. Check it works

```bash
# should return {"ok":true,"entries":[]}
curl https://wu-puzzles.<you>.workers.dev/api/scores
```

Then finish a Challenge run in the browser and reload — your score should
appear on the Global tab.

## Custom domain (optional)

Buy a domain (Cloudflare Registrar sells at cost), then in the Worker's
settings add it under **Domains & Routes**. DNS is automatic if the domain is
in the same account. Nothing in the code needs to change, because the API is
same-origin.

## Puzzle feedback

After answering a puzzle, players get a 👍 / 👎 row. Votes are stored in KV
for later analysis:

| Key | Contents |
|---|---|
| `board:week:<YYYY-MM-DD>` | weekly leaderboard (week starting that Monday 06:00) |
| `board:day:<YYYY-MM-DD>` | daily leaderboard (06:00 to 06:00) |
| `elo:puzzle:<puzzleId>` | `{ rating, attempts, solves }` |
| `elo:player:<saveCode>` | `{ rating, attempts, solves }` |
| `elorated:<puzzleId>:<saveCode>` | marker so a pairing only rates once |
| `feedback:<puzzleId>` | `{ up, down, updated }` — running totals |
| `vote:<puzzleId>:<voterId>` | `{ vote, ts }` — one row per voter |

Storing individual votes means a player can change their mind without
double-counting, and you keep the raw data (with timestamps) for later.

To pull all the feedback at once for analysis:

```bash
curl https://wu-puzzles.<you>.workers.dev/api/feedback
```

```json
{ "ok": true, "feedback": [
  { "puzzleId": "yurik-attack-choice", "up": 12, "down": 2, "updated": 1789... }
] }
```

Sorted by total votes, so your most-played puzzles come first. A puzzle with a
high 👎 ratio is worth revisiting — though note a *hard* puzzle and a *bad*
puzzle can both attract thumbs-down, so read it alongside the puzzle's rating.

The `voterId` is the same random save code used for progress — not an account,
just enough to dedupe. No personal data is stored.

## Leaderboard periods

The board has two views, both global: **This week** and **Today**.

Rather than wiping data on a schedule, scores are written into time-boxed
buckets, so boards "reset" on their own and past periods stay in KV for
analysis:

- **Weekly** resets **Mondays at 06:00**
- **Daily** resets at **06:00** each day

Both boundaries use `Europe/Copenhagen` local time (handled with `Intl`, so
CET/CEST daylight saving is automatic — it's genuinely 06:00 year-round).
A run counts towards both the week and the day it was played in, and
late-night play before 06:00 still counts towards the previous day.

To change the timezone or reset hour, edit `BOARD_TZ` / `RESET_HOUR` at the
top of `worker/index.js`.

Read a specific board:

```bash
curl 'https://wu-puzzles.<you>.workers.dev/api/scores?period=week'
curl 'https://wu-puzzles.<you>.workers.dev/api/scores?period=day'
```

## Puzzle Elo ratings

**Puzzles carry a rating; players don't.** Each attempt is scored against a
fixed nominal player (1200), so:

- a player **solves** it → the puzzle "lost" → its rating **falls**
- a player **fails** it → the puzzle "won" → its rating **rises**

A puzzle therefore converges on the rating matching how often people actually
fail it: failed ~50% of the time settles near 1000, failed more often settles
higher. **Every puzzle starts at 1000** and moves from there purely on
results — there is no authored difficulty field.

Rating changes are large while a puzzle is provisional and taper as evidence
accumulates (`K = 40/sqrt(attempts)`, floor 8). **Only a player's first
attempt at a given puzzle counts**, so replaying a small set can't skew the
numbers.

### Used for run ordering

Challenge runs serve puzzles **easiest-first by rating**, with a random
wobble of ±120 rating points so the order isn't identical every time.
Puzzles rated close together shuffle freely; a much harder puzzle won't leap
to the front. If the API is unreachable every puzzle is treated as unrated
(1000), so the order is effectively random.

Tune the wobble via `ORDER_JITTER` in `js/challenge.js`.

### Reading the data

```bash
curl https://wu-puzzles.<you>.workers.dev/api/elo
```

Returns every puzzle easiest-first with `rating`, `attempts`, and
`solveRate` — the empirical difficulty of each puzzle, which is what drives
run ordering.

## The `.assetsignore` file

`.assetsignore` keeps `worker/`, `wrangler.toml` and the `.md` docs out of the
published site. Cloudflare requires that exact filename — it can't be renamed.

GitHub's **drag-and-drop uploader silently skips dotfiles**, so if you upload
a zip this file won't make it. Add it once via **Add file → Create new file**
in the GitHub web UI (the editor accepts leading-dot names), with:

```
worker/
wrangler.toml
*.md
.git/
```

It only needs doing once — later uploads won't remove it.

Leaving it out isn't dangerous: Cloudflare already excludes `wrangler.toml`
and the Worker entry point automatically, so the only effect is that your
`.md` files become readable at e.g. `/README.md`.

## Notes

**Free tier** covers 100,000 requests/day — far more than this needs.

**Save codes.** Progress is stored per random code that the browser generates
and keeps in localStorage. It works with no account; players can copy the code
to another device to sync. The code is the identity, so there's no password to
reset and no personal data stored. `js/progress.js` exposes `getSaveCode()`,
`useSaveCode(code)` and `syncNow()` — the UI for showing/entering a code isn't
built yet, so right now progress saves locally and syncs only if you call
those from the console or wire up a button.

**Validation.** The Worker rejects malformed submissions, clamps names to 20
characters, strips control characters, caps the board at 100 entries, and only
accepts save codes matching `[A-Za-z0-9-]{8,64}`. Scores above 1000 are
refused. Tighten the score ceiling in `worker/index.js` (`handleScores`) to
your real puzzle count if you want stricter anti-cheat.

**Hosting the site elsewhere?** Set `API_BASE` in both `js/leaderboard.js` and
`js/progress.js` to the Worker's absolute URL, and change `ALLOW_ORIGIN` in
`worker/index.js` from `'*'` to your site's origin.
