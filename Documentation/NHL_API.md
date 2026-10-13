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

This site uses it in two places on `waxReviews.html`, always through
a Lambda, never directly from the browser (see "Behaviour that
applies to every endpoint" for why):

- the scores ticker — `/v1/score/{date}`, via `getNhlScores`
- the game modal opened from a ticker chip — the Game Center
  endpoints, standings, and NHL.com's separate content API and video
  player (see "Game modal sources" below), via `getNhlGameDetails`

See `LAMBDA_FUNCTIONS.md`, `API_ENDPOINTS.md` ("Get NHL scores", "Get
NHL game details") and `FRONTEND.md` ("NHL scores ticker", "NHL game
modal").

## Behaviour that applies to every endpoint

| Behaviour | Detail | What it means for this site |
|---|---|---|
| **No CORS** | No endpoint sends `Access-Control-Allow-Origin`, including on an `OPTIONS` preflight (checked across ~35 endpoints). | A browser `fetch()` from junkwaxhockey.com is blocked. Every use has to go through a Lambda proxy. |
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
| **Game Center** | `/v1/gamecenter/{gameId}/landing`, `…/boxscore`, `…/right-rail`, `…/play-by-play`, `/v1/wsc/game-story/{gameId}` | Everything about one game: scoring summary, shootout, three stars, penalties, line score, team stats, per-player stats, every event, officials. | **Used by this site** (`getNhlGameDetails`: landing, right-rail, boxscore). Play-by-play ~146 KB. `game-story` has no article text, despite its name. |
| **Standings** | `/v1/standings/now`, `/v1/standings/{date}`, `/v1/standings-season` | League table for any date, including historical; which seasons each standings format covers. | ~58 KB. **Used by this site** for team records — `{date}` already counts that day's games. |
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

## Game modal sources

What the game modal (`getNhlGameDetails`) reads, all checked against
DET @ MTL on 2026-10-10 (game `2026020075`, a 1-0 shootout):

| Need | Source | Notes |
|---|---|---|
| Header, scoring by period, shootout attempts, three stars | `/v1/gamecenter/{id}/landing` → `summary.scoring`, `summary.shootout.events`, `summary.threeStars` | Each goal has `timeInPeriod`, `name`, `goalsToDate`, `assists[]` (with `assistsToDate`), `strength` (`ev`/`pp`/`sh`), `goalModifier` (`empty-net`), the score after it, and a `highlightClip` video ID (unused so far). Shootout `result` is `goal` or `save`. Team logos here are `_light`; a `darkLogo` field also exists. |
| Line score and team stats | `/v1/gamecenter/{id}/right-rail` → `linescore.byPeriod`/`totals`, `teamGameStats` | Stat categories: `sog`, `faceoffWinningPctg` (0-1), `faceoffWins`, `powerPlay` ("0/4"), `powerPlayPctg`, `pim`, `hits`, `blockedShots`, `giveaways`, `takeaways`. Also `gameVideo` IDs, officials, scratches. |
| Winning and losing goalie | `/v1/gamecenter/{id}/boxscore` → `playerByGameStats.{awayTeam,homeTeam}.goalies[].decision` | `W`, `L`, or **`O` for an OT/shootout loss** — a "loser" lookup must accept both `L` and `O`. Only used for this; the rest of the boxscore is per-player stats. |
| Team records (W-L-OTL) | `/v1/standings/{gameDate}` → `wins`, `losses`, `otLosses` per `teamAbbrev` | Not in any Game Center response. The game date's standings already include that day's games, so a final shows the record *after* it. |
| Recap headline, summary, photo | NHL.com content API: `https://forge-dapi.d3.nhle.com/v2/content/en-us/stories?tags.slug=gameid-{id}&context.slug=nhl` | **Sends `Access-Control-Allow-Origin: *`**, unlike `api-web`. Several stories per game (recap, preview, video reviews) — the recap is the one tagged `game-recap`. `…/stories/{slug}` has the full article as markdown with embedded `<forge-entity>` tags; this site deliberately shows only the headline and summary and links to `https://www.nhl.com/news/{slug}`. |
| Highlights video | Same content API: `…/videos?tags.slug=gameid-{id}&context.slug=nhl` | Several videos per game; the recap has a slug ending `-recap-{id}`. `fields.brightcoveId`, `fields.brightcoveAccountId` (`6415718365001`), `fields.duration` ("00:05:06"). Not in the list right after the game ends. |
| Video player | `https://players.brightcove.net/6415718365001/EXtG1xJ7H_default/index.html?videoId={id}` | The NHL's "Gamecenter Player". No `X-Frame-Options`, so it embeds and plays from junkwaxhockey.com. Plays an NHL pre-roll ad first. `default_default` (Brightcove's generic player) also exists on the account. |
| Images | `media.d3.nhle.com/image/private/{formatInstructions}/…` (the `thumbnail.templateUrl` on stories and videos) | Replace `{formatInstructions}` with e.g. `t_ratio16_9-size40` (~200 KB), `-size30`, `-size50`. |
| NHL.com game page | `https://www.nhl.com/gamecenter/{away}-vs-{home}/{yyyy}/{mm}/{dd}/{id}` | Same pattern as the scores feed's `gameCenterLink`. |

## Off days and season start

- **Don't use `/score/now` for "today".** Its `currentDate` rolls over late: at 10:21 a.m. ET on Monday Oct 12, 2026 it still said 2026-10-11 and redirected to Sunday's scores. This site computes today's date in Eastern time and asks for `/v1/score/{date}`, which returns that day's games with the right `prevDate`/`nextDate`.

- **`prevDate` / `nextDate`** on the scores feed are the previous and next **game** days, not calendar days. Through the 2025 Christmas break, Dec 24, 25 and 26 all had `prevDate` Dec 23 and `nextDate` Dec 27. `/v1/score/{nextDate}` returns that day's games in the usual shape.
- **`/v1/schedule/{date}`** carries the season's `preSeasonStartDate`, `regularSeasonStartDate`, `regularSeasonEndDate` and `playoffEndDate`. `regularSeasonStartDate` is a real game day (Sep 29, 2026: five regular-season games, `gameType` 2).
- **Summer:** in July–September 2027, as of October 2026, `nextDate` is null and `/v1/schedule/{date}` still reports the 2026-27 dates, because the 2027-28 schedule isn't in the API yet. How these fields change once it's published hasn't been observed.

## Re-checking it

```
curl -sL https://api-web.nhle.com/v1/score/now | python3 -m json.tool | head -60
curl -sI -H "Origin: https://www.junkwaxhockey.com" https://api-web.nhle.com/v1/scoreboard/now
```

The second shows the response headers — if an
`access-control-allow-origin` line ever appears, the API has started
allowing browser calls.
