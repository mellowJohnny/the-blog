/** HELPER FUNCTIONS *** HELPER FUNCTIONS *** HELPER FUNCTIONS *** HELPER FUNCTIONS */

// Generic HTML escaper - shared by wax.js (checklist modal) and
// playerSearch.js (search results), both of which render API-sourced
// text (player names, notes) into innerHTML.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strips HTML tags down to plain text - shared by estimateReadingTime()
// below and by the meta-description/JSON-LD builders in blogs.js/wax.js,
// which need plain text pulled from the same raw HTML postBody.
function stripHtmlTags(htmlString) {
  return htmlString.replace(/<[^>]*>/g, " ");
}

/**
 * Helper function to estimate reading time for blogs OR cardsets
 */

function estimateReadingTime(htmlString) {
  // Strip HTML tags so we only count real words
  const text = stripHtmlTags(htmlString);

  // Split on whitespace and filter out empty entries
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);

  const wordCount = words.length;

  // Average reading speed: 225 words per minute
  const minutes = Math.ceil(wordCount / 225);

  return {
    wordCount,
    minutes
  };
}

// -------------------- SEO / social meta helpers --------------------
// setPageMeta() updates (creating the tag if it doesn't exist yet)
// <title>, meta[name=description], link[rel=canonical], the Open
// Graph og:* meta tags, and the twitter:* meta tags, all from one
// call. Used by every public page so title/description/canonical/OG
// tags stay in sync instead of being hand-rolled per page - static
// pages call it once on load, dynamic pages (waxReviews.html/
// lockout.html's fetchPageTitle(), tech.html's renderBlogIntro()) call
// it again each time new content arrives.
function setPageMeta({ title, description, image, url, type }) {
  if (title) document.title = title;

  function setMeta(selector, attr, content) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      const [, attrName, attrValue] = selector.match(/\[(\w+)=(.+)\]/);
      el.setAttribute(attrName, attrValue.replace(/"/g, ""));
      document.head.appendChild(el);
    }
    el.setAttribute(attr, content);
  }

  if (description) {
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[name="twitter:description"]', "content", description);
  }
  if (title) {
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[name="twitter:title"]', "content", title);
  }
  if (image) {
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[name="twitter:image"]', "content", image);
  }
  if (url) {
    setMeta('meta[property="og:url"]', "content", url);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }
  setMeta('meta[property="og:type"]', "content", type || "website");
  setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
}

// setJsonLd() creates or replaces a <script type="application/ld+json">
// block in <head>, keyed by id so a page can update its own structured
// data as new content loads without piling up duplicate blocks.
function setJsonLd(id, data) {
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}


   // ----------------------------- Date Helper Functions ----------------------------

   /**
    * Formats our Raw Date object coming back from the JSON response
    * @param {*} date 
    * @returns 
    */

   function fixDate(date){
    const d = new Date(date);

    // Get the month as an Integer, convert it to the name
    const monthNum = d.getMonth();
    const month = getMonthName(monthNum);
    // Get the year
    const year = d.getFullYear();

    // Gets the day of the month
    const dateNum = d.getDate();

    return month + " " + dateNum + ", " + year;
}

   /**
 * Helper function to get the month name, given an Integer value
 * @param {*} month 
 * Refactored to us Object Map
 */
function getMonthName(monthNum) {
  const months = {
    0: "January",
    1: "February",
    2: "March",
    3: "April",
    4: "May",
    5: "June",
    6: "July",
    7: "August",
    8: "September",
    9: "October",
    10: "November",
    11: "December"
  };

  return months[monthNum] || null; // or "Invalid month"
}


    //************ Helper Function To Generate Copyright Date for any <div id="copy"> tag ********************
    function fetchCopyrightYear() {
        const copyYear = new Date().getFullYear();
        let copyFooter = document.getElementById("copy");
        copyFooter.innerHTML = `<p>&copy; ${copyYear} Christian Couillard </p>`;
        
    }

// -------------------- Helper Function for Sorting by a Property ----------------------
// Used for both blog posts (sorted by "time") and card set reviews (sorted by "stars")
// When "order" is "first", highest/newest value first
// When "order" is "last", lowest/oldest value first
// Default is highest/newest first

