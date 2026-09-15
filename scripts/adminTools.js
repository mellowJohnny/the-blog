/** adminTools.js - client-side site-health checks for cms/admin.html,
 * run against existing public read APIs (no new backend). Add a new
 * check as its own function + button/results section on that page. */

const GET_BLOGS_URL = "https://qeb63ean2e.execute-api.us-east-2.amazonaws.com/dev";
const GET_CARD_SETS_BY_YEAR_URL = "https://a92dwyl3ic.execute-api.us-east-2.amazonaws.com/dev";
const SEARCH_PLAYER_NAME_URL = "https://evlsyozjb0.execute-api.us-east-2.amazonaws.com/dev";

/* Broken Image Check - loads every image the public site references
   (blog/card-set images, inline postBody images) as a real <img> and
   watches onload/onerror. Live content only, not staged/draft. */

// Tech, Mach-E, SYNC Updates, Raspberry Pi, Home Page - blogType 2
// (Hockey Cards) has no Blogs-table content, it's Cards instead - see
// DATA_MODEL.md.
const ADMIN_BLOG_TYPES = [1, 3, 4, 5, 99];

// 2004/mcd is waxReviews.html's special-cased redirect to lockout.html
// (no 2004-05 McDonald's set was ever made) - no Cards data to fetch.
const ADMIN_REDIRECTED_COMBOS = new Set(["2004|mcd"]);

function extractImgUrlsFromHtml(html) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("img[src]"))
    .map((img) => img.getAttribute("src"))
    .filter(Boolean);
}

// "No image" is normally the literal string "none" (see displayBlog()
// in blogs.js), but some posts just have the bare S3 prefix with no
// filename - treat both as "no image", not a broken reference.
function hasRealImageFilename(url) {
  if (!url || url === "none") return false;
  const lastSegment = url.trim().split("/").pop();
  return lastSegment.length > 0;
}

// fetchErrors collects any failed/unexpected-shape API response
// instead of crashing the whole check on one bad request - a real
// possibility given how many calls this makes (see ARCHITECTURE.md).
async function collectBlogImageCandidates(onProgress, fetchErrors) {
  const candidates = [];
  for (const blogType of ADMIN_BLOG_TYPES) {
    onProgress?.(`Fetching blogs (${BLOG_TYPE_LABELS[blogType] || blogType})...`);
    const res = await fetch(`${GET_BLOGS_URL}?blogType=${blogType}`);
    const body = await res.json();
    if (!res.ok || !Array.isArray(body)) {
      fetchErrors.push(`Blogs (${BLOG_TYPE_LABELS[blogType] || blogType}): ${body?.error || `HTTP ${res.status}`}`);
      continue;
    }
    for (const blog of body) {
      const label = `Blog: "${blog.title}" (${BLOG_TYPE_LABELS[blogType] || blogType})`;
      if (hasRealImageFilename(blog.img)) {
        candidates.push({ label, field: "img", url: blog.img });
      }
      for (const url of extractImgUrlsFromHtml(blog.postBody)) {
        candidates.push({ label, field: "inline content image", url });
      }
    }
  }
  return candidates;
}

async function collectCardSetImageCandidates(onProgress, fetchErrors) {
  const candidates = [];
  for (const blogCat in categoryRanges) {
    for (const pageName in categoryRanges[blogCat]) {
      const range = categoryRanges[blogCat][pageName];
      for (let year = range.start; year <= range.end; year++) {
        if (ADMIN_REDIRECTED_COMBOS.has(`${year}|${blogCat}`)) continue;

        onProgress?.(`Fetching card sets for ${year} (${blogCat})...`);
        const res = await fetch(`${GET_CARD_SETS_BY_YEAR_URL}?year=${year}&blogCat=${blogCat}`);
        const body = await res.json();
        if (!res.ok || !Array.isArray(body)) {
          fetchErrors.push(`Card sets for ${year} (${blogCat}): ${body?.error || `HTTP ${res.status}`}`);
          continue;
        }
        for (const set of body) {
          const label = `Set: "${set.setName}" (${year})`;
          if (set.headerImgName) {
            candidates.push({ label, field: "header image", url: `${set.headerImg || ""}${set.headerImgName}` });
          }
          if (set.footerImgName) {
            candidates.push({ label, field: "footer image", url: `${set.footerImg || ""}${set.footerImgName}` });
          }
          for (const url of extractImgUrlsFromHtml(set.postBody)) {
            candidates.push({ label, field: "inline content image", url });
          }
        }
      }
    }
  }
  return candidates;
}

