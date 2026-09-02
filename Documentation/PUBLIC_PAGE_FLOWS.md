# Public Page Flows

Every other doc in this folder is organized **by concern** —
`FRONTEND.md` by script file, `API_ENDPOINTS.md` by endpoint,
`CMS_GUIDE.md` by CMS feature. This doc instead takes each public page
in turn and traces it top to bottom: what loads, what runs
automatically on page load, what each user interaction triggers, which
JS function does the work, and which API endpoint (named exactly as it
appears in `API_ENDPOINTS.md`, so the two docs cross-reference without
duplicating the request/response contract) each one calls. `lockout.html`
isn't covered here — it's a static essay page with no meaningful JS of
its own.

## `index.html`

**What loads**: `scripts/blogs.js`, `scripts/helper.js` (both `defer`),
plus two inline `<script>` blocks — one registering a
`window.addEventListener('load', ...)` handler, one registering
`DOMContentLoaded`. `blogs.js` also runs a block of **top-level code**
the moment it parses (not gated by any event): it calls
`navigator.geolocation.getCurrentPosition()`, and once the browser
supplies coordinates, calls `getWeather(lat, long)` — this hits
OpenWeatherMap directly from the browser (`https://api.openweathermap.org/data/2.5/weather`,
API key hardcoded client-side) and fills in `#weather`. This isn't a
`mellowjohnny.cc` API call and isn't in `API_ENDPOINTS.md`.

**On `DOMContentLoaded`**: `renderBlogIntro('99')` — writes a static,
hardcoded intro paragraph into `#blog-intro`. `blogType "99"` doesn't
match any of the function's specific branches (`"1"`/`"3"`/`"5"`), so
it falls into the generic "the blog with a purpose..." copy.

**On `window load`** (all three run immediately, not sequenced on each
other):
- `fetchBlogs('99')` — calls **Get all blogs of a given type**
  (`?blogType=99`), sorts the result via `getSortOrder("time", "first")`
  (newest first), stores it in the module-level `allBlogs`, resets
  `currentBlogPage = 1`, then calls `renderBlogPage()`, which slices out
  page 1 (`blogPageSize` is `1` — one post shown at a time) and calls
  `displayBlog(postBody, author, time, title, img, imgCap)` for it,
  writing into `#blogsDiv`. `displayBlog()` skips rendering an `<img>`
  tag entirely when `img === "none"`; otherwise it renders one with an
  `onerror` handler that hides both the image and its caption if the
  URL 404s, so a broken/placeholder image fails silently rather than
  showing a broken-image icon. `renderBlogPage()` finishes by calling
  `renderBlogPaginationControls()`, which builds the "← previous post
  title" / "next post title →" links into `#paginationControls`.
- `fetchCopyrightYear()` (`helper.js`) — writes `© <current year>
  Christian Couillard` into `#copy`.
- `fetchNav("index")` (`helper.js`) — looks up `NAV_MAP["index"]`
  (`home, classic, junk, mcd, timmies, tech, mache`) and builds the top
  nav `<table>` into `#global-nav`.

**User interactions**:
- Hamburger icon (mobile) → `toggleMenu()` (`helper.js`) — toggles an
  `.open` class on `#global-nav`. A separate, page-independent
  `document` click listener in `helper.js` closes it again on any click
  outside `#global-nav-placeholder`.
- Pagination links → `nextBlogPage()` / `prevBlogPage()` (`blogs.js`) —
  advance `currentBlogPage`, re-run `renderBlogPage()`, then
  `scrollIntoView()` back to `#blog-intro`. No API call — these just
  re-slice the `allBlogs` array already fetched on load.
- "WLCMS" footer link → a plain `<a href>` straight to the Cognito
  Hosted UI login URL (`rel="nofollow"`) — no JS involved, this is how
  `/cms` access begins.

**Notable**: the Algolia Experiences widget script loads at the very
end of `<body>` (`cdn.jsdelivr.net/npm/@algolia/experiences`) — this is
a third-party site-search widget, unrelated to any function in this
repo's `scripts/*.js`, and isn't traced further here.

## `tech.html`

**What loads**: `scripts/blogs.js`, `scripts/helper.js` (`defer`), plus
inline scripts reading `blogType`/`pageName` from the query string and
registering `DOMContentLoaded`/`window load` handlers — same overall
shape as `index.html`, since this page reuses `blogs.js` entirely
(it's the same "blog stream" pattern, just parameterized by whichever
`blogType` the URL specifies: `1`=Tech, `3`=Mach-E, `4`=SYNC Updates,
`5`=Raspberry Pi). The same top-level geolocation/weather code in
`blogs.js` runs here too, since this page's masthead also has a
`#weather` element.

**On `DOMContentLoaded`**: `renderBlogIntro(blogType)` — same function
as `index.html`. Only `"1"`, `"3"`, and `"5"` have their own copy
(Tech/Mach-E/Raspberry Pi); `blogType "4"` (SYNC Updates) has no
matching branch and falls through to the same generic fallback copy
`"99"` uses on `index.html` — worth knowing if that ever looks wrong on
the SYNC Updates stream specifically.

