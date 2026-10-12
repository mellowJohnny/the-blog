# PWHL data (HockeyTech feed) — research reference

> **As of October 2026.** The PWHL publishes no API. Its site and apps
> are fed by **HockeyTech** (also branded LeagueStat), a commercial
> stats provider with no public documentation or terms for outside use.
> Everything below was found by probing the feed directly (2026-10-11)
> and from an unofficial community reference (see the end). It may go
> stale without warning — re-check before building on it, and keep
> calls few (see "Rate limiting").

## What this site uses

One view, the **score bar**, through the `getPwhlScores` Lambda, for
the PWHL section of the scores ticker on `waxReviews.html` — plus the
seasons list and a further look ahead in the score bar, only to find
the "Season starts" date. See `LAMBDA_FUNCTIONS.md`,
`API_ENDPOINTS.md` ("Get PWHL scores") and `FRONTEND.md` ("NHL scores
ticker").

## Access

| | Detail |
|---|---|
| **Endpoint** | `https://lscluster.hockeytech.com/feed/index.php?feed=…&view=…&key=…&client_code=pwhl&fmt=json&lang=en` |
| **Key** | `446521baf8c38984` with `client_code=pwhl` — the PWHL site's own key, served in thepwhl.com's page source on every visit (`var appKey = …`). Unchanged since at least April 2025 (it's the key the community reference documents). Not issued to us: if HockeyTech rotates it, take the new one from thepwhl.com's source. |
| **`Origin` header** | **Any request carrying an `Origin` header gets an empty `200`** — even with thepwhl.com's own origin. Browsers always send `Origin` on cross-site calls, so this feed can never be called from a page on this site; a Lambda proxy is required. This isn't standard CORS: there's no browser error, just an empty "success". |
| **User-Agent** | Requests without a browser-style `User-Agent` also get an empty body (curl's and Node `fetch`'s defaults are both rejected), so the Lambda sends one. |
| **Rate limiting** | About 30 rapid probe calls got this machine temporarily blocked — empty responses, then failed connections — for a minute or two. Hence one score-bar call per Lambda request and a 900s cache when nothing is live. |
| **Errors** | Failures come back as an empty `200`, not an error status (the community reference notes status codes are inconsistent too). Treat an empty body as a failure. |
| **Caching** | Every response sends `no-store` — any caching has to be ours. |
| **Formats** | `modulekit` views return plain JSON under `SiteKit`. `statviewfeed` views are wrapped in parentheses, JSONP-style (`(…)`) — strip them before parsing. |
| **Logos** | Team logos: `https://assets.leaguestat.com/pwhl/logos/50x50/{teamId}.png` — square PNGs, fine to hot-link. League wordmark: `https://res.cloudinary.com/pwhl-low/image/upload/PWHL_Logo_Logotype_Ultra_Violet_cgbt5r`, a one-colour deep-purple (`#33058d`) SVG with no published white version; Cloudinary's colour transforms don't apply to SVGs, but Cloudinary sends `Access-Control-Allow-Origin: *`, so the SVG works as a CSS mask: this site paints it in the same violet at 65% lightness (`#8b53f9`, 3.86:1 on the dark strip vs the original's 1.27:1). |

## Major areas of functionality

| Area | View | What it gives you | Notes |
|---|---|---|---|
| **Score bar** | `modulekit&view=scorebar&numberofdaysback=N&numberofdaysahead=N` | Each game: `ID`, `SeasonID`, `Date`, `GameDateISO8601` (with UTC offset), both teams (`…Code`, `…LongName`, `…Goals`, `…Logo`, record), `GameStatus`, `PeriodNameShort`, `GameClock`, `Intermission`, venue, `GameSummaryUrl`. ~1.8 KB per game. | **Used by this site.** N counts **game days, not calendar days**: `1/1` returns the most recent and next game days even months apart, so the off-season still returns games. |
| **Games by date** | `modulekit&view=gamesbydate&fetch_date=YYYY-MM-DD` | One calendar day's games, with goals by period, shots, power plays. | A **different field set** (`game_status`, `home_team_code`, no logo URL, no ISO start time) — not interchangeable with the score bar. |
| **Games per day** | `modulekit&view=gamesperday&start_date=…&end_date=…` | **Counts only** — the number of games on each date, not the games. | |
| **Seasons** | `modulekit&view=seasons` | `season_id`, `season_name`, `career`, `playoff`, `start_date`, `end_date`. Preseason, regular season and playoffs are separate seasons. | **Used by this site** to identify the regular season. `start_date` is **not** the first game's date: 2026-27 says Dec 4, the first game is Dec 5. |
| **Schedule** | `modulekit&view=schedule`, `statviewfeed&view=schedule` | A full season's schedule. | |
| **Standings** | `statviewfeed&view=teams` | League table. | Each score-bar game already carries both teams' records. |
| **Game summary** | `statviewfeed&view=gameSummary&game_id=…`, `gc&tab=gamesummary&game_id=…` | One game: periods and scoring, three stars, both rosters' stats, goalies, officials, attendance, shootout, report links. ~35 KB. | Enough for a PWHL game modal later. |
| **Game Center** | `gc&tab=preview` / `clock` / `pxp` / `pxpverbose` | Preview, official clock, short and verbose play-by-play. | From the community reference. |
| **Players and leaders** | `statviewfeed&view=player` / `players`, `modulekit&view=player`, `modulekit&view=statviewtype&type=topscorers` | Bios, career stats, league leaders, streaks, transactions, search. | |
| **Playoffs** | `modulekit&view=brackets&season_id=…` | Bracket. | |
| **Bootstrap** | `statviewfeed&view=bootstrap` | Site config, including the Firebase project the official site uses for push updates. | |

## Game status (score bar)

| Field | Values | Seen? |
|---|---|---|
| `GameStatus` | `1` scheduled (status text is the start time, e.g. "7:00PM"); `4` final | Yes, across 535 games |
| `GameStatus` while live | `2` per community notes; this site treats anything other than `1`/`4` as live | **Not yet observed** — check the first live game of 2026-27 |
| `PeriodNameShort` | `1`–`3`; `OT1`–`OT4` (multi-overtime in the playoffs); `SO` | Yes, on finals |
| `game_type` | Blank on almost every game | Not usable to tell preseason from regular season — use `SeasonID` + the seasons list |

## The Firebase live feed — not used

The official site gets second-by-second updates from Firebase
(`leaguestat-b9523.firebaseio.com/svf/pwhl`: running clock, goals,
penalties, shots). The community reference documents its access string,
but that's an `auth=` database secret, not a public site key — using it
would be a different matter from reusing the key thepwhl.com serves to
every visitor. Not needed either: polling the score bar every 60s
while a game is live matches what the NHL ticker does.

## Community reference

[IsabelleLefebvre97/PWHL-Data-Reference](https://github.com/IsabelleLefebvre97/PWHL-Data-Reference)
— an **unofficial** README of the HockeyTech and Firebase endpoints
plus CSV exports, last updated **April 2025** (it predates the 2025-26
expansion teams). Useful for what exists; it doesn't cover the
`Origin`, `User-Agent` or rate-limit behaviour above.

## Re-checking it

```
curl -s -A "Mozilla/5.0" "https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&key=446521baf8c38984&client_code=pwhl&fmt=json&lang=en" | head -c 400
```

One call at a time — a burst gets you blocked.
