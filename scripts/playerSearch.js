/** playerSearch.js - searches Checklists by player name
 * (searchPlayerName Lambda), rendering results grouped by set with a
 * link back to each set's review on waxReviews.html. */

const PLAYER_SEARCH_API_URL = "https://evlsyozjb0.execute-api.us-east-2.amazonaws.com/dev";

// Type-ahead: the full distinct-player-name list (searchPlayerName's
// ?namesOnly=1 mode). Persisted in localStorage (30min TTL, matching
// that endpoint's own Cache-Control) so a fresh page load reads from
// cache instead of re-fetching - only a cold/expired cache ever hits
// the network. Within a single page load, the promise itself is also
// cached, so calling this from both the page's `load` prefetch and the
// first keystroke never double-fetches - they share the one in-flight
// (or already-resolved) promise.
const PLAYER_NAME_INDEX_STORAGE_KEY = "playerNameIndexCache";
const PLAYER_NAME_INDEX_TTL_MS = 30 * 60 * 1000;
let playerNameIndexPromise = null;

function readCachedPlayerNameIndex() {
  try {
    const cached = JSON.parse(localStorage.getItem(PLAYER_NAME_INDEX_STORAGE_KEY) || "null");
    if (cached && Array.isArray(cached.names) && Date.now() - cached.fetchedAt < PLAYER_NAME_INDEX_TTL_MS) {
      return cached.names;
    }
  } catch {
    // Corrupt/unreadable cache - fall through to a real fetch
  }
  return null;
}

function writeCachedPlayerNameIndex(names) {
  try {
    localStorage.setItem(PLAYER_NAME_INDEX_STORAGE_KEY, JSON.stringify({ names, fetchedAt: Date.now() }));
  } catch {
    // Storage full/unavailable (e.g. private browsing) - not fatal
  }
}

function loadPlayerNameIndex() {
  if (!playerNameIndexPromise) {
    const cached = readCachedPlayerNameIndex();
    if (cached) {
      playerNameIndexPromise = Promise.resolve(cached);
    } else {
      playerNameIndexPromise = fetch(`${PLAYER_SEARCH_API_URL}?namesOnly=1`)
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
        .then((data) => data.playerNames || [])
        .then((names) => {
          writeCachedPlayerNameIndex(names);
          return names;
        })
        .catch((err) => {
          console.log("Player name index fetch failed:", err);
          playerNameIndexPromise = null; // allow a retry on the next call
          return [];
        });
    }
  }
  return playerNameIndexPromise;
}

let currentSuggestions = [];
let activeSuggestionIndex = -1;

function renderSuggestions(matches) {
  const list = document.getElementById("playerSearchSuggestions");
  currentSuggestions = matches;
  activeSuggestionIndex = -1;

  if (matches.length === 0) {
    list.style.display = "none";
    list.innerHTML = "";
    return;
  }

  list.innerHTML = matches.map((name, i) =>
    `<li class="player-search-suggestion" role="option" id="player-search-suggestion-${i}">${escapeHtml(name)}</li>`
  ).join("");
  list.style.display = "block";
}

function hideSuggestions() {
  const list = document.getElementById("playerSearchSuggestions");
  list.style.display = "none";
  list.innerHTML = "";
  currentSuggestions = [];
  activeSuggestionIndex = -1;
}

function selectSuggestion(name) {
  document.getElementById("playerSearchInput").value = name;
  hideSuggestions();
  runPlayerSearch(name);
}

// Highlights suggestion `activeSuggestionIndex + delta` (wrapping),
// used by the ArrowUp/ArrowDown keydown handling in
// initPlayerSearchTypeahead() below.
function moveSuggestionActive(delta) {
  if (currentSuggestions.length === 0) return;
  activeSuggestionIndex = (activeSuggestionIndex + delta + currentSuggestions.length) % currentSuggestions.length;
  document.querySelectorAll(".player-search-suggestion").forEach((el, i) => {
    el.classList.toggle("active", i === activeSuggestionIndex);
  });
  document.getElementById(`player-search-suggestion-${activeSuggestionIndex}`)?.scrollIntoView({ block: "nearest" });
}

async function onPlayerSearchInputChanged() {
  const input = document.getElementById("playerSearchInput");
  const query = input.value.trim().toLowerCase();

  if (query.length < 2) {
    hideSuggestions();
    return;
  }

  const names = await loadPlayerNameIndex();
  // The input may have changed (or emptied) while the very first
  // index fetch was still in flight - don't render a stale result.
  if (input.value.trim().toLowerCase() !== query) return;

  const matches = names.filter((name) => name.toLowerCase().includes(query)).slice(0, 8);
  renderSuggestions(matches);
}

