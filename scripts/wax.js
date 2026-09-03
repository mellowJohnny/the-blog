/** Global Pagination Variables */
let allCardSets = []; // Used in pagination - holds all the Card Sets so we can paginate through it
let currentPage = 1; // Which Card Set to start with
const pageSize = 1; // how many blogs to display at a time

/** **
 * Card Intro Text Render-O-Matic
 * Moved to a static design because it's fatser than calling an API for such a small piece on content which never changes...
 */

function renderCardIntro(pageName) {

  let introHTML = "";

  if (pageName === "classicWax") {
    introHTML = `
       <h2>Classic '80s Sets</h2>
      <p>The O-Pee-Chee sets from Gretzky's debut in the 1979-80 set right up to the Roy and Lemieux years defined a classic period of card collecting. The 8 sets from the pre-boom era include not only Gretzky, Roy, and Lemieux but also Messier, Bourque, Coffey, Savard, Fuhr, Hawerchuck, Carbonneau, Yzerman, Gilmour, and MacInnis. Quite a Hall of Fame class.</p>
    `;
  } else if (pageName === "junkWax") {
    introHTML = `
      <h2>Junk Wax Sets</h2>
      <p>The late '80s and early '90s...Miami Vice, acid wash jeans, and teal San Jose Sharks jerseys...and a hockey card explosion. Consider this: the 1989-90 season had just two licensed hockey sets - Topps in the US and O-Pee-Chee in Canada. But just a few years later there were thirteen licensed sets, ushering in the <i><a href="cards.html">Junk Wax</a></i> era.<br><br> But there are some hidden gems to be found if you are willing to dig around a bit...</p>
    `;
  } else if (pageName === "timmies") {
    introHTML = `
      <h2>Tim Hortons Upper Deck Sets</h2>
      <p>When McDonald's Canada shut down their association with the NHL in 2010, nearly 20 years of fast food hockey card collecting went with it. But in 2015, after a five year absence, fast food hockey card collecting was back! Tim Hortons, the bastion of blue-collar coffee shops, released their very first NHL Hockey set for the 2015-16 season. <br><br>But they didn't just mail it in - it was a modern, 100 card Upper Deck base set, complete with custom binder and loads of chase cards.  Released just after the season starts in October, it has become an annual tradition in Canada</p>
    `;
  } else if (pageName === "mcd") {
    introHTML = `
      <h2>McDonald's Canada Hockey</h2><p>McDonald's Canada launched the very first "All Star" set for the 1991-92 NHL season, and continued the tradition for 18 years (minus the '04-'05 lockout), ending with the last 2009-10 Upper Deck set.
      Early sets were small All-Star game retrospectives, but slowly grew in size and dropped the All-Star focus, eventually becoming "regular" hockey sets, pushing over 100 cards. A sign of things to come for the Tim Hortons sets which ultimately replaced them. </p>
    `;
  }
    const introEl = document.getElementById("card-intro");
      if (introEl) {
        introEl.innerHTML = introHTML;
      }
  }// end renderCardIntro()

 function fetchCardSetsByYear(year, sortOrder, blogCat) {

    const urlToFetch = `https://a92dwyl3ic.execute-api.us-east-2.amazonaws.com/dev?year=${year}&blogCat=${blogCat}`;

    fetch(urlToFetch)
        .then(response => response.json())
        .then(data => {

            // Lambda returns an array, not { Items: [...] }
            if (!Array.isArray(data) || data.length === 0) {
                document.getElementById("cardSetDiv").innerHTML =
                    "...coming soon - this set is not in my collection yet";
                return;
            }

            // Sorting
            if (sortOrder === "last") {
                data.sort(getSortOrder("stars", "last"));
            } else {
                data.sort(getSortOrder("stars", "first"));
            }

            // Store results for pagination
            allCardSets = data;
            currentPage = 1;
            renderCardSetPage();
        })
        .catch(err => {
            document.getElementById("cardSetDiv").innerHTML =
                "...Ah, Houston, we've had a problem...";
            console.log("Something went wrong:", err);
        });

        // Dynamically display the copyright year 
        fetchCopyrightYear();
}

/**
 * Used by the pagination method - acts as a middleman to paginate, then for each set to be rendered on the page
 * it calls the original displayCardSet() function to render the set
 */