**On `window load`**:
- `fetchBlogs(blogType)` — identical function/endpoint/pagination
  behavior to `index.html`, just called with whatever `blogType` this
  page instance represents.
- `fetchCopyrightYear()` — same as `index.html`.
- `fetchNav(pageName)` — called with **only** `pageName`, no `blogType`
  argument, even though `fetchNav(pageName, blogType)` accepts a second
  parameter and its own header comment describes building a
  `${pageName}_${blogType}` lookup key when one is supplied. Since
  `blogType` is never passed here, the key is always just `pageName`
  alone — matching `NAV_MAP`'s actual `"tech"` and `"ev"` entries
  directly (there's no `tech_1`-style key in `NAV_MAP` today).

**User interactions**: identical to `index.html` —
`nextBlogPage()`/`prevBlogPage()` for pagination, `toggleMenu()` for
the hamburger.

**Notable**: the page markup includes an empty `<div id="blogTop">`
above `#blogsDiv` that no script in `blogs.js` ever reads from or
writes to — likely a leftover anchor from an earlier version of the
pagination scroll behavior (which now targets `#blog-intro` instead, in
both `nextBlogPage()`/`prevBlogPage()` here and their `waxReviews.html`
counterparts `nextPage()`/`prevPage()`).

## `waxReviews.html`

**What loads**: `scripts/wax.js`, `scripts/helper.js` (both `defer`),
plus several inline `<script>` blocks in `<head>`, in this order:

1. A lockout-year redirect check (see "Notable" below) — runs
   immediately, before any other script.
2. A Google Core Web Vitals preload hint for that year's hero image.
3. `DOMContentLoaded` → `renderCardIntro(pageName)`.
4. `window load` → `fetchNav(pageName)`, `renderSetPicker(year, blogCat,
   pageName)`, `fetchCardSetsByYear(year, sortOrder, blogCat)` (in that
   order), plus a `gtag('config', ...)` call for Analytics.

**On `DOMContentLoaded`**: `renderCardIntro(pageName)` (`wax.js`) —
static intro copy keyed by `pageName` (`classicWax`/`junkWax`/`timmies`/
`mcd`), written into `#card-intro`.

**On `window load`**:
- `fetchNav(pageName)` (`helper.js`) — same mechanism as the blog
  pages, but `waxReviews.html`'s `pageName` values (`junkWax`,
  `classicWax`, `timmies`, `mcd`) each map to a `NAV_MAP` entry that
  additionally includes `"search"` (Player Search), positioned right
  before `"tech"`.
- `renderSetPicker(year, blogCat, pageName)` (`helper.js`) — looks up
  `categoryRanges[blogCat][pageName]` for a `{start, end}` year range,
  then builds one `<div>` per year into `#set-picker` — the current
  year renders as plain text, every other year as a link to
  `waxReviews.html?year=<y>&pageName=<...>&blogCat=<...>`. Purely
  client-side, no API call.
- `fetchCardSetsByYear(year, sortOrder, blogCat)` (`wax.js`) — calls
  **Get card sets by year** (`?year=<y>&blogCat=<c>`), sorts the result
  via `getSortOrder("stars", ...)`, stores it in `allCardSets`, resets
  `currentPage = 1`, and calls `renderCardSetPage()`, which slices out
  one set (`pageSize` is `1`) and calls the big `displayCardSet(...)`
  render function (17 positional params — `postBody`, `year`, `mfg`,
  `size`, `subsets`, `stars`, `formats`, `headerImg`/`headerImgName`,
  `footerImg`/`footerImgName`, `setName`, `author`, `date`, `upvotes`,
  `downvotes`, `hasChecklist`) plus `fetchPageTitle(item.setName)` for
  each. This same function also calls `fetchCopyrightYear()` itself,
  unconditionally, right after kicking off the `fetch()` — so the
  copyright year is set independent of whether the card-set fetch
  ultimately succeeds or fails. `renderCardSetPage()` finishes with
  `renderPaginationControls()`, which only renders anything when there's
  more than one set for that year (most years have exactly one; only
  1989-90 onward have multiple).

**User interactions**:
- Vote buttons (👍/👎, inside `displayCardSet()`'s output) →
  `castVote(this)` (`wax.js`) — reads `setName`/`year`/`voteType` off
  the button's `data-*` attributes (not interpolated into the `onclick`
  string, since `setName` can contain an apostrophe). Updates the
  displayed count and disables both buttons **optimistically**, records
  the vote in `localStorage` (`votedSets`), then calls **Cast a vote on
  a card set**. On success, reconciles the shown count with the
  server's authoritative value; on failure, rolls back the count,
  re-enables the buttons, and removes the `localStorage` entry.
