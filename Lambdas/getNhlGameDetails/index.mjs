// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Public read endpoint backing the NHL game modal on waxReviews.html
// (openNhlGameModal() in scripts/wax.js), opened from the scores ticker.
// Takes ?gameId= and combines six NHL sources into one small, stable
// shape of our own (see NHL_API.md for the research):
//   - api-web.nhle.com gamecenter landing / right-rail / boxscore -
//     required; no CORS, so the browser couldn't call them anyway.
//   - api-web.nhle.com standings on the game date (team records) and
//     forge-dapi.d3.nhle.com stories / videos (NHL.com's content API) -
//     optional; that part is null if its call fails.
//
// No Cognito Authorizer - same public trust level as getNhlScores.
// Uses Node's built-in fetch, so no dependencies. Needs a 10s timeout.

const NHL_API = "https://api-web.nhle.com/v1";
const GAME_API = `${NHL_API}/gamecenter`;
const CONTENT_API = "https://forge-dapi.d3.nhle.com/v2/content/en-us";
const UPSTREAM_TIMEOUT_MS = 5000;
const IMAGE_FORMAT = "t_ratio16_9-size40";
const LIVE_STATES = ["LIVE", "CRIT"];
const FINAL_STATES = ["FINAL", "OFF"];

// Labels and order for the box score's team-stats comparison.
const TEAM_STAT_LABELS = {
  sog: "Shots",
  faceoffWinningPctg: "Faceoff %",
  powerPlay: "Power Play",
  pim: "PIM",
  hits: "Hits",
  blockedShots: "Blocked Shots",
  giveaways: "Giveaways",
  takeaways: "Takeaways"
};

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

// NHL text fields come as { default: "...", fr: "..." }.
const text = (field) => field?.default ?? "";

function periodLabel(pd) {
  if (pd?.periodType === "SO") return "SO";
  if (pd?.periodType === "OT") return pd.number > 4 ? `${pd.number - 3}OT` : "OT";
  return String(pd?.number ?? "");
}

function slimTeam(team = {}, records = {}) {
  return {
    abbrev: team.abbrev ?? "",
    name: `${text(team.placeName)} ${text(team.commonName)}`.trim(),
    record: records[team.abbrev] ?? null,
    score: team.score ?? null,
    sog: team.sog ?? null,
    logo: team.logo ?? ""
  };
}

// W-L-OTL per team from the standings as of the game date - that day's
// games are already counted, so a final shows the record after it.
function recordsByTeam(standings) {
  const records = {};
  (standings?.standings ?? []).forEach((s) => {
    records[text(s.teamAbbrev)] = `${s.wins}-${s.losses}-${s.otLosses}`;
  });
  return records;
}

function slimScoring(scoring = []) {
  return scoring
    .filter((p) => p.periodDescriptor?.periodType !== "SO")
    .map((p) => ({
      label: p.periodDescriptor.periodType === "REG" ? `Period ${p.periodDescriptor.number}` : periodLabel(p.periodDescriptor),
      goals: (p.goals ?? []).map((g) => ({
        time: g.timeInPeriod,
        team: text(g.teamAbbrev),
        scorer: text(g.name),
        scorerTotal: g.goalsToDate ?? null,
        assists: (g.assists ?? []).map((a) => ({ name: text(a.name), total: a.assistsToDate ?? null })),
        strength: g.strength ?? "ev",
        emptyNet: g.goalModifier === "empty-net",
        awayScore: g.awayScore,
        homeScore: g.homeScore
      }))
    }));
}

function slimTeamStats(stats = []) {
  return Object.entries(TEAM_STAT_LABELS)
    .map(([category, label]) => {
      const s = stats.find((x) => x.category === category);
      if (!s) return null;
      const fmt = (v) => (category === "faceoffWinningPctg" ? `${Math.round(v * 100)}%` : v);
      return { label, away: fmt(s.awayValue), home: fmt(s.homeValue) };
    })
    .filter(Boolean);
}

// W/L from the boxscore's goalie decisions - an OT/SO loss is "O".
function slimDecisions(boxscore) {
  const goalies = ["awayTeam", "homeTeam"].flatMap((t) => boxscore.playerByGameStats?.[t]?.goalies ?? []);
  const winner = goalies.find((g) => g.decision === "W");
  const loser = goalies.find((g) => g.decision === "L" || g.decision === "O");
  return winner && loser ? { winner: text(winner.name), loser: text(loser.name) } : null;
}

function imageUrl(thumbnail) {
  return thumbnail?.templateUrl ? thumbnail.templateUrl.replace("{formatInstructions}", IMAGE_FORMAT) : null;
}