function renderCardSetPage() {
  const container = document.getElementById("cardSetDiv");
  container.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageItems = allCardSets.slice(start, end);

  // ⭐ THIS is where your original function is called
  pageItems.forEach(item => {
    displayCardSet(
      item.postBody,
      item.year,
      item.mfg,
      item.size,
      item.subsets,
      item.stars,
      item.formats,
      item.headerImg,
      item.headerImgName,
      item.footerImg,
      item.footerImgName,
      item.setName,
      item.author,
      item.now,
      item.upvotes,
      item.downvotes,
      item.hasChecklist
    );
    // Populate the page title
    fetchPageTitle(item.setName);
    
  });

  renderPaginationControls();
}

/*************** Dynamically create & render the page title for waxReviews.html ***************** */
function fetchPageTitle(setName) 
{
  let pageTitle = document.getElementById("pageTitle");
    pageTitle.innerHTML += `
    <title>Review: ${setName}</title>
    `;
}

/**
 * Function to FORMAT & DISPLAY card sets
 */

   function displayCardSet(postBody,year,mfg,size,subsets,stars,formats,headerImg,headerImgName,footerImg,footerImgName,setName, author,date,upvotes,downvotes,hasChecklist)
   {

    // Convert stars to a number
    const numStars = parseInt(stars);

    // Generate star emojis
    let cleanStars = "";
    for (let i = 0; i < numStars; i++) {
        cleanStars += "&#127775; ";
    }

    // Calculate Reading Time
    const readingStats = estimateReadingTime(postBody); // lives in helper.js

    // Voting - the Cards table's key is (setName, year), so that's
    // what identifies a set for voting. Counts come from DynamoDB
    // (undefined until the first vote is ever cast, since the attribute
    // doesn't exist yet). 
    // voteKey is a DOM/localStorage-safe id derived
    // from setName+year, since setName can contain characters (spaces, apostrophes) that aren't valid in an HTML id.
    const upCount = upvotes || 0;
    const downCount = downvotes || 0;
    const voteKey = `${setName}-${year}`.replace(/[^a-zA-Z0-9]+/g, "-");
    const votedSets = JSON.parse(localStorage.getItem("votedSets") || "{}");
    const existingVote = votedSets[voteKey]; // "up", "down", or undefined

    // Reference to the div where everything goes
    let cardBody = document.getElementById("cardSetDiv");

    // hasChecklist comes from the Cards item (set by saveChecklist the
    // first time a checklist is uploaded for this set - see
    // Lambdas/saveChecklist/index.mjs). Only add the row - and bump the
    // image cell's rowspan to match - when there's actually a checklist
    // to point to. setName is passed via data-set-name rather than
    // interpolated into the onclick string, same reason as the vote
    // buttons below - it can contain apostrophes.
    const detailRowCount = hasChecklist ? 8 : 7;
    const checklistRow = hasChecklist
        ? `<tr>
                <td><a href="#" class="checklist-view-link" data-set-name="${escapeHtml(setName)}" onclick="openChecklistModal(this); return false;">Checklist</a></td>
            </tr>`
        : "";

    cardBody.innerHTML += `
        <table class="set-details-table-style">
            <tr>
                <td style="width: 25%; font-size: 20px;">
                    <strong>${setName}</strong>
                </td>
                <td rowspan="${detailRowCount}" class="header-img-cell" style="width: 75%; text-align: center;">
                    <img src="${headerImg}${headerImgName}"
                    class="table-header-img"
                    fetchpriority="high"
                    alt="Vintage hockey cards from the ${year} ${mfg} set"
                    width="620">
                </td>
            </tr>

            <tr>
                <td><strong><i>Set Size:</i></strong> ${size}</td>
            </tr>
            <tr>
                <td><strong><i>Inserts:</i></strong> ${subsets}</td>
            </tr>
            <tr>
                <td><strong><i>Release Year:</i></strong> ${year}</td>
            </tr>
            <tr>
                <td><strong><i>Formats:</i></strong> ${formats}</td>
            </tr>
            <tr>
                <td><strong><i>Manufacturer:</i></strong> ${mfg}</td>
            </tr>
            ${checklistRow}
            <tr>
                <td><strong><i>Hella Rating:</i></strong> ${cleanStars}</td>
            </tr>
        </table>
        <br>
        <table class="set-details-author">
          <tr>
            <td>
                <strong><i>${author} - ${fixDate(date)}</i></strong><br>
                <strong><i>${readingStats.minutes} minute read</i></strong>
            </td>
          </tr>
          <tr>
            <td>${postBody}</td>
          </tr>
        </table>

        <div class="set-footer-table-style">
            <div style="text-align:left" class="caption">
                <strong>and the winners are...</strong>
            </div>
            <div style="text-align:center">
                <img src="${footerImg}${footerImgName}"
                class="table-footer-img"
                loading="lazy"
                alt="Vintage hockey cards from the ${year} ${mfg} set"
                width="890">
            </div>
        </div>

        <br>
        <hr/>

        <!-- Filled in by renderPaginationControls() (below), called right
             after this whole set's HTML is inserted - see renderCardSetPage() -->
        <div id="paginationControls" style="text-align:center; margin:8px 0 20px 0;"></div>

        <div class="vote-widget" id="vote-widget-${voteKey}">
            <button
              class="vote-btn vote-up ${existingVote === 'up' ? 'voted' : ''}"
              data-set-name="${setName}"
              data-year="${year}"
              data-vote-type="up"
              onclick="castVote(this)"
              ${existingVote ? 'disabled' : ''}>
                &#128077; Love this set! <span class="vote-count" id="upvotes-${voteKey}">${upCount}</span>
            </button>
            <button
              class="vote-btn vote-down ${existingVote === 'down' ? 'voted' : ''}"
              data-set-name="${setName}"
              data-year="${year}"
              data-vote-type="down"
              onclick="castVote(this)"
              ${existingVote ? 'disabled' : ''}>
                &#128078; Not a fan... <span class="vote-count" id="downvotes-${voteKey}">${downCount}</span>
            </button>
        </div>
        <br><br>
    `;
}

