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
puzzle can both attract thumbs-down, so read it alongside the difficulty tier.

The `voterId` is the same random save code used for progress — not an account,
just enough to dedupe. No personal data is stored.

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
