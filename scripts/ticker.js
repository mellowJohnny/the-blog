/**
 * NHL scores ticker (every hockey page) - a scrolling strip under the
 * masthead, fed by getNhlScores (Lambdas/getNhlScores/, a proxy for
 * the NHL's CORS-less API). Hidden on error or when there are no games.
 */

const NHL_SCORES_API_URL = "https://kckdcdjqch.execute-api.us-east-2.amazonaws.com/dev";
const PWHL_SCORES_API_URL = "https://lgk2lrxenb.execute-api.us-east-2.amazonaws.com/prod";
const NHL_TICKER_POLL_MS = 60000;
const NHL_TICKER_PX_PER_SEC = 45;
const TICKER_SWAP_CHECK_MS = 200;
const TICKER_NHL_FIRST_WAIT_MS = 2500;
const TICKER_ENTRY_DELAY_MS = 100;
let tickerEntryPlayed = false;
const TICKER_POS_KEY = "tickerPos";
const TICKER_POS_MAX_AGE_MS = 30 * 60 * 1000;
const TICKER_DATA_KEY = "tickerData:";
const TICKER_DATA_MAX_AGE_MS = 10 * 60 * 1000;
let tickerPriming = false;
// After midnight Eastern, wait this long before re-fetching, so the
// Lambdas (whose caching never crosses midnight) serve the new day.
const TICKER_MIDNIGHT_GRACE_MS = 2 * 60 * 1000;
const NHL_LIVE_STATES = ["PRE", "LIVE", "CRIT"];
const NHL_FINAL_STATES = ["FINAL", "OFF"];
const NHL_PERIOD_LABELS = { 1: "1st", 2: "2nd", 3: "3rd" };

// Leagues in strip order, each fetched on its own so neither waits on the
// other. gameKey (comma-joined IDs rendered), timer and swapTimer are the
// league's own state. Logo sizes are set up front so widths never shift;
// logoColor repaints a one-colour logo (see buildTickerLeagueLogo()).
const TICKER_LEAGUES = [
  {
    id: "nhl", name: "NHL", url: NHL_SCORES_API_URL, clickable: true,
    logo: "https://assets.nhle.com/logos/nhl/svg/NHL_dark.svg", logoSize: [48, 32], teamLogoSize: [42, 28],
    gameKey: "", timer: null, swapTimer: null
  },
  {
    id: "pwhl", name: "PWHL", url: PWHL_SCORES_API_URL, clickable: false,
    logo: "https://res.cloudinary.com/pwhl-low/image/upload/PWHL_Logo_Logotype_Ultra_Violet_cgbt5r", logoSize: [85, 18], teamLogoSize: [28, 28],
    // The wordmark's own violet (#33058d) is 1.27:1 on the dark strip;
    // the same hue at 65% lightness is 3.86:1, above the 3:1 guideline.
    logoColor: "#8b53f9",
    gameKey: "", timer: null, swapTimer: null
  }
];

function initNhlTicker() {
  const ticker = document.getElementById("nhlTicker");
  const leagues = TICKER_LEAGUES.filter((league) => league.url);
  if (!ticker || !leagues.length) return;

  // Remember the scroll position so the next page in this tab resumes it.
  window.addEventListener("pagehide", () => saveTickerPosition(ticker));
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveTickerPosition(ticker); });

  // Stop polling in a background tab; catch up as soon as it's back.
  document.addEventListener("visibilitychange", () => {
    leagues.forEach((league) => {
      clearTimeout(league.timer);
      if (!document.hidden && league.gameKey) refreshTickerLeague(league);
    });
  });

  // One listener for every chip, including ones added by later refreshes.
  ticker.addEventListener("click", (event) => {
    const chip = event.target.closest(".nhl-chip");
    const section = chip?.closest(".ticker-league");
    const league = TICKER_LEAGUES.find((l) => l.id === section?.dataset.league);
    if (chip && !chip.disabled && league?.clickable) openNhlGameModal(chip.dataset.gameId);
  });
  initNhlGameModal();
  // Window resize or phone rotation changes the strip's width.
  new ResizeObserver(() => applyNhlTickerMotion(ticker)).observe(ticker);
  // A late font swap changes the strip's width; keep the position through it.
  document.fonts.addEventListener("loadingdone", () => refitTickerMotion(ticker));

  // Coming from another page in this tab: show its last scores straight
  // away, at the position it left off, before the fresh fetch lands.
  let primed = false;
  tickerPriming = true;
  leagues.forEach((league) => {
    const cached = readTickerCache(league);
    if (cached) { renderTickerLeagueData(league, cached); primed = true; }
  });
  tickerPriming = false;
  if (primed && ticker.querySelector(".nhl-ticker-scroller")) {
    if (restoreTickerPosition(ticker)) tickerEntryPlayed = true;
    else startTickerEntry(ticker);
  }

  // Without a cache, the other leagues hold their first render until the
  // first league (the NHL) has rendered, failed or come back empty, or 2.5s pass.
  const [first, ...rest] = leagues;
  const firstSettled = refreshTickerLeague(first);
  const hold = primed ? undefined : Promise.race([firstSettled, new Promise((resolve) => setTimeout(resolve, TICKER_NHL_FIRST_WAIT_MS))]);
  const others = rest.map((league) => refreshTickerLeague(league, hold));
  // The rail is on the page from first paint; if nothing ever fills it, drop it.
  Promise.allSettled([firstSettled, ...others]).then(() => {
    ticker.removeAttribute("aria-busy");
    if (!ticker.querySelector(".ticker-league")) ticker.hidden = true;
  });
}

