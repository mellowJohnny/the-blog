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
 * .img-wrap-sm/.img-wrap-md images opt into smaller mobile sizing -
 * reads each image's actual width/height (inline style preferred over
 * a possibly-stale attribute) into --wrap-w/--wrap-h for styles.css.
 */
function applyImgWrapSmSizing() {
  document.querySelectorAll("img.img-wrap-sm, img.img-wrap-md").forEach(img => {
    const w = parseFloat(img.style.width) || parseFloat(img.getAttribute("width"));
    const h = parseFloat(img.style.height) || parseFloat(img.getAttribute("height"));
    if (w) img.style.setProperty("--wrap-w", `${w}px`);
    if (h) img.style.setProperty("--wrap-h", `${h}px`);
  });
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

// SEO / social meta helpers - setPageMeta() sets <title>, description,
// canonical, OG, and twitter:* tags in one call. Static pages call it
// once; dynamic pages re-call it whenever new content arrives.
function setPageMeta({ title, description, image, url, type, keywords }) {
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
  if (keywords) {
    setMeta('meta[name="keywords"]', "content", keywords);
  }
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

// Sorting helper for blog posts ("time") and card set reviews
// ("stars") - order "first" = highest/newest first, "last" = oldest
// first (also the default).

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




// Primary/tertiary hex + real fan cheer per team (verified current for
// 2026-27, 32 teams) - feeds the masthead gradient/label. A few teams
// share primary/tertiary (genuinely two-color+white), not a data error.
const NHL_TEAM_COLORS = [
  { name: "Anaheim Ducks", cheer: "Let's Go Ducks!", primary: "#CF4520", tertiary: "#89734C" },
  { name: "Boston Bruins", cheer: "Let's Go Bruins!", primary: "#010101", tertiary: "#FFB81C" },
  { name: "Buffalo Sabres", cheer: "Let's go Buffalo!", primary: "#003087", tertiary: "#FFB81C" },
  { name: "Calgary Flames", cheer: "Go Flames Go!", primary: "#C8102E", tertiary: "#F1BE48" },
  { name: "Carolina Hurricanes", cheer: "Let's Go 'Canes!", primary: "#000000", tertiary: "#CC0000" },
  { name: "Chicago Blackhawks", cheer: "Let's Go Hawks!", primary: "#CE1126", tertiary: "#010101" },
  { name: "Colorado Avalanche", cheer: "Let's Go Avs!", primary: "#8A2432", tertiary: "#236093" },
  { name: "Columbus Blue Jackets", cheer: "Let's Go Jackets!", primary: "#041E42", tertiary: "#C8102E" },
  { name: "Dallas Stars", cheer: "Let's Go Stars!", primary: "#00823E", tertiary: "#000000" },
  { name: "Detroit Red Wings", cheer: "Let's Go Red Wings!", primary: "#C8102E", tertiary: "#C8102E" },
  { name: "Edmonton Oilers", cheer: "Let's Go Oilers!", primary: "#00205B", tertiary: "#D14520" },
  { name: "Florida Panthers", cheer: "Go Cats Go!", primary: "#C8102E", tertiary: "#041E42" },
  { name: "Los Angeles Kings", cheer: "Go Kings Go!", primary: "#010101", tertiary: "#A2AAAD" },
  { name: "Minnesota Wild", cheer: "Let's Go Wild!", primary: "#0E4431", tertiary: "#AC1A2E" },
  { name: "Montreal Canadiens", cheer: "Go Habs Go!", primary: "#A6192E", tertiary: "#001E62" },
  { name: "Nashville Predators", cheer: "Goalie, you suck!", primary: "#FFB81C", tertiary: "#041E42" },
  { name: "New Jersey Devils", cheer: "Let's Go Devils!", primary: "#CC0000", tertiary: "#000000" },
  { name: "New York Islanders", cheer: "Yes!", primary: "#003087", tertiary: "#FC4C02" },
  { name: "New York Rangers", cheer: "Let's Go Rangers!", primary: "#154B94", tertiary: "#C32032" },
  { name: "Ottawa Senators", cheer: "Let's Go Sens!", primary: "#010101", tertiary: "#C8102E" },
  { name: "Philadelphia Flyers", cheer: "Let's Go Flyers!", primary: "#D24303", tertiary: "#000000" },
  { name: "Pittsburgh Penguins", cheer: "Let's Go Pens!", primary: "#000000", tertiary: "#FFB81C" },
  { name: "San Jose Sharks", cheer: "Let's Go Shar-arks!", primary: "#00778B", tertiary: "#010101" },
  { name: "Seattle Kraken", cheer: "Let's Go Kraken!", primary: "#001425", tertiary: "#96D8D8" },
  { name: "St. Louis Blues", cheer: "Let's Go Blues!", primary: "#006AC6", tertiary: "#FFB81C" },
  { name: "Tampa Bay Lightning", cheer: "Let's Go Bolts!", primary: "#00205B", tertiary: "#00205B" },
  { name: "Toronto Maple Leafs", cheer: "Go Leafs Go!", primary: "#00205B", tertiary: "#00205B" },
  { name: "Utah Mammoth", cheer: "Let's Go Mammoth!", primary: "#010101", tertiary: "#7AB2E0" },
  { name: "Vancouver Canucks", cheer: "Go Canucks Go!", primary: "#00205B", tertiary: "#046A38" },
  { name: "Vegas Golden Knights", cheer: "Let's Go Knights!", primary: "#B9975B", tertiary: "#333F48" },
  { name: "Washington Capitals", cheer: "Let's Go Caps!", primary: "#C8102E", tertiary: "#041E42" },
  { name: "Winnipeg Jets", cheer: "Let's Go Jets!", primary: "#041E42", tertiary: "#004A98" }
];

// Called on load by every page with the wax-reviews-mast-table masthead
// - picks one team at random and sets its colors as CSS custom
// properties, which the masthead's gradient (styles.css) reads.
function applyRandomMastheadTeam() {
  const mast = document.querySelector(".wax-reviews-mast-table");
  if (!mast) return;

  const team = NHL_TEAM_COLORS[Math.floor(Math.random() * NHL_TEAM_COLORS.length)];
  mast.style.setProperty("--team-primary", team.primary);
  mast.style.setProperty("--team-tertiary", team.tertiary);

  // Two-color (+white) teams (primary === tertiary) get a simpler
  // solid-background design with one centered white stripe instead of
  // the 5-band gradient - see .masthead-two-color in styles.css.
  mast.classList.toggle("masthead-two-color", team.primary === team.tertiary);

  // Small cheer label (bottom-right) lets the owner visually confirm
  // which team is showing. Created once and reused, rather than
  // added statically to each of the 4 pages' markup.
  let label = mast.querySelector(".masthead-team-label");
  if (!label) {
    label = document.createElement("span");
    label.className = "masthead-team-label";
    mast.appendChild(label);
  }
  label.textContent = team.cheer;
}

// Set-O-Matic Year Picker - renders the Classic/Junk Wax/Timmies/
// McDonald's year pickers from just a start/end range per category,
// generating labels and link/plain-text highlighting dynamically.

// Category + pageName ranges - shared by renderSetPicker() and
// getPageNameForYear() (used by playerSearch.js for a matched set's
// link back). pageName is a UI/nav concept, not a stored field.
const categoryRanges = {
  reg: {
    classicWax: { start: 1981, end: 1986, className: "junk-set-nav-td", pageName: "classicWax" },
    junkWax:    { start: 1987, end: 1993, className: "junk-set-nav-td", pageName: "junkWax" }
  },
  mcd: {
    mcd: { start: 1991, end: 2007, className: "junk-set-nav-td", pageName: "mcd" }
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





/** Top-level navigation, built from Object Maps rather than hardcoded
 * tables - add a page via NAV_MAP, a menu item via NAV_ITEMS.
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
  playerSearch: ["home", "classic", "junk", "mcd", "timmies", "tech", "mache"],
  // theJunkWaxYears.html is a static essay, not one of the junkWax/
  // classicWax/mcd/timmies review pages itself, so - like playerSearch -
  // nothing needs to self-exclude here; "junk" stays in the list.
  junkWaxYears: ["home", "classic", "junk", "mcd", "timmies", "search", "tech", "mache"]
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

// cmsAlert(message) - styled alert() replacement used across the CMS.
// Returns a Promise resolved on dismiss (callers `await` it) since it
// can't block synchronously like real alert(). See cmsConfirm() below.
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

// cmsConfirm(message) - like cmsAlert() but for destructive actions,
// resolving true only on an explicit Confirm click. Escape/backdrop
// resolve false; Enter is deliberately NOT bound, unlike cmsAlert().
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

/**
 * Click-toggle flyouts for the wlcms.html top nav dropdowns (not
 * CSS :hover) so this behaves the same on touch and desktop. Scoped to
 * #wlcms-top-nav only. Call once on page load.
 */
function initWlcmsNav() {
  const nav = document.getElementById('wlcms-top-nav');
  if (!nav) return;

  function closeAll(except) {
    nav.querySelectorAll('.cms-nav-item.open').forEach((item) => {
      if (item === except) return;
      item.classList.remove('open');
      const btn = item.querySelector('.cms-nav-parent');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  nav.querySelectorAll('.cms-nav-parent').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.cms-nav-item');
      const isOpen = item.classList.contains('open');
      closeAll();
      item.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
}
