/** playerSearch.js — support code for playerSearch.html
 * Searches the Checklists table by player name (searchPlayerName Lambda)
 * and renders results grouped by the set(s) that player appears in, each
 * linking back to that set's review on waxReviews.html.
 *
 * pageName (needed to build the waxReviews.html link) isn't returned by
 * the Lambda - it's derived client-side from year+blogCat via
 * getPageNameForYear() in helper.js, the same lookup renderSetPicker()
 * uses for the year-picker widget.
 */

const PLAYER_SEARCH_API_URL = "https://evlsyozjb0.execute-api.us-east-2.amazonaws.com/dev";

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
      const noteSpan = card.notes ? ` <span class="player-search-card-notes">${escapeHtml(card.notes)}</span>` : "";
      return `<li>${escapeHtml(card.cardNumberDisplay)} ${escapeHtml(card.playerName)}${insertNote}${noteSpan}</li>`;
    }).join("");

    return `
      <div class="player-search-group">
        <h3 class="player-search-set-name">${setHeading}</h3>
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
  }
}