- "Checklist" link (only rendered when `hasChecklist` is true) →
  `openChecklistModal(this)` (`wax.js`) — reads `setName` off
  `data-set-name`, shows `#checklistModalOverlay`, resets the "Rookies
  only" checkbox, then calls **Get checklist by set name**. On success,
  stores the raw items in the module-level `currentChecklistItems` and
  calls `applyChecklistRookieFilter()` (not a direct render — see
  below) rather than rendering the raw response.
- "Rookies only" checkbox (inside the modal) → `applyChecklistRookieFilter()`
  (`wax.js`, `onchange`) — filters the already-fetched
  `currentChecklistItems` client-side (`\bRC\b` whole-word match on
  `notes`) and re-renders via `renderChecklistGroups()` — **no new
  fetch**, purely an in-memory re-render. `renderChecklistGroups()`
  itself groups main-set cards first, then each insert set (sorted
  within every group by `sortIndex`), labels each insert-set group
  `"<name> - Insert Set"` or `"<name> - Memorabilia"` (the latter when
  any card in that group has `"MEM"` in its notes), and always renders
  every Insert Set group before every Memorabilia group regardless of
  fetch order. See `FRONTEND.md`'s "Checklist display" section for the
  full reasoning behind this grouping/labeling.
- Print button (inside the modal) → a plain `onclick="window.print()"`
  — no JS function, relies entirely on the `@media print` CSS rules
  scoped to `body.checklist-modal-open`.
- Close (`×`) → `closeChecklistModal()`; clicking the dark backdrop
  outside the modal content also triggers it, via a `document`-level
  click listener in `wax.js` that checks `event.target === overlay`.
- Set-o-matic year-picker links → plain `<a href>` navigations to a new
  `waxReviews.html?...` URL — no JS beyond the link itself.
- Pagination links (only shown when a year has more than one set) →
  `nextPage()`/`prevPage()` (`wax.js`) — re-slice `allCardSets` and
  `scrollIntoView()` back to `#card-intro`.
- Hamburger icon → `toggleMenu()`, same as the blog pages.

**Notable**: the inline lockout-year redirect checks the URL for
exactly `?year=2004&pageName=mcd&blogCat=mcd` and, if matched,
immediately redirects to `lockout.html?...` with the same params before
any of the rest of the page's scripts run — see `FRONTEND.md`. Also see
`FRONTEND.md`'s "Known limitation" note on `fetchPageTitle()`: it
appends a new `<title>` tag on every render without clearing the
previous one, so paging through multiple sets in the same year
accumulates stale `<title>` tags.

## `playerSearch.html`

**What loads**: `scripts/playerSearch.js`, `scripts/helper.js` (both
`defer`), plus one inline `window load` script.

**On `window load`**:
- `fetchCopyrightYear()` and `fetchNav("playerSearch")` — same
  mechanism as every other page. `"playerSearch"`'s own `NAV_MAP` entry
  deliberately does **not** include `"search"` itself (no self-link).
- If the URL already has a `?q=` param (e.g. a shared/bookmarked search
  link), the input field is pre-filled and `runPlayerSearch(initialQuery)`
  fires immediately, so a shared link shows results without requiring
  the visitor to press Search again.

**User interactions**:
- Submitting the form (`onsubmit`, `event.preventDefault()`) →
  `runPlayerSearch(document.getElementById('playerSearchInput').value)`
  (`playerSearch.js`) — the only trigger; there's no live/debounced
  search-as-you-type, deliberately, since the backing Lambda does a
  full `Scan` per request (see `LAMBDA_FUNCTIONS.md`).
- `runPlayerSearch(query)` — rejects anything under 2 characters with
  an inline message (no API call in that case). Otherwise it updates
  the URL via `history.replaceState` (so the search becomes
  shareable/bookmarkable without a full page reload), shows a
  "Searching..." message, then calls **Search players by name** (`q`
  mode). On success, calls `renderPlayerSearchResults(query, results)`;
  on a non-2xx response or a network error, shows an inline error
  message instead.
- `renderPlayerSearchResults()` groups the response by `setName`. For
  each group whose entry included a `year`/`blogCat` (i.e. a matching
  `Cards` item exists), the heading is built as a link to
  `waxReviews.html?year=...&pageName=...&blogCat=...` — `pageName`
  itself isn't returned by the API, so it's derived client-side via
  `getPageNameForYear(blogCat, year)` (`helper.js`), reusing the same
  `categoryRanges` data `renderSetPicker()` uses. Groups with no
  matching `Cards` item render the set name as plain text instead,
  suffixed "(review not linked yet)". Every card whose `notes` contain
  `RC` as a whole word gets a bold red highlight
  (`.player-search-card-notes-rc`), same rule as the checklist modal's
  "Rookies only" filter.

**Notable**: this page's masthead uses the same self-hosted Bebas Neue
treatment as `waxReviews.html`/`lockout.html` (not the
`index.html`/`tech.html` masthead, and no weather widget) — see
`FRONTEND.md`'s "Typography / fonts" section.