function getSortOrder(property,order) {
    return function(a, b) {
        if (a[property] > b[property]) {
            if (order === "first") {
                return -1;
            }
            else if (order === "last") {
                return 1;
            }
            else {
                return -1;
            }

        } else if (a[property] < b[property]) {
            if (order === "first") {
                return 1;
            }
            else if (order === "last") {
                return -1;
            }
            else {
                return 1;
            }
        }
        else {
            if (a[property] > b[property]) {
                if (order === "first") {
                    return -1;
                }
                else if (order === "last") {
                    return 1;
                }
                else {
                    return -1;
                }
            }
        return 0;
            }
    }
} // end sort function


// -------------------------------- Set-O-Matic Year Picker --------------------------------------
// Used to render all pickers: "Classic", "Junk Wax", "Timmies" and "McDonalds" 
// NEW DYNAMIC version - no more enormous list of if statements
// How this works
// Ranges: You only define the start/end years once per category. No duplication.
// Dynamic labels: The label 1979-80 is generated automatically by combining the year and the next year.
// Highlighting: The selected year is shown as plain text, others as links.
// Scalability: Adding new years is as simple as extending the range.
// This way, instead of maintaining hundreds of lines of repetitive HTML, you only maintain the ranges. Much easier to extend and debug.

// Category + pageName specific ranges - shared by renderSetPicker() (the
// year-picker widget) and getPageNameForYear() below (used by
// playerSearch.js to build a working link back to a matched set's
// review - Checklists/Cards items don't store pageName anywhere, it's
// purely a UI/nav grouping concept derived from blogCat + year).
const categoryRanges = {
  reg: {
    classicWax: { start: 1981, end: 1986, className: "junk-set-nav-td", pageName: "classicWax" },
    junkWax:    { start: 1987, end: 1993, className: "junk-set-nav-td", pageName: "junkWax" }
  },
  mcd: {
    mcd: { start: 1991, end: 2006, className: "junk-set-nav-td", pageName: "mcd" }
  },
  tims: {
    timmies: { start: 2020, end: 2025, className: "junk-set-nav-td", pageName: "timmies" }
  }
};

// Given a blogCat + year, finds which pageName range it falls in (see
// categoryRanges above). Returns null if there's no matching range (a
// year/category combination outside every configured range).
function getPageNameForYear(blogCat, year) {
  const catConfig = categoryRanges[blogCat];
  if (!catConfig) return null;

  const y = parseInt(year, 10);
  for (const key in catConfig) {
    const range = catConfig[key];
    if (y >= range.start && y <= range.end) return range.pageName;
  }
  return null;
}

function renderSetPicker(year, blogCat, pageName) {
  const setPicker = document.getElementById("set-picker");

  const catConfig = categoryRanges[blogCat];
  if (!catConfig) {
    setPicker.innerHTML = `<p>No template found for category "${blogCat}"</p>`;
    return;
  }

  const range = catConfig[pageName];
  if (!range) {
    setPicker.innerHTML = `<p>No range found for category "${blogCat}" and page "${pageName}"</p>`;
    return;
  }

  const totalYears = range.end - range.start + 1;
  let cells = "";

  for (let i = 0; i < totalYears; i++) {
    const y = range.start + i;
    const label = `${y}-${(y + 1).toString().slice(-2)}`;

    cells += (y === parseInt(year))
      ? `<div class="${range.className}">${label}</div>`
      : `<div class="${range.className}">
           <a href="/waxReviews.html?year=${y}&pageName=${range.pageName}&blogCat=${blogCat}">
             ${label}
           </a>
         </div>`;
  }

  // .card-set-nav is a flex-wrap container (styles.css), so it wraps onto
  // as many lines as needed at any viewport width and any total year
  // count, with no split point to maintain as ranges grow.
  setPicker.innerHTML = `
    <div class="card-set-nav">${cells}</div>
  `;
}