/**
 * Written entirely by Claude Code :-) It did a good job...
 * Casts a thumbs up/down vote on a card set review.
 * One vote per set per browser, tracked in localStorage (no auth on the
 * public site, so this is a lightweight deterrent, not tamper-proof).
 *
 * Takes the button element itself (rather than setName interpolated into
 * an inline onclick string) since setName can contain characters like
 * apostrophes (e.g. "McDonald's Hockey") that would break a quoted JS
 * string built via template literal.
 */
function castVote(btn) {
  const setName = btn.dataset.setName;
  const year = btn.dataset.year;
  const voteType = btn.dataset.voteType;
  const voteKey = `${setName}-${year}`.replace(/[^a-zA-Z0-9]+/g, "-");

  const votedSets = JSON.parse(localStorage.getItem("votedSets") || "{}");
  if (votedSets[voteKey]) return; // already voted - buttons should already be disabled

  const attr = voteType === "up" ? "upvotes" : "downvotes";
  const countEl = document.getElementById(`${attr}-${voteKey}`);
  const widget = document.getElementById(`vote-widget-${voteKey}`);
  const optimisticCount = countEl ? parseInt(countEl.textContent, 10) + 1 : null;

  // Update the UI immediately (optimistic) rather than waiting on the
  // network round trip, then reconcile/roll back once the response lands
  if (countEl && optimisticCount !== null) {
    countEl.textContent = optimisticCount;
  }
  if (widget) {
    widget.querySelectorAll(".vote-btn").forEach(b => b.disabled = true);
    widget.querySelector(`.vote-${voteType}`)?.classList.add("voted");
  }
  votedSets[voteKey] = voteType;
  localStorage.setItem("votedSets", JSON.stringify(votedSets));

  // The new API used to write votes to the card set in DynamoDB
  const VOTE_API_URL = "https://lo07upgip8.execute-api.us-east-2.amazonaws.com/dev";

  fetch(VOTE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ setName, year: parseInt(year, 10), voteType })
  })
    .then(response => {
      if (!response.ok) throw new Error(`Vote request failed: ${response.status}`);
      return response.json();
    })
    .then(data => {
      // Reconcile with the authoritative server count (in case someone
      // else voted in between the optimistic guess and this response)
      if (countEl && typeof data[attr] === "number") {
        countEl.textContent = data[attr];
      }
    })
    .catch(err => {
      console.log("Vote failed:", err);

      // Roll back the optimistic update so the UI doesn't lie about a vote that was never actually recorded
      if (countEl && optimisticCount !== null) {
        countEl.textContent = optimisticCount - 1;
      }
      if (widget) {
        widget.querySelectorAll(".vote-btn").forEach(b => b.disabled = false);
        widget.querySelector(`.vote-${voteType}`)?.classList.remove("voted");
      }
      delete votedSets[voteKey];
      localStorage.setItem("votedSets", JSON.stringify(votedSets));
    });
}


