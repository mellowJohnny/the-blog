# NHL API (api-web.nhle.com) — research reference

> **As of October 2026.** This API is free but **undocumented** — the
> NHL publishes no reference, no versioning promise and no change
> notice. Everything below was found by probing the live API directly
> (2026-10-11) and may go stale without warning. It is kept anyway so
> that a future feature can start from what's already known rather
> than repeating the research — but re-check an endpoint with `curl`
> before building on it.

## What it is

`https://api-web.nhle.com/v1/...` is the JSON API behind nhl.com's own
scores, schedule, stats and game pages. No API key, no sign-up, no
rate limit has been observed. It sits behind Cloudflare.

This site uses exactly one endpoint from it, `/v1/score/{date}`, for
the scores ticker on `waxReviews.html` — via the `getNhlScores`
Lambda, never directly from the browser (see "Behaviour that applies
to every endpoint" for why). See `LAMBDA_FUNCTIONS.md`,
`API_ENDPOINTS.md` ("Get NHL scores") and `FRONTEND.md` ("NHL scores
ticker").

## Behaviour that applies to every endpoint

| Behaviour | Detail | What it means for this site |
|---|---|---|
| **No CORS** | No endpoint sends `Access-Control-Allow-Origin`, including on an `OPTIONS` preflight (checked across ~35 endpoints). | A browser `fetch()` from mellowjohnny.cc is blocked. Every use has to go through a Lambda proxy. |
| **`/now` redirects** | Most `/now` and `/current` URLs answer `307` to a dated or season-specific URL — `/v1/score/now` → `/v1/score/2026-10-11`, `/v1/roster/TOR/current` → `/v1/roster/TOR/20262027`. | Node's `fetch` follows these automatically; `curl` needs `-L`. |
| **Short CDN cache** | `Cache-Control: max-age` of 0–14s depending on the endpoint (12s on scores). | Cache in our own layer (the Lambda's response header) rather than relying on theirs. |
| **Season IDs** | Eight digits, start and end year: `20262027`. | `/v1/season` lists every valid one. |
| **Game type** | `2` = regular season, `3` = playoffs (seen in URLs like `/club-stats/TOR/20262027/2`). `1` = preseason per community reverse-engineering, not observed. | |
| **Game IDs** | Ten digits: season start year + game type + game number — `2026020084` is 2026-27, regular season, game 84. | Stable key for a game across endpoints. |
| **Dates and times** | Dates are `YYYY-MM-DD` (the North American game day). Start times are UTC with a `Z` suffix (`2026-10-11T21:00:00Z`). | Convert to the visitor's time zone in the browser. |
| **Team logos** | SVGs on `assets.nhle.com/logos/nhl/svg/`. The API returns `_light` variants (for light backgrounds); every team also has a `_dark` twin at the same path (all 32 checked). | Plain `<img>` loads need no CORS, so logos can be hot-linked directly. |

## Major areas of functionality

| Area | Representative endpoints | What it gives you | Notes / size |
|---|---|---|---|
| **Scores** | `/v1/score/now`, `/v1/score/{YYYY-MM-DD}` | One day's games: state, both teams (abbreviation, name, logo, score, shots), period, clock, how it ended (regulation/OT/SO), goals, recap video links, plus `prevDate`/`nextDate`. | ~13 KB. **Used by this site** (`getNhlScores`). Past dates work — e.g. `2026-03-07` has OT and SO finals. |
| **Scoreboard** | `/v1/scoreboard/now` | About ±5 days of games grouped by date. | ~130 KB — too heavy to poll. |
| **Schedule** | `/v1/schedule/now`, `/v1/schedule/{date}`, `/v1/schedule-calendar/{date}`, `/v1/club-schedule-season/{TEAM}/{season}` | League week, which days have games, a team's full season. | Team season ~190 KB. |
| **Game Center** | `/v1/gamecenter/{gameId}/landing`, `…/boxscore`, `…/play-by-play`, `/v1/wsc/game-story/{gameId}` | Everything about one game: scoring summary, box score, every event, recap story. | Play-by-play ~146 KB. |
| **Standings** | `/v1/standings/now`, `/v1/standings/{date}`, `/v1/standings-season` | League table for any date, including historical; which seasons each standings format covers. | ~58 KB. |
| **Teams and rosters** | `/v1/roster/{TEAM}/current`, `/v1/club-stats/{TEAM}/now`, `/v1/club-stats-season/{TEAM}` | Current roster, team season stats, seasons a team has stats for. | Teams by three-letter code (`TOR`). |
| **Players** | `/v1/player/{playerId}/landing`, `/v1/player-spotlight` | Bio and career stats; a featured-players list. | NHL player IDs don't map to this site's `Checklists` player names. |
| **Stat leaders** | `/v1/skater-stats-leaders/current`, `/v1/goalie-stats-leaders/current` | League leaders by category. | |
| **Playoffs** | `/v1/playoff-bracket/{year}` | Bracket and series status. | Only meaningful April–June. |
| **Draft** | `/v1/draft/rankings/now` | Prospect rankings. | ~77 KB. `/v1/draft/picks/now/all` returned 404. |
| **Broadcast** | `/v1/network/tv-schedule/{date}`, `/v1/partner-game/{country}/now` | TV listings, by country. | Each game in the scores feed also carries `tvBroadcasts`. |
| **Meta and utility** | `/v1/season`, `/v1/meta?players=…`, `/v1/meta/game/{gameId}`, `/v1/location` | Season IDs, ID lookups, the caller's country code. | `/v1/where-to-watch` returned 404. |

## Game states (the scores feed)

`gameState` on each game:

| State | Meaning | Observed? |
|---|---|---|
| `FUT` | Scheduled, not started | Yes |
| `PRE` | Pre-game / warm-up | Reported by community docs |
| `LIVE` | In progress | Reported |
| `CRIT` | In progress, late and close | Reported |
| `FINAL` | Just finished | Reported |
| `OFF` | Final, settled | Yes |

While live, `periodDescriptor` gives `number` and `periodType` (`REG`,
`OT`, `SO` — playoff overtime keeps counting periods, so period 5 is
2OT), and `clock` gives `timeRemaining` (`"12:34"`) and
`inIntermission`. When final, `gameOutcome.lastPeriodType` says how
it ended.

## Re-checking it

```
curl -sL https://api-web.nhle.com/v1/score/now | python3 -m json.tool | head -60
curl -sI -H "Origin: https://www.mellowjohnny.cc" https://api-web.nhle.com/v1/scoreboard/now
```

The second shows the response headers — if an
`access-control-allow-origin` line ever appears, the API has started
allowing browser calls.