async function refreshTickerLeague(league, hold) {
  clearTimeout(league.timer);

  let data;
  try {
    const res = await fetch(league.url);
    if (!res.ok) throw new Error(`${league.name} scores request failed: ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.log(`${league.name} ticker:`, err);
    // Keep showing the last good scores mid-game and try again later;
    // on the very first load there's nothing to show, so nothing renders.
    if (league.gameKey) league.timer = setTimeout(() => refreshTickerLeague(league), NHL_TICKER_POLL_MS);
    return;
  }
  writeTickerCache(league, data);
  if (hold) await hold;
  renderTickerLeagueData(league, data);
}

function writeTickerCache(league, data) {
  try {
    sessionStorage.setItem(TICKER_DATA_KEY + league.id, JSON.stringify({ data, savedAt: Date.now() }));
  } catch (e) { /* storage blocked: the next page just fetches */ }
}

function readTickerCache(league) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(TICKER_DATA_KEY + league.id));
    return saved && Date.now() - saved.savedAt <= TICKER_DATA_MAX_AGE_MS ? saved.data : null;
  } catch (e) { return null; }
}

function renderTickerLeagueData(league, data) {
  const ticker = document.getElementById("nhlTicker");
  const previous = data.previous || [];
  const today = data.games || [];
  const all = [...previous, ...today];
  // No games today: show the "Season starts" / "Next game" notice and its
  // games after any results, keyed so a change still swaps in hidden.
  const upcoming = today.length ? null : data.upcoming;
  const key = all.map((g) => g.id).join(",") + (upcoming
    ? `|upcoming:${upcoming.kind}:${upcoming.startTimeUTC}:${(upcoming.games || []).map((g) => g.id).join(",")}`
    : "");

  if (key === league.gameKey) {
    all.forEach((game) => updateNhlGameChips(ticker, league, game));
  } else {
    league.gameKey = key;
    const section = all.length || upcoming ? buildTickerLeagueSection(league, previous, today, upcoming) : null;
    replaceTickerLeagueSection(ticker, league, section);
  }
  scheduleNhlTickerRefresh(league, today, previous);
}

// Poll every 60s while a game is live (including last night's, if one
// runs past midnight); otherwise sleep until the next scheduled puck
// drop. With nothing left to play, wake just after midnight Eastern - the
// Lambdas' day boundary - so an open tab still rolls over to the new day.
function scheduleNhlTickerRefresh(league, today, previous = []) {
  if (document.hidden) return;

  let delay;
  if ([...today, ...previous].some((g) => NHL_LIVE_STATES.includes(g.state))) {
    delay = NHL_TICKER_POLL_MS;
  } else {
    const starts = today.filter((g) => g.state === "FUT").map((g) => Date.parse(g.startTimeUTC));
    delay = starts.length
      ? Math.max(NHL_TICKER_POLL_MS, Math.min(...starts) - Date.now())
      : msUntilEasternMidnight() + TICKER_MIDNIGHT_GRACE_MS;
  }
  league.timer = setTimeout(() => refreshTickerLeague(league), delay);
}

function msUntilEasternMidnight() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Toronto", hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" })
    .formatToParts(new Date())
    .reduce((acc, p) => ({ ...acc, [p.type]: Number(p.value) }), {});
  return (86400 - (parts.hour * 3600 + parts.minute * 60 + parts.second)) * 1000;
}

// One league's block: its logo, yesterday's games after their date, then
// today's after "Today" - or, with no games today, the upcoming notice
// followed by that day's games. Dates are in the visitor's time zone.
function buildTickerLeagueSection(league, previous, today, upcoming) {
  const section = document.createElement("div");
  section.className = "ticker-league";
  section.dataset.league = league.id;

  section.appendChild(buildTickerLeagueLogo(league));

  if (previous.length) {
    section.appendChild(buildNhlTickerLabel(formatTickerGroupDate(previous)));
    previous.forEach((game) => section.appendChild(buildNhlGameChip(game, league)));
  }
  if (today.length) {
    section.appendChild(buildNhlTickerLabel("Today"));
    today.forEach((game) => section.appendChild(buildNhlGameChip(game, league)));
  } else if (upcoming) {
    const note = document.createElement("span");
    note.className = "ticker-league-note";
    note.textContent = `${upcoming.kind === "season" ? "Season starts" : "Next game"} ${formatTickerDate(upcoming.startTimeUTC)}`;
    section.appendChild(note);
    (upcoming.games || []).forEach((game) => section.appendChild(buildNhlGameChip(game, league)));
  }
  return section;
}

// An <img>, or - for a one-colour logo with a logoColor - a box painted
// that colour through the logo as a CSS mask (the host must allow CORS,
// which Cloudinary does), labelled so screen readers still read it.
function buildTickerLeagueLogo(league) {
  if (!league.logoColor) {
    const img = document.createElement("img");
    img.className = "ticker-league-logo";
    img.src = league.logo;
    img.alt = league.name;
    [img.width, img.height] = league.logoSize;
    return img;
  }
  const logo = document.createElement("span");
  logo.className = "ticker-league-logo ticker-league-logo-masked";
  logo.setAttribute("role", "img");
  logo.setAttribute("aria-label", league.name);
  logo.style.backgroundColor = league.logoColor;
  logo.style.webkitMaskImage = logo.style.maskImage = `url("${league.logo}")`;
  return logo;
}

function formatTickerDate(utc) {
  return new Date(utc).toLocaleDateString([], { month: "short", day: "numeric" });
}

// A group's label: its earliest game's date, local to the visitor - so
// it always agrees with the local start times beside it.
function formatTickerGroupDate(games) {
  const first = Math.min(...games.map((g) => Date.parse(g.startTimeUTC)));
  return formatTickerDate(first);
}

// Copy B of the marquee: hidden from screen readers and the tab order,
// so each game is announced and focused once.
function copyTickerSection(section) {
  const copy = section.cloneNode(true);
  copy.querySelectorAll(".nhl-chip").forEach((chip) => { chip.tabIndex = -1; });
  return copy;
}

function insertTickerSection(track, league, section) {
  const order = TICKER_LEAGUES.map((l) => l.id);
  const next = [...track.querySelectorAll(".ticker-league")]
    .find((s) => order.indexOf(s.dataset.league) > order.indexOf(league.id));
  track.insertBefore(section, next || null);
}

// The first league to arrive builds the strip: two identical tracks that
// CSS slides -50% on a loop (copy B is aria-hidden).
function buildTickerScroller(ticker) {
  const track = document.createElement("div");
  track.className = "nhl-ticker-track";
  const copy = document.createElement("div");
  copy.className = "nhl-ticker-track nhl-ticker-track-copy";
  copy.setAttribute("aria-hidden", "true");

  const scroller = document.createElement("div");
  scroller.className = "nhl-ticker-scroller";
  scroller.append(track, copy);
  const entry = document.createElement("div");
  entry.className = "nhl-ticker-entry";
  entry.appendChild(scroller);
  ticker.replaceChildren(entry);
  return scroller;
}

// Swaps a league's section in both copies without a visible jump: waits
// for a moment it's off-screen when one exists this pass, otherwise
// swaps now and fades it in. See FRONTEND.md "NHL scores ticker".
function replaceTickerLeagueSection(ticker, league, section) {
  clearTimeout(league.swapTimer);
  const scroller = ticker.querySelector(".nhl-ticker-scroller");
  if (!scroller || !scroller.querySelector(".ticker-league")) {
    if (!section) return;
    const fresh = buildTickerScroller(ticker);
    const [track, copy] = fresh.querySelectorAll(".nhl-ticker-track");
    track.appendChild(section);
    copy.appendChild(copyTickerSection(section));
    ticker.hidden = false;
    applyNhlTickerMotion(ticker);
    if (!tickerPriming) {
      if (restoreTickerPosition(ticker)) tickerEntryPlayed = true;
      else startTickerEntry(ticker);
    }
    return;
  }

  // While priming from the cache, and during the entrance (the loop is held
  // at its start), the position maths below doesn't apply: swap in now.
  if (tickerPriming || scroller.closest(".nhl-ticker-entering")) {
    applyTickerSectionSwap(ticker, league, section, null);
    return;
  }

  // Backstop: never wait longer than one full pass.
  const anim = scroller.getAnimations()[0];
  const deadline = Date.now() + (anim ? anim.effect.getComputedTiming().duration : 0);
  const attempt = () => {
    const safe = findHiddenSwap(ticker, league);
    if (safe === "wait" && Date.now() < deadline) {
      league.swapTimer = setTimeout(attempt, TICKER_SWAP_CHECK_MS);
    } else {
      applyTickerSectionSwap(ticker, league, section, safe === "wait" ? null : safe);
    }
  };
  attempt();
}

// Where things sit, in track coordinates: x = scroll offset, w = strip
// width, W = one copy's width, and the league's section span in copy A
// (or its insertion point, if the league has no section yet).
function tickerGeometry(ticker, league) {
  const scroller = ticker.querySelector(".nhl-ticker-scroller");
  const [track] = scroller.querySelectorAll(".nhl-ticker-track");
  const origin = track.getBoundingClientRect().left;
  const x = ticker.getBoundingClientRect().left - origin;
  const w = ticker.clientWidth;
  const W = track.getBoundingClientRect().width;

  const sections = [...track.querySelectorAll(".ticker-league")];
  const own = sections.find((s) => s.dataset.league === league.id);
  let start;
  let end;
  if (own) {
    const r = own.getBoundingClientRect();
    [start, end] = [r.left - origin, r.right - origin];
  } else {
    const order = TICKER_LEAGUES.map((l) => l.id);
    const next = sections.find((s) => order.indexOf(s.dataset.league) > order.indexOf(league.id));
    const last = sections[sections.length - 1];
    start = next ? next.getBoundingClientRect().left - origin : last.getBoundingClientRect().right - origin;
    end = start;
  }
  return { scroller, x, w, W, start, end, width: end - start };
}

// Returns "a" (section entirely right of the view: nothing visible moves),
// "b" (left of the view in copy A and right of it in copy B: visible
// content shifts by the size change, which the scroll then offsets),
// "wait" (a safe moment comes later this pass) or null (none will).
function findHiddenSwap(ticker, league) {
  const scroller = ticker.querySelector(".nhl-ticker-scroller");
  const anim = scroller.getAnimations()[0];
  if (!anim) return null;
  const { x, w, W, start, end } = tickerGeometry(ticker, league);

  const aUntil = start - w;
  const bFrom = end;
  const bUntil = Math.min(W, W + start - w);
  if (x <= aUntil) return "a";
  if (x >= bFrom && x <= bUntil) return "b";
  // A window narrower than two checks' worth of scrolling can slip past
  // between checks, so it doesn't count.
  const minWindow = 2 * NHL_TICKER_PX_PER_SEC * (TICKER_SWAP_CHECK_MS / 1000);
  const aPossible = aUntil >= minWindow;
  const bPossible = bUntil - bFrom >= minWindow;
  return aPossible || bPossible ? "wait" : null;
}

function applyTickerSectionSwap(ticker, league, section, safe) {
  const before = tickerGeometry(ticker, league);
  const anim = before.scroller.getAnimations()[0];
  const [track, copy] = before.scroller.querySelectorAll(".nhl-ticker-track");

  [[track, section], [copy, section && copyTickerSection(section)]].forEach(([t, next]) => {
    const old = t.querySelector(`.ticker-league[data-league="${league.id}"]`);
    if (old && next) old.replaceWith(next);
    else if (old) old.remove();
    else if (next) insertTickerSection(t, league, next);
  });

  if (!track.querySelector(".ticker-league")) {
    ticker.hidden = true;
    return;
  }
  applyNhlTickerMotion(ticker);

  if ((safe === "a" || safe === "b") && anim) {
    const after = tickerGeometry(ticker, league);
    const delta = after.width - before.width;
    const x = ((safe === "b" ? before.x + delta : before.x) % after.W + after.W) % after.W;
    // -50% of the scroller is one copy, so progress = x / W.
    anim.currentTime = (x / after.W) * anim.effect.getComputedTiming().duration;
  } else if (section && !tickerPriming) {
    ticker.querySelectorAll(`.ticker-league[data-league="${league.id}"]`).forEach((s) => {
      s.classList.add("ticker-league-entering");
      s.addEventListener("animationend", () => s.classList.remove("ticker-league-entering"), { once: true });
    });
  }
}

// Saved in px, not as a fraction: later leagues are inserted to the right
// of the NHL, so the offset holds while the strip's width doesn't.
// Mid-entrance there's nothing worth saving: the next page replays it.
function saveTickerPosition(ticker) {
  const scroller = ticker.querySelector(".nhl-ticker-scroller");
  const anim = scroller?.getAnimations()[0];
  try {
    if (!anim || anim.currentTime == null || scroller.closest(".nhl-ticker-entering")) {
      sessionStorage.removeItem(TICKER_POS_KEY);
      return;
    }
    const duration = anim.effect.getComputedTiming().duration;
    const width = scroller.querySelector(".nhl-ticker-track").getBoundingClientRect().width;
    const x = ((anim.currentTime % duration) / duration) * width;
    sessionStorage.setItem(TICKER_POS_KEY, JSON.stringify({ x, savedAt: Date.now() }));
  } catch (e) { /* storage blocked: the ticker just starts fresh */ }
}

function restoreTickerPosition(ticker) {
  const scroller = ticker.querySelector(".nhl-ticker-scroller");
  const anim = scroller?.getAnimations()[0];
  if (!anim) return false;
  try {
    const saved = JSON.parse(sessionStorage.getItem(TICKER_POS_KEY));
    if (!saved || Date.now() - saved.savedAt > TICKER_POS_MAX_AGE_MS) return false;
    if (!(saved.x >= 0)) return false;
    const width = scroller.querySelector(".nhl-ticker-track").getBoundingClientRect().width;
    // Carry on from where it would be now: the old page's offset plus the
    // time spent loading this one.
    const x = saved.x + ((Date.now() - saved.savedAt) / 1000) * NHL_TICKER_PX_PER_SEC;
    anim.currentTime = ((x % width) / width) * anim.effect.getComputedTiming().duration;
    return true;
  } catch (e) { return false; }
}

// First build only: after a short hold, the strip slides in from the far
// right at the scroll speed and the loop (paused until now) takes over
// where it arrives, at the left edge. Skipped for reduced motion.
function startTickerEntry(ticker) {
  if (tickerEntryPlayed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  tickerEntryPlayed = true;
  const entry = ticker.querySelector(".nhl-ticker-entry");
  const distance = ticker.clientWidth;
  const duration = (distance / NHL_TICKER_PX_PER_SEC) * 1000;
  entry.style.setProperty("--entry-px", `${distance}px`);
  entry.style.setProperty("--entry-ms", `${Math.round(duration)}ms`);
  entry.classList.add("nhl-ticker-entering");

  const finish = () => entry.classList.remove("nhl-ticker-entering");
  entry.addEventListener("animationend", (event) => { if (event.target === entry) finish(); });
  // Backstop in case the animation never runs; a paused (hovered) one is left alone.
  const backstop = () => (entry.getAnimations().length ? setTimeout(backstop, 1000) : finish());
  setTimeout(backstop, TICKER_ENTRY_DELAY_MS + duration + 1000);
}

// The two-copy loop is only seamless when each copy is at least as wide
// as the strip, so each gets min-width = the strip's width: with few
// games the next pass enters on the right just as the first game starts
// to leave on the left. min-width (not measured padding) stays exact as
// fonts load or scores change. Re-run when the strip's width changes.
function applyNhlTickerMotion(ticker) {
  const scroller = ticker.querySelector(".nhl-ticker-scroller");
  if (!scroller) return;
  const tracks = scroller.querySelectorAll(".nhl-ticker-track");
  const stripWidth = ticker.clientWidth;
  // Reduced motion shows a static, swipeable row - nothing to pad.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  tracks.forEach((track) => { track.style.minWidth = reducedMotion ? "" : `${stripWidth}px`; });

  // Same scroll speed whatever the game count - unrounded, so a swap's
  // position maths lands exactly.
  const distance = tracks[0].getBoundingClientRect().width;
  scroller.style.animationDuration = `${(distance / NHL_TICKER_PX_PER_SEC).toFixed(3)}s`;
}

// Re-measure after the strip's width changes (a font swap), holding the
// same pixel offset: a new duration alone would shift the progress.
function refitTickerMotion(ticker) {
  const scroller = ticker.querySelector(".nhl-ticker-scroller");
  const anim = scroller?.getAnimations()[0];
  if (!anim || anim.currentTime == null) return;
  const track = scroller.querySelector(".nhl-ticker-track");
  const oldWidth = track.getBoundingClientRect().width;
  const x = ((anim.currentTime % anim.effect.getComputedTiming().duration) / anim.effect.getComputedTiming().duration) * oldWidth;
  applyNhlTickerMotion(ticker);
  const width = track.getBoundingClientRect().width;
  anim.currentTime = ((x % width) / width) * anim.effect.getComputedTiming().duration;
}

function buildNhlTickerLabel(text) {
  const label = document.createElement("span");
  label.className = "nhl-ticker-label";
  label.textContent = text;
  return label;
}

function buildNhlGameChip(game, league) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "nhl-chip";
  chip.dataset.gameId = game.id;
  chip.append(buildNhlTeam(game.away, "away", league), buildNhlTeam(game.home, "home", league));

  const status = document.createElement("span");
  status.className = "nhl-status";
  chip.appendChild(status);

  fillNhlGameChip(chip, game, league);
  return chip;
}

function buildNhlTeam(team, side, league) {
  const wrap = document.createElement("span");
  wrap.className = "nhl-team";

  if (team.logo) {
    const logo = document.createElement("img");
    logo.src = team.logo;
    logo.alt = "";
    [logo.width, logo.height] = league.teamLogoSize;
    logo.loading = "lazy";
    wrap.appendChild(logo);
  }

  const abbrev = document.createElement("span");
  abbrev.className = "nhl-abbrev";
  abbrev.textContent = team.abbrev;

  const score = document.createElement("span");
  score.className = "nhl-score";
  score.dataset.side = side;

  wrap.append(abbrev, score);
  return wrap;
}

// Writes the parts of a chip that change during a game - shared by the
// first render and every in-place refresh.
function fillNhlGameChip(chip, game, league) {
  const isFuture = ["FUT", "PRE"].includes(game.state);
  chip.querySelector('[data-side="away"]').textContent = isFuture ? "" : game.away.score ?? "";
  chip.querySelector('[data-side="home"]').textContent = isFuture ? "" : game.home.score ?? "";
  chip.querySelector(".nhl-status").textContent = formatNhlGameStatus(game);
  chip.classList.toggle("nhl-chip-live", ["LIVE", "CRIT"].includes(game.state));
  // Nothing to show in the game modal until puck drop; PWHL games have
  // no modal yet (league.clickable).
  chip.disabled = isFuture || !league.clickable || !NHL_GAME_API_URL;

  // Bold the winner of a finished game. Shootout finals need no special
  // case - the NHL credits the shootout winner with one extra goal.
  const isFinal = NHL_FINAL_STATES.includes(game.state);
  const awayWon = isFinal && game.away.score > game.home.score;
  const homeWon = isFinal && game.home.score > game.away.score;
  chip.querySelector('[data-side="away"]').parentElement.classList.toggle("nhl-team-winner", awayWon);
  chip.querySelector('[data-side="home"]').parentElement.classList.toggle("nhl-team-winner", homeWon);
}

// Both marquee copies carry the same data-game-id, so update each -
// within the league's own section, since NHL and PWHL IDs can collide.
function updateNhlGameChips(ticker, league, game) {
  ticker.querySelectorAll(`.ticker-league[data-league="${league.id}"] [data-game-id="${game.id}"]`)
    .forEach((chip) => fillNhlGameChip(chip, game, league));
}

function formatNhlGameStatus(game) {
  if (NHL_FINAL_STATES.includes(game.state)) {
    const extra = game.lastPeriodType && game.lastPeriodType !== "REG";
    return extra ? `Final/${game.lastPeriodType}` : "Final";
  }

  if (["LIVE", "CRIT"].includes(game.state)) {
    if (game.periodType === "SO") return "SO";
    // Playoff overtime runs past one period: period 5 is 2OT, 6 is 3OT...
    const period = game.periodType === "OT"
      ? (game.period > 4 ? `${game.period - 3}OT` : "OT")
      : (NHL_PERIOD_LABELS[game.period] || "");
    const clock = (game.clock || "").replace(/^0(?=\d:)/, "");
    return game.inIntermission ? `${period} INT` : `${period} ${clock}`.trim();
  }

  // FUT / PRE: start time in the visitor's own time zone.
  return new Date(game.startTimeUTC).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * NHL game modal (every hockey page) - opened from a ticker chip. Score
 * header plus Summary / Box Score / Recap tabs, fed by getNhlGameDetails
 * (Lambdas/getNhlGameDetails/), which combines five NHL sources.
 */

const NHL_GAME_API_URL = "https://kx7zuay324.execute-api.us-east-2.amazonaws.com/prod";
// The NHL's own Brightcove "Gamecenter Player" - same one nhl.com uses.
const NHL_VIDEO_PLAYER_URL = "https://players.brightcove.net/6415718365001/EXtG1xJ7H_default/index.html";

// Bumped on every open/close, so a slow response for a game that's
// since been closed or replaced is ignored rather than rendered.
let nhlGameRequestId = 0;

// Built here, not in each page's HTML, so a page only needs the rail div.
const NHL_GAME_MODAL_HTML = `
  <div id="nhlGameModalOverlay" class="checklist-modal-overlay">
    <div
      class="checklist-modal-content nhl-game-modal"
      role="dialog"
      aria-modal="true"
      aria-label="NHL game details"
    >
      <div class="checklist-modal-controls">
        <span class="checklist-modal-close" onclick="closeNhlGameModal()"
          >&times;</span
        >
      </div>
      <div id="nhlGameHeader" class="nhl-game-header"></div>
      <div class="nhl-game-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id="nhlGameTabSummary"
          aria-controls="nhlGameSummary"
          aria-selected="true"
        >
          Summary
        </button>
        <button
          type="button"
          role="tab"
          id="nhlGameTabBoxScore"
          aria-controls="nhlGameBoxScore"
          aria-selected="false"
          tabindex="-1"
        >
          Box Score
        </button>
        <button
          type="button"
          role="tab"
          id="nhlGameTabRecap"
          aria-controls="nhlGameRecap"
          aria-selected="false"
          tabindex="-1"
        >
          Recap
        </button>
      </div>
      <div
        id="nhlGameSummary"
        class="nhl-game-panel"
        role="tabpanel"
        aria-labelledby="nhlGameTabSummary"
      ></div>
      <div
        id="nhlGameBoxScore"
        class="nhl-game-panel"
        role="tabpanel"
        aria-labelledby="nhlGameTabBoxScore"
        hidden
      ></div>
      <div
        id="nhlGameRecap"
        class="nhl-game-panel"
        role="tabpanel"
        aria-labelledby="nhlGameTabRecap"
        hidden
      ></div>
    </div>
  </div>
`;

function initNhlGameModal() {
  if (!document.getElementById("nhlGameModalOverlay")) document.body.insertAdjacentHTML("beforeend", NHL_GAME_MODAL_HTML);
  const overlay = document.getElementById("nhlGameModalOverlay");
  if (!overlay) return;

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeNhlGameModal();
    const poster = event.target.closest(".nhl-video-poster");
    if (poster) playNhlGameVideo(poster);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.style.display === "block") closeNhlGameModal();
  });

  // Tabs: click to switch, arrow keys move between them.
  const tabs = [...overlay.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectNhlGameTab(tab));
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      selectNhlGameTab(next);
      next.focus();
    });
  });
}

function selectNhlGameTab(tab) {
  tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]').forEach((t) => {
    const selected = t === tab;
    t.setAttribute("aria-selected", String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
  });
}

async function openNhlGameModal(gameId) {
  const overlay = document.getElementById("nhlGameModalOverlay");
  const summary = document.getElementById("nhlGameSummary");
  const requestId = ++nhlGameRequestId;

  ["nhlGameHeader", "nhlGameBoxScore", "nhlGameRecap"].forEach((id) => {
    document.getElementById(id).innerHTML = "";
  });
  summary.innerHTML = "<p>Loading game...</p>";
  const firstTab = overlay.querySelector('[role="tab"]');
  selectNhlGameTab(firstTab);
  overlay.style.display = "block";
  firstTab.focus();

  let game;
  try {
    const res = await fetch(`${NHL_GAME_API_URL}?gameId=${encodeURIComponent(gameId)}`);
    if (!res.ok) throw new Error(`NHL game request failed: ${res.status}`);
    game = await res.json();
  } catch (err) {
    if (requestId !== nhlGameRequestId) return;
    console.log("NHL game fetch failed:", err);
    summary.innerHTML = "<p>Couldn't load this game right now - please try again.</p>";
    return;
  }
  if (requestId !== nhlGameRequestId) return;

  renderNhlGameHeader(game);
  renderNhlGameSummary(game);
  renderNhlGameBoxScore(game);
  renderNhlGameRecap(game);
}

function closeNhlGameModal() {
  nhlGameRequestId++;
  document.getElementById("nhlGameModalOverlay").style.display = "none";
  // Emptying the Recap panel removes a playing video's iframe, so its
  // audio stops with the modal.
  document.getElementById("nhlGameRecap").innerHTML = "";
}

function renderNhlGameHeader(game) {
  const isFinal = NHL_FINAL_STATES.includes(game.state);
  const extra = game.lastPeriodType && game.lastPeriodType !== "REG" ? ` (${game.lastPeriodType})` : "";
  const status = isFinal ? `Final${extra}` : formatNhlGameStatus(game);
  const lost = (side, other) => isFinal && game[side].score < game[other].score;

  const team = (t) => `
    <div class="nhl-game-team">
      <img src="${escapeHtml(t.logo)}" alt="" width="72" height="48">
      <span class="nhl-game-team-text">
        <span class="nhl-game-abbrev">${escapeHtml(t.abbrev)}</span>
        ${t.record ? `<span class="nhl-game-record">${escapeHtml(t.record)}</span>` : ""}
      </span>
    </div>`;
  const score = (side, other) =>
    `<span class="nhl-game-score${lost(side, other) ? " nhl-game-score-loser" : ""}">${game[side].score ?? ""}</span>`;
  const date = new Date(game.startTimeUTC).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  document.getElementById("nhlGameHeader").innerHTML = `
    <div class="nhl-game-scoreline">
      <div class="nhl-game-side nhl-game-side-away">${team(game.away)}</div>
      ${score("away", "home")}
      <span class="nhl-game-status">${escapeHtml(status)}</span>
      ${score("home", "away")}
      <div class="nhl-game-side nhl-game-side-home">${team(game.home)}</div>
    </div>
    <p class="nhl-game-meta">${escapeHtml(date)}${game.venue ? ` · ${escapeHtml(game.venue)}` : ""}</p>`;
}

function renderNhlGameSummary(game) {
  const periods = game.scoring.map((period) => `
    <section class="nhl-game-section">
      <h3>${escapeHtml(period.label)}</h3>
      ${period.goals.length
        ? period.goals.map((goal) => buildNhlGoalRow(goal, game)).join("")
        : '<p class="nhl-game-empty">No Scoring</p>'}
    </section>`).join("");

  const shootout = game.shootout.length ? `
    <section class="nhl-game-section">
      <h3>Shootout</h3>
      ${game.shootout.map((attempt) => `
        <div class="nhl-game-row">
          <img src="${escapeHtml(nhlTeamLogo(game, attempt.team))}" alt="${escapeHtml(attempt.team)}" width="36" height="24">
          <span class="nhl-game-row-main">${escapeHtml(attempt.player)}</span>
          <span class="nhl-shootout-${attempt.result === "goal" ? "goal" : "miss"}">${attempt.result === "goal" ? "✓ Goal" : "✗ No goal"}</span>
        </div>`).join("")}
    </section>` : "";

  const stars = game.threeStars.length ? `
    <section class="nhl-game-section">
      <h3>Three Stars</h3>
      ${game.threeStars.map((s) => `
        <div class="nhl-game-row">
          <span class="nhl-star">${"★".repeat(s.star)}</span>
          <img src="${escapeHtml(nhlTeamLogo(game, s.team))}" alt="${escapeHtml(s.team)}" width="36" height="24">
          <span class="nhl-game-row-main">${escapeHtml(s.name)}</span>
          <span class="nhl-game-row-note">${escapeHtml(s.position)}</span>
        </div>`).join("")}
    </section>` : "";

  document.getElementById("nhlGameSummary").innerHTML =
    periods + shootout + stars || '<p class="nhl-game-empty">No scoring yet.</p>';
}

function nhlTeamLogo(game, abbrev) {
  return abbrev === game.home.abbrev ? game.home.logo : game.away.logo;
}

function buildNhlGoalRow(goal, game) {
  const withTotal = (name, total) => `${escapeHtml(name)}${total != null ? ` (${total})` : ""}`;
  const assists = goal.assists.length
    ? goal.assists.map((a) => withTotal(a.name, a.total)).join(", ")
    : "Unassisted";
  const badge = { pp: "PPG", sh: "SHG" }[goal.strength] || (goal.emptyNet ? "EN" : "");

  return `
    <div class="nhl-game-row nhl-goal">
      <span class="nhl-goal-time">${escapeHtml(goal.time)}</span>
      <img src="${escapeHtml(nhlTeamLogo(game, goal.team))}" alt="${escapeHtml(goal.team)}" width="36" height="24">
      <div class="nhl-game-row-main">
        <div class="nhl-goal-scorer">${withTotal(goal.scorer, goal.scorerTotal)}${badge ? ` <span class="nhl-goal-badge">${badge}</span>` : ""}</div>
        <div class="nhl-goal-assists">${assists}</div>
      </div>
      <span class="nhl-game-row-note">${escapeHtml(game.away.abbrev)} ${goal.awayScore} - ${goal.homeScore} ${escapeHtml(game.home.abbrev)}</span>
    </div>`;
}

function renderNhlGameBoxScore(game) {
  const { periods, totals } = game.linescore;
  if (!periods.length) {
    document.getElementById("nhlGameBoxScore").innerHTML = '<p class="nhl-game-empty">No box score yet.</p>';
    return;
  }

  const isFinal = NHL_FINAL_STATES.includes(game.state);
  const row = (side) => `
    <tr>
      <th scope="row"><img src="${escapeHtml(game[side].logo)}" alt="" width="36" height="24"> ${escapeHtml(game[side].abbrev)}</th>
      ${periods.map((p) => `<td>${p[side] ?? ""}</td>`).join("")}
      <td class="nhl-linescore-total">${totals[side] ?? ""}</td>
    </tr>`;
  const decisions = game.decisions ? `
    <div class="nhl-game-decisions">
      <p><strong>W:</strong> ${escapeHtml(game.decisions.winner)}</p>
      <p><strong>L:</strong> ${escapeHtml(game.decisions.loser)}</p>
    </div>` : "";
  const stats = game.teamStats.length ? `
    <table class="nhl-team-stats">
      <thead><tr>
        <th scope="col">${escapeHtml(game.away.abbrev)}</th>
        <th scope="col">Team Stats</th>
        <th scope="col">${escapeHtml(game.home.abbrev)}</th>
      </tr></thead>
      <tbody>${game.teamStats.map((s) => `
        <tr><td>${escapeHtml(String(s.away))}</td><th scope="row">${escapeHtml(s.label)}</th><td>${escapeHtml(String(s.home))}</td></tr>`).join("")}
      </tbody>
    </table>` : "";

  document.getElementById("nhlGameBoxScore").innerHTML = `
    <div class="nhl-linescore-box">
      <div class="nhl-linescore-wrap">
        <table class="nhl-linescore">
          <thead><tr>
            <th scope="col">${isFinal ? "Final" : escapeHtml(formatNhlGameStatus(game))}</th>
            ${periods.map((p) => `<th scope="col">${escapeHtml(p.label)}</th>`).join("")}
            <th scope="col">T</th>
          </tr></thead>
          <tbody>${row("away")}${row("home")}</tbody>
        </table>
      </div>
      ${decisions}
    </div>
    ${stats}`;
}

// The video loads only when its poster is clicked - see playNhlGameVideo().
function renderNhlGameRecap(game) {
  const video = game.video ? `
    <button type="button" class="nhl-video-poster" data-video-id="${escapeHtml(game.video.id)}" data-title="${escapeHtml(game.video.title)}">
      ${game.video.thumbnailUrl ? `<img src="${escapeHtml(game.video.thumbnailUrl)}" alt="">` : ""}
      <span class="nhl-video-play" aria-hidden="true">▶</span>
      <span class="nhl-video-caption">${escapeHtml(game.video.title)}${game.video.duration ? ` · ${escapeHtml(game.video.duration)}` : ""}</span>
    </button>` : "";

  // The video poster already carries a photo, so the article's own
  // photo only shows when there's no video.
  const recap = game.recap ? `
    <article class="nhl-recap">
      ${!game.video && game.recap.imageUrl ? `<img class="nhl-recap-image" src="${escapeHtml(game.recap.imageUrl)}" alt="">` : ""}
      <h3>${escapeHtml(game.recap.headline)}</h3>
      <p>${escapeHtml(game.recap.summary)}</p>
      <a href="${escapeHtml(game.recap.url)}" target="_blank" rel="noopener">Read full recap on NHL.com ↗</a>
    </article>` : `
    <article class="nhl-recap">
      <p class="nhl-game-empty">Recap not posted yet.</p>
      <a href="${escapeHtml(game.gameCenterUrl)}" target="_blank" rel="noopener">Open on NHL.com ↗</a>
    </article>`;

  document.getElementById("nhlGameRecap").innerHTML = video + recap;
}

function playNhlGameVideo(poster) {
  const frame = document.createElement("iframe");
  frame.className = "nhl-video-frame";
  frame.src = `${NHL_VIDEO_PLAYER_URL}?videoId=${encodeURIComponent(poster.dataset.videoId)}&autoplay=true`;
  frame.title = poster.dataset.title || "NHL highlights";
  frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
  frame.allowFullscreen = true;
  poster.replaceWith(frame);
}

// Starts once the HTML is parsed rather than on window load (which waits for
// every image); a page with no rail does nothing.
document.addEventListener("DOMContentLoaded", initNhlTicker);
