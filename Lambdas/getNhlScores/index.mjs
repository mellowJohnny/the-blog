// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Public read endpoint backing the NHL scores ticker on waxReviews.html
// (initNhlTicker() in scripts/wax.js). Proxies the NHL's free but
// undocumented API (api-web.nhle.com), for two reasons:
//   1. It sends no CORS headers, so the browser can't call it directly.
//   2. It's undocumented, so its shape can change without notice - this
//      Lambda is the one place that knows it, and returns a small,
//      stable shape of our own (see slimGame()).
//
// Returns { date, games, previous, upcoming }: today's games, plus the
// previous game day's finished (or still-live) games in `previous` until
// today's first game starts. "Today" is the calendar day in Eastern time
// - NOT the NHL's /score/now, whose currentDate was still the previous
// day at 10:21 a.m. ET (observed Oct 12, 2026). With no games today, `upcoming` names the next game day
// ("Next game") or the regular season's opener ("Season starts") with
// all of that day's games - same shape as getPwhlScores.
//
// No Cognito Authorizer - same public trust level as getCardSetsByYear.
// Uses Node's built-in fetch, so no dependencies. Needs a 10s function
// timeout: today's scores (5s cap), then `previous` and `upcoming` in
// parallel (5s cap; upcoming's own calls are capped at 2.5s each).

const NHL_API = "https://api-web.nhle.com/v1";
const UPSTREAM_TIMEOUT_MS = 5000;
const LIVE_STATES = ["LIVE", "CRIT"];
const FINAL_STATES = ["FINAL", "OFF"];
const NOT_STARTED_STATES = ["FUT", "PRE"];
const UPCOMING_TIMEOUT_MS = 2500;
const DAY_TIME_ZONE = "America/Toronto";

// YYYY-MM-DD and seconds-left-today for a moment, in Eastern time - the
// ticker's day boundary for both leagues (see getPwhlScores).
function easternDate(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DAY_TIME_ZONE }).format(date);
}

function secondsUntilEasternMidnight(date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: DAY_TIME_ZONE, hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" })
    .formatToParts(date)
    .reduce((acc, p) => ({ ...acc, [p.type]: Number(p.value) }), {});
  return 86400 - (parts.hour * 3600 + parts.minute * 60 + parts.second);
}

async function fetchJson(path, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const res = await fetch(`${NHL_API}/${path}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    throw new Error(`NHL API returned ${res.status} for ${path}`);
  }
  return res.json();
}

const fetchScores = (dateOrNow, timeoutMs) => fetchJson(`score/${dateOrNow}`, timeoutMs);

// No games today: the regular season's opener if it's still ahead
// ("Season starts"), else the next game day ("Next game"), each with all
// of that day's games. In summer, before the next season is in the API,
// neither exists and it's null.
async function findUpcoming(today) {
  const schedule = await fetchJson(`schedule/${today.currentDate}`, UPCOMING_TIMEOUT_MS);
  let kind = null;
  let target = null;
  if (schedule.regularSeasonStartDate > today.currentDate) {
    [kind, target] = ["season", schedule.regularSeasonStartDate];
  } else if (today.nextDate) {
    [kind, target] = ["next", today.nextDate];
  }
  if (!target) return null;

  const day = await fetchScores(target, UPCOMING_TIMEOUT_MS);
  const games = (day.games ?? []).map(slimGame).sort((a, b) => Date.parse(a.startTimeUTC) - Date.parse(b.startTimeUTC));
  return games.length ? { kind, startTimeUTC: games[0].startTimeUTC, games } : null;
}

// The ticker strip is dark, so swap NHL's _light logos (made for light
// backgrounds) for their _dark twins - same path, every team has both.
function slimTeam(team = {}) {
  return {
    abbrev: team.abbrev ?? "",
    score: team.score ?? null,
    logo: (team.logo ?? "").replace(/_light\.svg$/, "_dark.svg")
  };
}

function slimGame(g) {
  return {
    id: g.id,
    state: g.gameState,
    startTimeUTC: g.startTimeUTC,
    period: g.periodDescriptor?.number ?? null,
    periodType: g.periodDescriptor?.periodType ?? null,
    clock: g.clock?.timeRemaining ?? null,
    inIntermission: g.clock?.inIntermission ?? false,
    lastPeriodType: g.gameOutcome?.lastPeriodType ?? null,
    away: slimTeam(g.awayTeam),
    home: slimTeam(g.homeTeam)
  };
}

export const handler = async (event) => {
  let responseBody = "";
  let statusCode = 200;
  let maxAge = 300;

  try {
    // ?date=YYYY-MM-DD reads that day instead of today - a testing aid.
    const override = event?.queryStringParameters?.date;
    const now = new Date();
    const today = await fetchScores(/^\d{4}-\d{2}-\d{2}$/.test(override ?? "") ? override : easternDate(now));
    const games = (today.games ?? []).map(slimGame);

    // Before today's first puck drop (or on a day with no games), show
    // the previous game day's results too, so the ticker isn't just
    // start times. prevDate is the previous GAME day, not the calendar day.
    const nothingStarted = games.every((g) => NOT_STARTED_STATES.includes(g.state));
    const [prev, upcoming] = await Promise.all([
      nothingStarted && today.prevDate ? fetchScores(today.prevDate) : null,
      // Best effort: a failed lookup just means no notice, never a 502.
      games.length ? null : findUpcoming(today).catch((err) => {
        console.log("Upcoming lookup failed:", err);
        return null;
      })
    ]);
    // Finished games, plus any still being played - a late West Coast
    // game can still be live after midnight Eastern.
    const previous = (prev?.games ?? [])
      .map(slimGame)
      .filter((g) => FINAL_STATES.includes(g.state) || LIVE_STATES.includes(g.state));

    if ([...games, ...previous].some((g) => LIVE_STATES.includes(g.state))) {
      maxAge = 30;
    }
    // Never cache past midnight Eastern, or a copy from 11:58 p.m. would
    // keep serving yesterday as "today".
    maxAge = Math.max(1, Math.min(maxAge, secondsUntilEasternMidnight(now)));

    responseBody = JSON.stringify({ date: today.currentDate, games, previous, upcoming });
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