/** Helper Function to dynamically fetch ------------ TOP LEVEL NAVIGATION -----------------------
 * Refactored to use Object Maps and dynamic tables
 * Adding a new page = add one line to const NAV_MAP
 * Adding a new menu item = add one entry to const NAV_ITEMS
*/

// Step 1: Define the navigation items as data
const NAV_ITEMS = {
  home: { label: "Home", href: "/index.html" },
  junk: { label: "90s Junk Wax", href: "/waxReviews.html?year=1987&pageName=junkWax&blogCat=reg" },
  classic: { label: "Classic 80s Sets", href: "/waxReviews.html?year=1981&pageName=classicWax&blogCat=reg" },
  timmies: { label: "Tim Hortons Hockey", href: "/waxReviews.html?year=2020&pageName=timmies&blogCat=tims" },
  mcd: { label: "McDonald's Hockey", href: "/waxReviews.html?year=1991&pageName=mcd&blogCat=mcd" },
  tech: { label: "Tech", href: "/tech.html?blogType=1&pageName=tech" },
  mache: { label: "Mustang Mach-E", href: "/tech.html?blogType=3&pageName=ev" },
  search: { label: "Player Search", href: "/playerSearch.html" }
};

// Step 2: Define which pages show which items
// The key is the page name, the values are the links to display, in the order they appear
const NAV_MAP = {
  index: ["home", "classic", "junk", "mcd", "timmies", "tech", "mache"],
  tech: ["home", "classic", "junk", "mcd", "timmies", "mache"],
  ev: ["home", "classic", "junk", "mcd", "timmies","tech"],
  // "search" (Player Search) only appears on the waxReviews.html-backed
  // pages below (junkWax, classicWax, timmies, mcd) - per the site
  // owner, not site-wide - and always immediately before "tech".
  junkWax: ["home", "classic", "mcd", "timmies", "search", "tech", "mache"],
  classicWax: ["home", "junk", "mcd", "timmies", "search", "tech", "mache"],
  timmies: ["home", "classic", "junk", "mcd", "search", "tech", "mache"],
  mcd: ["home", "classic", "junk", "timmies", "search", "tech", "mache"],
  playerSearch: ["home", "classic", "junk", "mcd", "timmies", "tech", "mache"]
};

// Step 3: Build a dynamic table generator
function buildNavCell(item) {
  return `<td class="nav-td"><a href="${item.href}">${item.label}</a></td>`;
}

// The new, dynamic fetchNav()
function fetchNav(pageName, blogType) {
  const nav = document.getElementById("global-nav");

  // Determine key (e.g. "tech_1", "tech_3")
  const key = blogType ? `${pageName}_${blogType}` : pageName;

  const items = NAV_MAP[key];
  if (!items) return;

  
  let cells = "";

  items.forEach(id => {
      cells += buildNavCell(NAV_ITEMS[id]);
  });

  nav.innerHTML = `
    <table class="top-nav nav-table">
      <tr>${cells}</tr>
    </table>
  `;
}

// Hamberger Menu Toggle
function toggleMenu() {
  const nav = document.getElementById("global-nav");
  nav.classList.toggle("open");
}

// Close the mobile menu when tapping/clicking anywhere outside it (the
// hamburger icon itself is inside #global-nav-placeholder too, so this
// doesn't fight with toggleMenu() re-opening it on the same click)
document.addEventListener("click", (event) => {
  const navPlaceholder = document.getElementById("global-nav-placeholder");
  const nav = document.getElementById("global-nav");
  if (!navPlaceholder || !nav) return;

  if (nav.classList.contains("open") && !navPlaceholder.contains(event.target)) {
    nav.classList.remove("open");
  }
});



// --------------- Cookie! --------------------------

