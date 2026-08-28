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

function renderChecklistGroups(items) {
  if (!items || items.length === 0) {
    return "<p>No checklist data found for this set.</p>";
  }

  const byGroup = (a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0);

  const mainCards = items.filter(item => item.type !== "insertSet").sort(byGroup);

  const insertGroups = new Map();
  items
    .filter(item => item.type === "insertSet")
    .forEach(item => {
      const name = item.insertSetName || "Insert Set";
      if (!insertGroups.has(name)) insertGroups.set(name, []);
      insertGroups.get(name).push(item);
    });
  insertGroups.forEach(group => group.sort(byGroup));

  let html = `<div class="checklist-modal-cards">`;

  if (mainCards.length > 0) {
    html += `<div class="checklist-modal-group-title">Main Set</div>`;
    html += mainCards.map(renderChecklistCard).join("");
  }

  insertGroups.forEach((group, name) => {
    html += `<div class="checklist-modal-group-title">${escapeHtml(name)}</div>`;
    html += group.map(renderChecklistCard).join("");
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