/**
 * Checklist modal (waxReviews.html "Checklist" link)
 * Fetches every card for a set's setName from getChecklistBySetName
 * (both the main set and any insert sets, undifferentiated in the
 * response - see Lambdas/getChecklistBySetName/index.mjs) and renders
 * them grouped by type (main first, then each insert set by name),
 * sorted within each group by sortIndex - not by raw DynamoDB item
 * order, which doesn't sort numerically or group main-before-insert on
 * its own. See DATA_MODEL.md's Checklists table for why.
 */

const CHECKLIST_API_URL = "https://xbizlwvad5.execute-api.us-east-2.amazonaws.com/dev";

// escapeHtml() now lives in helper.js (shared with playerSearch.js).

// Holds the current set's fetched items so the "Rookies only" checkbox
// (applyChecklistRookieFilter()) can re-render from what's already in
// memory instead of re-querying getChecklistBySetName on every toggle.
let currentChecklistItems = [];

function openChecklistModal(link) {
  const setName = link.dataset.setName;
  const overlay = document.getElementById("checklistModalOverlay");
  const title = document.getElementById("checklistModalTitle");
  const body = document.getElementById("checklistModalBody");
  const rookieFilter = document.getElementById("checklistRookieFilter");

  title.textContent = setName;
  body.innerHTML = "<p>Loading checklist...</p>";
  overlay.style.display = "block";
  // Scopes the @media print rules (styles.css) to hide the rest of the
  // page and print only the modal - without this, printing the page
  // normally (modal closed) would print nothing at all, since those
  // rules would otherwise apply unconditionally.
  document.body.classList.add("checklist-modal-open");
  currentChecklistItems = [];
  // The checkbox is shared across every set's modal - reset it so a
  // filter left on from a previous set doesn't silently carry over.
  if (rookieFilter) rookieFilter.checked = false;

  fetch(`${CHECKLIST_API_URL}?setName=${encodeURIComponent(setName)}`)
    .then(response => {
      if (!response.ok) throw new Error(`Checklist request failed: ${response.status}`);
      return response.json();
    })
    .then(items => {
      currentChecklistItems = items;
      // Route through applyChecklistRookieFilter() rather than
      // rendering `items` directly - the checkbox was reset to
      // unchecked above, but a slow fetch leaves a window where the
      // visitor can toggle it before this resolves, and rendering the
      // raw list here would silently stomp that choice.
      applyChecklistRookieFilter();
    })
    .catch(err => {
      console.log("Checklist fetch failed:", err);
      body.innerHTML = "<p>Couldn't load the checklist right now - please try again.</p>";
    });
}

// "Rookies only" checkbox handler - filters the already-fetched
// currentChecklistItems client-side (whole-word "RC" in notes, same
// rule playerSearch.js uses for its RC styling) and re-renders from
// that in-memory list. No re-fetch/re-query of the Checklists table.
function applyChecklistRookieFilter() {
  const rookieFilter = document.getElementById("checklistRookieFilter");
  const body = document.getElementById("checklistModalBody");
  const isFiltered = rookieFilter && rookieFilter.checked;
  const items = isFiltered
    ? currentChecklistItems.filter(item => item.notes && /\bRC\b/.test(item.notes))
    : currentChecklistItems;

  // renderChecklistGroups()'s own empty-state message ("No checklist
  // data found for this set") would be misleading here - a checklist
  // with zero rookies isn't the same as no checklist existing at all.
  body.innerHTML = (isFiltered && items.length === 0)
    ? "<p>No rookie cards found in this checklist.</p>"
    : renderChecklistGroups(items);
}

function closeChecklistModal() {
  document.getElementById("checklistModalOverlay").style.display = "none";
  document.body.classList.remove("checklist-modal-open");
}

// Clicking the dark backdrop (not the content box itself) also closes it
document.addEventListener("click", (event) => {
  const overlay = document.getElementById("checklistModalOverlay");
  if (overlay && event.target === overlay) {
    closeChecklistModal();
  }
});

// Print-only footer text (hidden on screen - see .checklist-modal-print-footer,
// styles.css). Set once here rather than on every openChecklistModal()
// call since the year won't change mid-session.
(() => {
  const printFooter = document.getElementById("checklistModalPrintFooter");
  if (printFooter) {
    printFooter.textContent = `© ${new Date().getFullYear()} www.mellowjohnny.cc`;
  }
})();