// Wires the type-ahead dropdown to #playerSearchInput. Call once on
// page load.
function initPlayerSearchTypeahead() {
  const input = document.getElementById("playerSearchInput");
  const list = document.getElementById("playerSearchSuggestions");
  if (!input || !list) return;

  input.addEventListener("input", onPlayerSearchInputChanged);

  input.addEventListener("keydown", (e) => {
    if (list.style.display === "none") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSuggestionActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSuggestionActive(-1);
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0) {
        e.preventDefault();
        selectSuggestion(currentSuggestions[activeSuggestionIndex]);
      }
      // else: let the form's own submit handler run the typed query
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  list.addEventListener("click", (e) => {
    const li = e.target.closest(".player-search-suggestion");
    if (li) selectSuggestion(li.textContent);
  });

  document.addEventListener("click", (e) => {
    if (list.style.display !== "none" && !input.contains(e.target) && !list.contains(e.target)) {
      hideSuggestions();
    }
  });
}

function renderPlayerSearchMessage(message) {
  const container = document.getElementById("playerSearchResults");
  container.innerHTML = `<p class="player-search-message">${escapeHtml(message)}</p>`;
}

function renderPlayerSearchResults(query, results) {
  const container = document.getElementById("playerSearchResults");

  if (results.length === 0) {
    renderPlayerSearchMessage(`No sets found with a player matching "${query}".`);
    return;
  }

  const groups = results.map((result) => {
    const pageName = (result.year && result.blogCat)
      ? getPageNameForYear(result.blogCat, result.year)
      : null;
    const href = pageName
      ? `/waxReviews.html?year=${encodeURIComponent(result.year)}&pageName=${encodeURIComponent(pageName)}&blogCat=${encodeURIComponent(result.blogCat)}`
      : null;

    const setHeading = href
      ? `<a href="${escapeHtml(href)}">${escapeHtml(result.setName)}</a>`
      : `${escapeHtml(result.setName)} <span class="player-search-no-review">(review not linked yet)</span>`;

    const cardRows = result.cards.map((card) => {
      const insertNote = card.insertSetName ? ` — ${escapeHtml(card.insertSetName)}` : "";
      // "RC" (Rookie Card) is the most sought-after marker in notes -
      // called out visually instead of blending in with other markers
      // (UER, LL, VAR). \b avoids matching "RC" as a substring.
      const isRookieCard = card.notes && /\bRC\b/.test(card.notes);
      const notesClass = isRookieCard ? "player-search-card-notes player-search-card-notes-rc" : "player-search-card-notes";
      const noteSpan = card.notes ? ` <span class="${notesClass}">${escapeHtml(card.notes)}</span>` : "";
      return `<li>${escapeHtml(card.cardNumberDisplay)} ${escapeHtml(card.playerName)}${insertNote}${noteSpan}</li>`;
    }).join("");

    return `
      <div class="player-search-group">
        <h3 class="player-search-set-name">Set: ${setHeading}</h3>
        <ul class="player-search-card-list">${cardRows}</ul>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <p class="player-search-summary">Found ${results.length} set${results.length === 1 ? "" : "s"} matching "${escapeHtml(query)}":</p>
    ${groups}
  `;
}

async function runPlayerSearch(rawQuery) {
  const query = (rawQuery || "").trim();

  if (query.length < 2) {
    renderPlayerSearchMessage("Enter at least 2 characters to search.");
    return;
  }

  // Keep the search shareable/bookmarkable without a full page reload.
  const url = new URL(window.location.href);
  url.searchParams.set("q", query);
  history.replaceState(null, "", url);

  renderPlayerSearchMessage(`Searching for "${query}"...`);

  // Same overlay+spinner pattern as smsAdmin.html (adminSMS.js) - the
  // Lambda's Scan-per-request design (LAMBDA_FUNCTIONS.md) can take a
  // couple seconds, and static "Searching..." text alone wasn't clear enough.
  const overlay = document.getElementById("player-search-spinner-overlay");
  if (overlay) overlay.style.display = "flex";

  try {
    const response = await fetch(`${PLAYER_SEARCH_API_URL}?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok) {
      renderPlayerSearchMessage(data.error || "Something went wrong with that search - please try again.");
      return;
    }

    renderPlayerSearchResults(data.query, data.results || []);
  } catch (err) {
    console.error("Player search failed:", err);
    renderPlayerSearchMessage("Something went wrong with that search - please try again.");
  } finally {
    if (overlay) overlay.style.display = "none";
  }
}
