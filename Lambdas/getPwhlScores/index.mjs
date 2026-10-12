// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Public read endpoint backing the PWHL section of the scores ticker on
// waxReviews.html (refreshTickerLeague() in scripts/wax.js). Proxies
// HockeyTech's stats feed (lscluster.hockeytech.com), which the PWHL's
// own site uses. A proxy is required, not optional:
//   - the feed returns an EMPTY 200 to any request with an Origin
//     header, so a browser on this site can never call it directly
//   - it needs a browser-style User-Agent, and briefly blocks a client
//     after a burst of calls - hence one call per request, cached.
//
// Returns the same shape as getNhlScores ({ date, games, previous }),
// so the ticker renders both leagues with one code path. Same day rule
// too: yesterday's finals in `previous` until today's first game starts.
// With no games either day it adds `upcoming` - the regular season's
// first game ("Season starts") or the next game - so the PWHL logo stays.
//
// The key is the PWHL site's public one (served in thepwhl.com's page
// source); see PWHL_API.md. No Cognito Authorizer. Needs a 10s timeout.

const FEED_URL = "https://lscluster.hockeytech.com/feed/index.php";
const SITE_KEY = "446521baf8c38984";
const CLIENT_CODE = "pwhl";
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const UPSTREAM_TIMEOUT_MS = 5000;
const LEAGUE_TIME_ZONE = "America/Toronto";

async function fetchFeed(params) {
  const query = new URLSearchParams({ ...params, key: SITE_KEY, client_code: CLIENT_CODE, fmt: "json", lang: "en" });
  const res = await fetch(`${FEED_URL}?${query}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  // This feed signals failure with an empty 200, not an error status.
  const body = await res.text();
  if (!res.ok || !body.trim()) {
    throw new Error(`PWHL feed (${params.view}) returned ${res.status} with ${body.length} bytes`);
  }
  return JSON.parse(body)?.SiteKit ?? {};
}

// The scorebar window counts game days, not calendar days, so +/-2
// always covers yesterday and today whatever the schedule.
async function fetchScorebar(back = 2, ahead = 2) {
  const kit = await fetchFeed({ feed: "modulekit", view: "scorebar", numberofdaysback: String(back), numberofdaysahead: String(ahead) });
  if (!Array.isArray(kit.Scorebar)) throw new Error("PWHL feed response had no Scorebar");
  return kit.Scorebar;
}

const toUTC = (iso) => new Date(iso).toISOString().replace(".000Z", "Z");
const byStart = (a, b) => Date.parse(a.GameDateISO8601) - Date.parse(b.GameDateISO8601);

// No games yesterday or today: what to announce instead, with every
// game on that day. Before the regular season, its first GAME's date -
// the seasons list's start_date can differ (Dec 4 vs the real Dec 5
// opener in 2026-27). In season, the next game day (already in the
// +/-2 window). Neither (summer): null.
async function findUpcoming(window, today) {
  const seasons = (await fetchFeed({ feed: "modulekit", view: "seasons" })).Seasons ?? [];
  const regular = seasons.find((s) => s.career === "1" && s.playoff === "0" && /regular/i.test(s.season_name));
  if (regular && regular.start_date >= today) {
    // 40 game days easily spans a preseason to reach the opener.
    const ahead = await fetchScorebar(0, 40);
    const season = ahead.filter((g) => g.SeasonID === regular.season_id).sort(byStart);
    const [opener] = season;
    if (opener && opener.Date > today) return upcomingDay("season", season, opener);
  }
  const future = window.filter((g) => g.Date > today && g.GameStatus === "1").sort(byStart);
  return future.length ? upcomingDay("next", future, future[0]) : null;
}

// The notice plus every game on the first game's (league) date.
function upcomingDay(kind, sortedGames, first) {
  return {
    kind,
    startTimeUTC: toUTC(first.GameDateISO8601),
    games: sortedGames.filter((g) => g.Date === first.Date).map(slimGame)
  };
}

// YYYY-MM-DD for a date in the league's home time zone.
function leagueDate(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LEAGUE_TIME_ZONE }).format(date);
}

// Previous calendar day of a YYYY-MM-DD string (noon UTC avoids DST edges).
function dayBefore(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// HockeyTech GameStatus: 1 = scheduled, 4 = final (both seen in real
// data). Live codes haven't been observed yet (off-season research), so
// anything else counts as live until verified in the 2026-27 season.
function gameState(g) {
  if (g.GameStatus === "1") return "FUT";
  if (g.GameStatus === "4") return "OFF";
  return "LIVE";
}

// PeriodNameShort: "1"-"3", "OT1".."OT4" (multi-OT in the playoffs), "SO".
function periodInfo(name = "") {
  if (name === "SO") return { period: 5, periodType: "SO" };
  const ot = /^OT(\d*)$/.exec(name);
  if (ot) return { period: 3 + Number(ot[1] || 1), periodType: "OT" };
  const n = Number(name);
  return { period: Number.isFinite(n) && n > 0 ? n : null, periodType: "REG" };
}

function slimGame(g) {
  const state = gameState(g);
  const { period, periodType } = periodInfo(g.PeriodNameShort);
  const started = state !== "FUT";
  return {
    id: g.ID,
    state,
    startTimeUTC: toUTC(g.GameDateISO8601),
    period: started ? period : null,
    periodType: started ? periodType : null,
    clock: state === "LIVE" ? g.GameClock ?? null : null,
    inIntermission: state === "LIVE" && g.Intermission === "1",
    lastPeriodType: state === "OFF" ? periodType : null,
    away: { abbrev: g.VisitorCode ?? "", score: started ? Number(g.VisitorGoals) : null, logo: g.VisitorLogo ?? "" },
    home: { abbrev: g.HomeCode ?? "", score: started ? Number(g.HomeGoals) : null, logo: g.HomeLogo ?? "" }
  };
}

export const handler = async (event) => {
  let responseBody = "";
  let statusCode = 200;
  let maxAge = 900;

  try {
    // ?date=YYYY-MM-DD overrides "today" - a testing aid only.
    const override = event?.queryStringParameters?.date;
    const today = /^\d{4}-\d{2}-\d{2}$/.test(override ?? "") ? override : leagueDate(new Date());
    const yesterday = dayBefore(today);

    const all = await fetchScorebar();
    const games = all.filter((g) => g.Date === today).map(slimGame);

    // Same rule as getNhlScores: last night's results until puck drop.
    let previous = [];
    if (games.every((g) => g.state === "FUT")) {
      previous = all
        .filter((g) => g.Date === yesterday)
        .map(slimGame)
        .filter((g) => g.state === "OFF");
    }

    // Best effort: a failed lookup just means no notice, never a 502.
    let upcoming = null;
    if (!games.length && !previous.length) {
      upcoming = await findUpcoming(all, today).catch((err) => {
        console.log("Upcoming lookup failed:", err);
        return null;
      });
    }

    if (games.some((g) => g.state === "LIVE")) maxAge = 60;
    responseBody = JSON.stringify({ date: today, games, previous, upcoming });
  } catch (err) {
    console.log("Error:", err);
    statusCode = 502;
    maxAge = 0;
    responseBody = JSON.stringify({ error: err.message });
  }

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": `public, max-age=${maxAge}`
    },
    body: responseBody
  };
};