// Loads a URL as a real <img> the same way the browser does when
// rendering it on the actual page - this is what catches cases like
// ORB-blocked S3 error responses, not just a plain HTTP status check.
function testImageLoads(url) {
  return new Promise((resolve) => {
    const img = new Image();
    // Don't let one stalled request hang the whole check.
    const timer = setTimeout(() => resolve(false), 15000);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

async function runBrokenImageCheck() {
  const statusEl = document.getElementById("imageCheckStatus");
  const resultsEl = document.getElementById("imageCheckResults");
  const btn = document.getElementById("imageCheckBtn");

  btn.disabled = true;
  resultsEl.innerHTML = "";
  statusEl.textContent = "Starting...";

  try {
    const setProgress = (msg) => { statusEl.textContent = msg; };
    const fetchErrors = [];
    const candidates = [
      ...(await collectBlogImageCandidates(setProgress, fetchErrors)),
      ...(await collectCardSetImageCandidates(setProgress, fetchErrors))
    ];

    // Many sets/posts can reference the exact same URL (e.g. a shared
    // header image) - check each distinct URL once, not once per use.
    const usedBy = new Map();
    for (const c of candidates) {
      if (!c.url) continue;
      if (!usedBy.has(c.url)) usedBy.set(c.url, []);
      usedBy.get(c.url).push(`${c.label} — ${c.field}`);
    }

    const urls = [...usedBy.keys()];
    const broken = [];
    const CONCURRENCY = 8;

    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const batch = urls.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(testImageLoads));
      results.forEach((ok, idx) => {
        if (!ok) broken.push({ url: batch[idx], usedBy: usedBy.get(batch[idx]) });
      });
      statusEl.textContent = `Checked ${Math.min(i + CONCURRENCY, urls.length)} of ${urls.length} unique image(s)...`;
    }

    const fetchErrorsHtml = fetchErrors.length > 0
      ? `<p class="admin-status-msg">${fetchErrors.length} page fetch(es) failed and were skipped (not counted above):</p>
         <ul class="admin-results-list">${fetchErrors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
      : "";

    if (broken.length === 0) {
      statusEl.textContent = `Done — checked ${urls.length} unique image(s), none broken.`;
      resultsEl.innerHTML = fetchErrorsHtml;
      return;
    }

    statusEl.textContent = `Done — ${broken.length} of ${urls.length} unique image(s) are broken:`;
    resultsEl.innerHTML = `
      <table class="admin-results-table">
        <thead><tr><th>Broken image URL</th><th>Used by</th></tr></thead>
        <tbody>
          ${broken.map((b) => `
            <tr>
              <td class="admin-results-url">${escapeHtml(b.url)}</td>
              <td>${b.usedBy.map(escapeHtml).join("<br>")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${fetchErrorsHtml}
    `;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

/* Checklist Integrity Check - wires a button to searchPlayerName's
   existing ?audit=1 mode, which finds every Checklists setName with
   no matching Cards item (see DATA_MODEL.md). Nothing new to build. */

async function runChecklistIntegrityCheck() {
  const statusEl = document.getElementById("checklistCheckStatus");
  const resultsEl = document.getElementById("checklistCheckResults");
  const btn = document.getElementById("checklistCheckBtn");

  btn.disabled = true;
  resultsEl.innerHTML = "";
  statusEl.textContent = "Running audit...";

  try {
    const res = await fetch(`${SEARCH_PLAYER_NAME_URL}?audit=1`);
    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || "Something went wrong running the audit.";
      return;
    }

    const { totalDistinctSetNames, unlinkedSetNames } = data;

    if (unlinkedSetNames.length === 0) {
      statusEl.textContent = `Done — all ${totalDistinctSetNames} uploaded checklist(s) are correctly linked to a Cards review.`;
      return;
    }

    statusEl.textContent = `Done — ${unlinkedSetNames.length} of ${totalDistinctSetNames} checklist(s) have no matching Cards review:`;
    resultsEl.innerHTML = `
      <ul class="admin-results-list">
        ${unlinkedSetNames.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
      </ul>
    `;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}