// cmsAlert(message) - a styled replacement for the native alert() used
// throughout the CMS (cmsBlog.js, cmsCardSet.js, checklistUpload.js,
// adminSMS.js). Native
// alert()/confirm() dialogs are synchronous - they block the whole page
// until dismissed, which every existing call site relies on for
// "show a message, then redirect/focus" sequencing. cmsAlert() can't
// block the same way (no JS API does that outside alert() itself), so
// it returns a Promise that resolves on dismiss instead - callers
// `await` it and get the same effective ordering.
//
// Markup is injected into the DOM lazily on first call rather than
// living in every CMS page's HTML. Visually matches the checklist
// modal on waxReviews.html (masthead-blue header, white box,
// box-shadow overlay) - see styles.css's .cms-alert-* rules - for one
// consistent "this site's modal" look between the public and CMS
// sides.
//
// See cmsConfirm() below for the equivalent replacement of confirm().
function cmsAlert(message) {
  return new Promise((resolve) => {
    let overlay = document.getElementById("cmsAlertOverlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "cmsAlertOverlay";
      overlay.className = "cms-alert-overlay";
      overlay.innerHTML = `
        <div class="cms-alert-content">
          <div class="cms-alert-header">cardStack CMS</div>
          <p class="cms-alert-message" id="cmsAlertMessage"></p>
          <button type="button" class="cms-alert-ok-btn" id="cmsAlertOkBtn">OK</button>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const messageEl = document.getElementById("cmsAlertMessage");
    const okBtn = document.getElementById("cmsAlertOkBtn");
    messageEl.textContent = message;
    overlay.style.display = "flex";
    okBtn.focus();

    function close() {
      overlay.style.display = "none";
      okBtn.removeEventListener("click", onDismiss);
      overlay.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeydown);
      resolve();
    }
    function onDismiss() {
      close();
    }
    function onBackdropClick(event) {
      if (event.target === overlay) close();
    }
    function onKeydown(event) {
      if (event.key === "Escape" || event.key === "Enter") close();
    }

    okBtn.addEventListener("click", onDismiss);
    overlay.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onKeydown);
  });
}

// cmsConfirm(message) - a styled replacement for the native confirm()
// used for the CMS's destructive/serious actions (delete card set,
// delete blog post, live-mode SMS send, bulk subscriber replace).
// Same async-Promise approach as cmsAlert() above (see its comment for
// why), but resolves a boolean instead of nothing - true only if
// Confirm is clicked. Styled with a red header instead of cmsAlert()'s
// blue, to visually flag these as the more serious action - separate
// overlay/element IDs from cmsAlert() so the two never share state.
//
// Escape and a backdrop click both resolve false (cancel) - the safe
// default. Unlike cmsAlert(), Enter is deliberately NOT bound to
// anything here - accidentally confirming a "this cannot be undone"
// delete via a stray Enter keypress is exactly the kind of mistake
// this modal should make harder, not easier, so confirming requires an
// explicit click on the Confirm button.
function cmsConfirm(message) {
  return new Promise((resolve) => {
    let overlay = document.getElementById("cmsConfirmOverlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "cmsConfirmOverlay";
      overlay.className = "cms-alert-overlay";
      overlay.innerHTML = `
        <div class="cms-alert-content">
          <div class="cms-confirm-header">cardStack CMS</div>
          <p class="cms-alert-message" id="cmsConfirmMessage"></p>
          <div class="cms-confirm-btn-row">
            <button type="button" class="cms-confirm-cancel-btn" id="cmsConfirmCancelBtn">Cancel</button>
            <button type="button" class="cms-confirm-confirm-btn" id="cmsConfirmConfirmBtn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const messageEl = document.getElementById("cmsConfirmMessage");
    const cancelBtn = document.getElementById("cmsConfirmCancelBtn");
    const confirmBtn = document.getElementById("cmsConfirmConfirmBtn");
    messageEl.textContent = message;
    overlay.style.display = "flex";
    cancelBtn.focus();

    function close(result) {
      overlay.style.display = "none";
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      overlay.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    }
    function onCancel() {
      close(false);
    }
    function onConfirm() {
      close(true);
    }
    function onBackdropClick(event) {
      if (event.target === overlay) close(false);
    }
    function onKeydown(event) {
      if (event.key === "Escape") close(false);
    }

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    overlay.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onKeydown);
  });
}

function setCookie(cookieName, cookieValue, exp) {
    const d = new Date();
    d.setTime(d.getTime() + (exp*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
  }