function slimRecap(stories) {
  const story = (stories?.items ?? []).find((s) => (s.tags ?? []).some((t) => t.slug === "game-recap"));
  if (!story) return null;
  return {
    headline: story.headline ?? story.title ?? "",
    summary: story.summary ?? "",
    imageUrl: imageUrl(story.thumbnail),
    url: `https://www.nhl.com/news/${story.slug}`
  };
}

function slimVideo(videos) {
  const video = (videos?.items ?? []).find((v) => /-recap-\d+$/.test(v.slug ?? ""));
  if (!video?.fields?.brightcoveId) return null;
  return {
    id: video.fields.brightcoveId,
    title: video.title ?? "",
    duration: (video.fields.duration ?? "").replace(/^00:/, ""),
    thumbnailUrl: imageUrl(video.thumbnail)
  };
}

function cacheSeconds(state, hasRecap) {
  if (LIVE_STATES.includes(state)) return 30;
  if (FINAL_STATES.includes(state)) return hasRecap ? 3600 : 600;
  return 300;
}

export const handler = async (event) => {
  let responseBody = "";
  let statusCode = 200;
  let maxAge = 0;

  try {
    const gameId = event?.queryStringParameters?.gameId ?? "";
    if (!/^\d{10}$/.test(gameId)) {
      statusCode = 400;
      throw new Error("Missing or invalid 'gameId' query parameter");
    }

    const tag = `tags.slug=gameid-${gameId}&context.slug=nhl`;
    const [landing, rail, boxscore] = await Promise.all([
      fetchJson(`${GAME_API}/${gameId}/landing`),
      fetchJson(`${GAME_API}/${gameId}/right-rail`),
      fetchJson(`${GAME_API}/${gameId}/boxscore`)
    ]).catch((err) => {
      statusCode = 502;
      throw err;
    });
    const [stories, videos, standings] = await Promise.allSettled([
      fetchJson(`${CONTENT_API}/stories?${tag}`),
      fetchJson(`${CONTENT_API}/videos?${tag}`),
      fetchJson(`${NHL_API}/standings/${landing.gameDate}`)
    ]);

    const records = standings.status === "fulfilled" ? recordsByTeam(standings.value) : {};
    const away = slimTeam(landing.awayTeam, records);
    const home = slimTeam(landing.homeTeam, records);
    const [yyyy, mm, dd] = (landing.gameDate ?? "").split("-");
    const recap = stories.status === "fulfilled" ? slimRecap(stories.value) : null;
    const so = landing.summary?.shootout;

    responseBody = JSON.stringify({
      id: landing.id,
      state: landing.gameState,
      startTimeUTC: landing.startTimeUTC,
      gameDate: landing.gameDate,
      venue: [text(landing.venue), text(landing.venueLocation)].filter(Boolean).join(", "),
      gameCenterUrl: `https://www.nhl.com/gamecenter/${away.abbrev.toLowerCase()}-vs-${home.abbrev.toLowerCase()}/${yyyy}/${mm}/${dd}/${gameId}`,
      period: landing.periodDescriptor?.number ?? null,
      periodType: landing.periodDescriptor?.periodType ?? null,
      clock: landing.clock?.timeRemaining ?? null,
      inIntermission: landing.clock?.inIntermission ?? false,
      lastPeriodType: boxscore.gameOutcome?.lastPeriodType ?? null,
      away,
      home,
      linescore: {
        periods: (rail.linescore?.byPeriod ?? []).map((p) => ({ label: periodLabel(p.periodDescriptor), away: p.away, home: p.home })),
        totals: rail.linescore?.totals ?? { away: away.score, home: home.score }
      },
      decisions: slimDecisions(boxscore),
      teamStats: slimTeamStats(rail.teamGameStats),
      scoring: slimScoring(landing.summary?.scoring),
      shootout: (so?.events ?? []).map((e) => ({
        team: text(e.teamAbbrev),
        player: `${text(e.firstName)} ${text(e.lastName)}`.trim(),
        result: e.result
      })),
      threeStars: (landing.summary?.threeStars ?? []).map((s) => ({
        star: s.star,
        name: text(s.name),
        team: s.teamAbbrev ?? "",
        position: s.position ?? ""
      })),
      recap,
      video: videos.status === "fulfilled" ? slimVideo(videos.value) : null
    });
    maxAge = cacheSeconds(landing.gameState, Boolean(recap));
  } catch (err) {
    console.log("Error:", err);
    if (statusCode === 200) statusCode = 502;
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
