/**
 * Browse By Set (browseBySet.html): every live set in two columns, grouped by
 * season, each with a Review link and (when it has one) a Checklist link.
 */

// getPublicCardSets (Lambdas/getPublicCardSets/): setID, setName, blogCat, year, hasChecklist.
const BROWSE_SETS_URL = "https://jlpd8ec14j.execute-api.us-east-2.amazonaws.com/prod";

// The stored year is the season's first year: 1990 -> "1990-91".
function browseSeasonLabel(year) {
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}

// [{ year, sets }, ...] oldest season first, sets A to Z within a season.
function groupBrowseSetsBySeason(sets) {
  const byYear = new Map();
  sets.forEach((set) => {
    if (!byYear.has(set.year)) byYear.set(set.year, []);
    byYear.get(set.year).push(set);
  });
  return [...byYear.keys()].sort((a, b) => a - b).map((year) => ({
    year,
    sets: byYear.get(year).sort((a, b) => a.setName.localeCompare(b.setName))
  }));
}

function buildBrowseSetEntry(set) {
  const pageName = getPageNameForYear(set.blogCat, set.year);
  // The season heading above already shows the year, so the title drops it;
  // data-set-name below keeps the full name, which the checklist lookup needs.
  const links = [];
  if (pageName) {
    const setParam = set.setID ? `&setID=${encodeURIComponent(set.setID)}` : "";
    const url = `/waxReviews.html?year=${set.year}&pageName=${pageName}&blogCat=${encodeURIComponent(set.blogCat)}${setParam}`;
    links.push(`<a href="${url}">Review</a>`);
  }
  if (set.hasChecklist) {
    links.push(`<a href="#" class="browse-checklist-link" data-set-name="${escapeHtml(set.setName)}">Checklist</a>`);
  }
  return `
    <div class="browse-set">
      <div class="browse-set-name">${escapeHtml(stripYearFromSetName(set.setName))}</div>
      <div class="browse-set-links">${links.join("")}</div>
    </div>`;
}

function renderBrowseColumn(containerId, sets) {
  const container = document.getElementById(containerId);
  container.innerHTML = groupBrowseSetsBySeason(sets).map((group) => `
    <div class="browse-season">
      <h3 class="browse-season-heading">${browseSeasonLabel(group.year)}</h3>
      ${group.sets.map(buildBrowseSetEntry).join("")}
    </div>`).join("");
}

async function initBrowseBySet() {
  const status = document.getElementById("browseStatus");
  if (!status) return;

  // The Checklist links are rebuilt on every render, so listen once on the page.
  document.getElementById("browseColumns").addEventListener("click", (event) => {
    const link = event.target.closest(".browse-checklist-link");
    if (!link) return;
    event.preventDefault();
    openChecklistModal(link);
  });

  status.textContent = "Loading the sets...";
  try {
    if (!BROWSE_SETS_URL) throw new Error("No sets endpoint configured");
    const res = await fetch(BROWSE_SETS_URL);
    if (!res.ok) throw new Error(`Sets request failed: ${res.status}`);
    const sets = await res.json();
    if (!Array.isArray(sets)) throw new Error("Unexpected sets response");

    const live = sets.filter((s) => s.setName && Number.isFinite(s.year));
    if (!live.length) {
      status.textContent = "No sets are live yet - please check back soon.";
      return;
    }
    renderBrowseColumn("browseMajor", live.filter((s) => s.blogCat === "reg"));
    renderBrowseColumn("browseFastFood", live.filter((s) => s.blogCat === "mcd" || s.blogCat === "tims"));
    status.hidden = true;
  } catch (err) {
    console.log("Browse By Set:", err);
    status.textContent = "The list of sets couldn't be loaded right now. Please try again later.";
  }
}