// Groups/sorts/labels a checklist's items - shared by the on-screen
// HTML renderer (renderChecklistGroups(), below) and the PDF exporter
// (exportChecklistPdf(), further down), so both stay in exact sync from
// one source of truth instead of two hand-maintained implementations.
// Returns [{ title, cards }, ...] - already ordered, sorted, and
// labeled; title text is raw/unescaped, since HTML- vs PDF-rendering
// each have their own escaping/encoding needs.
function buildChecklistGroups(items) {
  if (!items || items.length === 0) return [];

  const byGroup = (a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
  const groups = [];

  const mainCards = items.filter(item => item.type !== "insertSet").sort(byGroup);
  if (mainCards.length > 0) {
    groups.push({ title: "Main Set", cards: mainCards });
  }

  const insertGroups = new Map();
  items
    .filter(item => item.type === "insertSet")
    .forEach(item => {
      const name = item.insertSetName || "Insert Set";
      if (!insertGroups.has(name)) insertGroups.set(name, []);
      insertGroups.get(name).push(item);
    });
  insertGroups.forEach(group => group.sort(byGroup));

  // "MEM" (memorabilia/jersey relic cards) in any card's notes within an
  // insert set relabels the whole group "Memorabilia" instead of the
  // generic "Insert Set" suffix - \b keeps this from matching "MEM" as
  // a substring inside some other token.
  const insertEntries = [...insertGroups.entries()].map(([name, cards]) => ({
    name,
    cards,
    isMemorabilia: cards.some(item => item.notes && /\bMEM\b/.test(item.notes))
  }));

  // Memorabilia sections always render after Insert Set sections -
  // Array#sort is stable, so this only moves Memorabilia groups to the
  // end, without disturbing either category's own relative order.
  insertEntries.sort((a, b) => Number(a.isMemorabilia) - Number(b.isMemorabilia));

  insertEntries.forEach(({ name, cards, isMemorabilia }) => {
    groups.push({ title: `${name} - ${isMemorabilia ? "Memorabilia" : "Insert Set"}`, cards });
  });

  return groups;
}

function renderChecklistGroups(items) {
  const groups = buildChecklistGroups(items);
  if (groups.length === 0) {
    return "<p>No checklist data found for this set.</p>";
  }

  let html = `<div class="checklist-modal-cards">`;
  groups.forEach(({ title, cards }) => {
    html += `<div class="checklist-modal-group-title">${escapeHtml(title)}</div>`;
    html += cards.map(renderChecklistCard).join("");
  });
  html += `</div>`;
  return html;
}

function renderChecklistCard(item) {
  const notes = item.notes
    ? ` <span class="checklist-modal-card-notes">${escapeHtml(item.notes)}</span>`
    : "";
  // The checkbox is print-only (hidden on screen, shown in @media print
  // - styles.css) - there's no on-screen "owned" state to track, it's
  // just there so a printed checklist can be checked off with a pen,
  // matching the source PDFs' own convention.
  return `<div class="checklist-modal-card"><span class="checklist-modal-card-checkbox"></span><span class="checklist-modal-card-num">${escapeHtml(item.cardNumberDisplay)}</span> ${escapeHtml(item.playerName)}${notes}</div>`;
}

/**
 * "Download PDF" - a real, downloadable/shareable alternative to the
 * Print button above (window.print()), not a replacement for it. Uses
 * jsPDF + this site's own embedded fonts (see scripts/fonts/), loaded
 * lazily on first use rather than as static <script> tags, since
 * jsPDF + 3 embedded font files are ~1MB combined and most visitors
 * who open a checklist never click Download - no reason to make every
 * waxReviews.html page load pay for that.
 */

let jsPdfLoadPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadJsPdf() {
  if (jsPdfLoadPromise) return jsPdfLoadPromise;

  // The font scripts just define plain EMBEDDED_FONT_* globals (base64
  // data) - no dependency on jsPDF itself, so all four load in
  // parallel rather than a slower sequential chain.
  const sources = [
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js",
    "scripts/fonts/bebasNeue-normal.js",
    "scripts/fonts/sourceSans3-normal.js",
    "scripts/fonts/sourceSans3-bold.js"
  ];

  jsPdfLoadPromise = Promise.all(sources.map(loadScript));

  return jsPdfLoadPromise;
}

function sanitizeFilename(name) {
  return name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "checklist";
}

function exportChecklistPdf() {
  // Mirrors applyChecklistRookieFilter()'s own filtering exactly, so a
  // download taken while "Rookies only" is checked matches what's
  // actually on screen rather than always exporting the full checklist.
  const rookieFilter = document.getElementById("checklistRookieFilter");
  const isFiltered = rookieFilter && rookieFilter.checked;
  const items = isFiltered
    ? currentChecklistItems.filter(item => item.notes && /\bRC\b/.test(item.notes))
    : currentChecklistItems;

  const groups = buildChecklistGroups(items);
  // Nothing to export - the modal body already says so ("No rookie
  // cards found in this checklist"), so the button is a silent no-op
  // rather than popping a second message on top of that.
  if (groups.length === 0) return;

  const setName = document.getElementById("checklistModalTitle").textContent;

  loadJsPdf()
    .then(() => {
      buildChecklistPdfDocument(setName, groups).save(`${sanitizeFilename(setName)}-checklist.pdf`);
    })
    .catch(err => {
      console.log("PDF export failed:", err);
    });
}

// v1: single-column layout with jsPDF's own automatic page breaks,
// rather than reproducing the on-screen/print view's 2-column CSS -
// far less layout math, at the cost of more pages for a big checklist.
function buildChecklistPdfDocument(setName, groups) {
  const doc = new jspdf.jsPDF({ unit: "pt", format: "letter" });

  // Fonts are registered per-instance, not globally - jsPDF's VFS/font
  // registry lives on `this` inside addFileToVFS()/addFont(), so
  // pre-registering against the shared jsPDF.API object (before any
  // instance exists) doesn't carry over to instances created afterward.
  doc.addFileToVFS("BebasNeue-Regular.ttf", EMBEDDED_FONT_BEBAS_NEUE_NORMAL);
  doc.addFont("BebasNeue-Regular.ttf", "BebasNeue", "normal");
  doc.addFileToVFS("SourceSans3-Regular.ttf", EMBEDDED_FONT_SOURCE_SANS3_NORMAL);
  doc.addFont("SourceSans3-Regular.ttf", "SourceSans3", "normal");
  doc.addFileToVFS("SourceSans3-Bold.ttf", EMBEDDED_FONT_SOURCE_SANS3_BOLD);
  doc.addFont("SourceSans3-Bold.ttf", "SourceSans3", "bold");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 54;
  const marginBottom = 54;
  const contentWidth = pageWidth - marginX * 2;
  const checkboxSize = 9;
  const lineHeight = 14;

  // Continuation pages (2+) reserve a short band above marginTop for
  // the running header (set name) drawn in the per-page pass below -
  // page 1 doesn't need this, its content already starts well below
  // marginTop thanks to the masthead + title.
  const contentTop = marginTop + 30;

  // Same 2-column split .checklist-modal-cards uses on screen/print
  // (styles.css:1538-1541's `columns: 3`/print's 2-column override,
  // gap converted from its 32px to ~24pt).
  const columnGap = 24;
  const columnWidth = (contentWidth - columnGap) / 2;
  function columnX(i) {
    return marginX + i * (columnWidth + columnGap);
  }

  let y = marginTop;

  // Draws `text` once per small diagonal offset in outlineColor, then
  // once more in fillColor at the true position - a crude but
  // effective approximation of .checklist-modal-masthead a's 4-way
  // 1px text-shadow "outlined text" look (styles.css:1523-1527).
  // Assumes the desired font/size is already set on `doc`.
  function drawOutlinedText(text, x, textY, outlineColor, fillColor) {
    const offset = 0.75;
    doc.setTextColor(...outlineColor);
    [[-offset, -offset], [offset, -offset], [-offset, offset], [offset, offset]].forEach(([dx, dy]) => {
      doc.text(text, x + dx, textY + dy);
    });
    doc.setTextColor(...fillColor);
    doc.text(text, x, textY);
  }

  // Masthead - matches .checklist-modal-masthead's colored bar +
  // outlined Bebas Neue brand text (styles.css:1510-1528), not just
  // plain text. Drawn once, top of page 1 only - same as Phase 1, and
  // matches real print output (a static block before the column flow
  // doesn't repeat per page in a browser print either).
  const mastheadBarColor = [44, 82, 137]; // --color-masthead-bg
  const mastheadOutlineColor = [2, 70, 153]; // --color-heading-outline
  const mastheadTextColor = [252, 252, 245];
  const mastheadFontSize = 26;
  const mastheadPaddingX = 24;
  const mastheadPaddingY = 12;
  const mastheadBarHeight = mastheadFontSize + mastheadPaddingY * 2;

  doc.setFillColor(...mastheadBarColor);
  doc.rect(marginX, y, contentWidth, mastheadBarHeight, "F");
  doc.setFont("BebasNeue", "normal");
  doc.setFontSize(mastheadFontSize);
  const mastheadBaseline = y + mastheadBarHeight / 2 + mastheadFontSize * 0.35;
  drawOutlinedText("THE HELLA FILES", marginX + mastheadPaddingX, mastheadBaseline, mastheadOutlineColor, mastheadTextColor);
  doc.setTextColor(0);
  y += mastheadBarHeight + 16;

  // Title (setName)
  doc.setFont("SourceSans3", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(setName, contentWidth);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 22 + 22;

  // 2-column layout matching .checklist-modal-group-title's
  // `column-span: all` (styles.css:1544): a title always spans the
  // full content width and breaks the column flow, so everything
  // after it restarts filling left-column-first from that point -
  // independent of how far the other column had previously filled.
  // `bandTop` tracks where the *current* column pair started, so
  // switching from column 0 to column 1 mid-group resumes at the same
  // band rather than the top of the page.
  let currentColumn = 0;
  let bandTop = y;
  // Tracks how far each column has actually been filled within the
  // current band - a full-width title has to clear WHICHEVER column
  // is taller, not just resume from wherever the last-drawn column
  // (often the shorter one, if it filled last) happened to end.
  let columnBottoms = [bandTop, bandTop];

  function resetBand(top) {
    bandTop = top;
    columnBottoms = [top, top];
  }

  // Orphan control: a title with room for itself but only 1-2 card
  // rows before the page/column runs out reads worse than just
  // starting the whole section fresh on the next page - so this
  // checks for the title *plus* a minimum row count, not just the
  // title alone.
  const minRowsAfterTitle = 3;

  function ensureRoomForTitle(titleHeight) {
    const neededHeight = titleHeight + minRowsAfterTitle * lineHeight;
    if (y + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = contentTop;
      resetBand(contentTop);
    }
  }

  function drawRow({ wrapped, rowHeight }) {
    // Print-style checkbox square - same idea as .checklist-modal-card-checkbox
    // in @media print (styles.css), for checking off with a pen.
    const colX = columnX(currentColumn);
    doc.rect(colX, y - checkboxSize + 2, checkboxSize, checkboxSize);
    doc.text(wrapped, colX + checkboxSize + 8, y);
    y += rowHeight;
  }

  groups.forEach(({ title, cards }) => {
    const titleHeight = 26;
    ensureRoomForTitle(titleHeight);

    doc.setFont("SourceSans3", "bold");
    doc.setFontSize(13);
    doc.setTextColor(11, 62, 100); // --color-text-dark
    doc.text(title, marginX, y);
    // Bottom border, matching .checklist-modal-group-title's
    // 2px solid --color-input-border underline.
    doc.setDrawColor(85, 174, 233);
    doc.setLineWidth(1.5);
    doc.line(marginX, y + 6, marginX + contentWidth, y + 6);
    doc.setTextColor(0);
    doc.setDrawColor(0);

    y += titleHeight;
    currentColumn = 0;
    resetBand(y);

    // Pre-measure every row once, up front - both the balance decision
    // below and the actual draw pass reuse the same wrapped text/height.
    doc.setFont("SourceSans3", "normal");
    doc.setFontSize(10.5);
    const availWidth = columnWidth - checkboxSize - 8;
    const rows = cards.map(card => {
      const notesText = card.notes ? `  ${card.notes}` : "";
      const fullLine = `${card.cardNumberDisplay}  ${card.playerName}${notesText}`;
      const wrapped = doc.splitTextToSize(fullLine, availWidth);
      return { wrapped, rowHeight: wrapped.length * lineHeight };
    });
    // Lay the group out one band (both columns' worth of one page) at
    // a time, balancing each band's own rows evenly between the two
    // columns - not just the group as a whole. A large group's *last*
    // band (its final, partial page) has exactly the same
    // "short-ish content, empty column 1" problem a genuinely short
    // group does, so every band gets the same balancing treatment,
    // not just groups small enough to fit in a single one.
    let start = 0;
    while (start < rows.length) {
      const availableColumnHeight = pageHeight - marginBottom - bandTop;
      const bandCapacity = availableColumnHeight * 2;

      let end = start;
      let bandHeight = 0;
      // Always take at least one row, even if it alone exceeds the
      // band's capacity (an implausibly long wrapped note) - avoids
      // looping forever on a row that can never "fit."
      while (end < rows.length && (bandHeight + rows[end].rowHeight <= bandCapacity || end === start)) {
        bandHeight += rows[end].rowHeight;
        end++;
      }

      const band = rows.slice(start, end);
      const target = bandHeight / 2;
      let splitIndex = band.length;
      let running = 0;
      for (let i = 0; i < band.length; i++) {
        running += band[i].rowHeight;
        if (running >= target) {
          splitIndex = i + 1;
          break;
        }
      }

      currentColumn = 0;
      y = bandTop;
      band.slice(0, splitIndex).forEach(drawRow);
      columnBottoms[0] = y;

      currentColumn = 1;
      y = bandTop;
      band.slice(splitIndex).forEach(drawRow);
      columnBottoms[1] = y;

      start = end;

      if (start < rows.length) {
        // More of this group still to place - move to a fresh band.
        doc.addPage();
        y = contentTop;
        resetBand(contentTop);
      }
    }

    // Next group's title must clear whichever column ended up taller,
    // not just wherever the last card happened to land.
    y = Math.max(columnBottoms[0], columnBottoms[1]) + 20;
  });

  // Footer (every page) + running header (every page after the first) -
  // drawn in a pass over the finished document rather than inline
  // during layout, since the final page count isn't known until all
  // groups/cards have been placed.
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (i > 1) {
      // Small running header - just the set name, not the full
      // masthead/title treatment page 1 has, within the contentTop
      // band reserved above.
      doc.setFont("SourceSans3", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(setName, marginX, marginTop);
      doc.setDrawColor(200);
      doc.setLineWidth(0.75);
      doc.line(marginX, marginTop + 6, pageWidth - marginX, marginTop + 6);
      doc.setDrawColor(0);
      doc.setTextColor(0);
    }

    // Footer - same copyright text as #checklistModalPrintFooter, plus
    // a page number on the right, on every page.
    doc.setFont("SourceSans3", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120);
    doc.text(`© ${new Date().getFullYear()} www.mellowjohnny.cc`, marginX, pageHeight - 28);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 28, { align: "right" });
    doc.setTextColor(0);
  }

  return doc;
}

/**
 * Pagination controls
 * This function is used to control how we paginate 
 * Uses the Global variables for "where to start" (currentPage) and "how many to display" (pageSize) 
 * Uses set name for 'next' and 'previous' hyperlinks
 */

function renderPaginationControls() {
  const totalPages = Math.ceil(allCardSets.length / pageSize);
  const controls = document.getElementById("paginationControls");

  // Only years from 1989-90 onward have more than one set reviewed -
  // don't show pagination at all when there's nothing to page through
  if (totalPages <= 1) {
    controls.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize - 1;

  // Determine previous and next set names
  const prevSet = allCardSets[start - 1];
  const nextSet = allCardSets[end + 1];

  const prevLabel = prevSet ? `← Back To: ${prevSet.setName}` : "← Previous";
  const nextLabel = nextSet ? `Next Up: ${nextSet.setName} →` : "Next →";

  const prevLink = currentPage === 1 ? "" : `
    <a
      href="javascript:void(0)"
      onclick="prevPage()"
      class="pagination-link"
    >
      ${prevLabel}
    </a>
  `;

  controls.innerHTML = `
    ${prevLink}

    <span class="pagination-page">Page ${currentPage} of ${totalPages}</span>

    <a 
      href="javascript:void(0)" 
      onclick="nextPage()" 
      class="pagination-link ${currentPage === totalPages ? "disabled" : ""}"
    >
      ${nextLabel}
    </a>
  `;
}

/**
 * Next and Previous functions
 * Functions ensure that when we navigate forward or back, we are always back at the top
 */

function nextPage() {
  const totalPages = Math.ceil(allCardSets.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderCardSetPage();
    document.getElementById("card-intro").scrollIntoView({ behavior: "smooth" });
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderCardSetPage();
    document.getElementById("card-intro").scrollIntoView({ behavior: "smooth" });
  }
}