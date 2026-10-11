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
// Returns { date, games, previous }: today's games, plus last night's
// finished games in `previous` until today's first game starts.
//
// No Cognito Authorizer - same public trust level as getCardSetsByYear.
// Uses Node's built-in fetch, so no dependencies. Needs a 10s function
// timeout (two upstream calls, each capped at 5s).

const NHL_API = "https://api-web.nhle.com/v1";
const UPSTREAM_TIMEOUT_MS = 5000;
const LIVE_STATES = ["LIVE", "CRIT"];
const FINAL_STATES = ["FINAL", "OFF"];
const NOT_STARTED_STATES = ["FUT", "PRE"];

async function fetchScores(dateOrNow) {
  const res = await fetch(`${NHL_API}/score/${dateOrNow}`, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  if (!res.ok) {
    throw new Error(`NHL API returned ${res.status} for score/${dateOrNow}`);
  }
  return res.json();
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

export const handler = async () => {
  let responseBody = "";
  let statusCode = 200;
  let maxAge = 300;

  try {
    const today = await fetchScores("now");
    const games = (today.games ?? []).map(slimGame);

    // Before today's first puck drop (or on a day with no games), show
    // last night's results too, so the ticker isn't just start times.
    let previous = [];
    const nothingStarted = games.every((g) => NOT_STARTED_STATES.includes(g.state));
    if (nothingStarted && today.prevDate) {
      const prev = await fetchScores(today.prevDate);
      previous = (prev.games ?? [])
        .map(slimGame)
        .filter((g) => FINAL_STATES.includes(g.state));
    }

    if (games.some((g) => LIVE_STATES.includes(g.state))) {
      maxAge = 30;
    }

    responseBody = JSON.stringify({ date: today.currentDate, games, previous });
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
