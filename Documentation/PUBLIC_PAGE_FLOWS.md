# Public Page Flows

Every other doc in this space is organized **by concern** — Frontend by
script file, API Endpoints by endpoint, CMS Guide by CMS feature. This
page instead takes each public page in turn and explains it as a
narrative: what each page is actually trying to accomplish when it
loads, why its calls happen in the order/grouping they do, and — for
anything that reaches the backend — the full chain from the JS function
that triggers it, through the API endpoint (named exactly as it appears
on the API Endpoints page, so the two pages cross-reference without
duplicating the request/response contract), down to the Lambda that
serves it and the DynamoDB table/index it actually reads or writes.
`lockout.html` isn't covered here — it's a static essay page (the
2004-05 NHL lockout, themed to match `waxReviews.html`) with no
meaningful JS of its own.

## `index.html`

This is the site's front door — its whole job on load is to assemble
three independent pieces of chrome/content around the static HTML
shell that's already there: the blog stream itself, the site-wide nav,
and the footer. None of the three depends on the others, so all three
fire in parallel off the same `window load` event rather than being
sequenced.

**What loads**: `scripts/blogs.js`, `scripts/helper.js` (both `defer`),
plus two inline `<script>` blocks — one registering the `window load`
handler described below, one registering `DOMContentLoaded`. `blogs.js`
also runs a block of **top-level code** the instant it parses (not
gated by any event, and unrelated to the blog content itself): it asks
the browser for the visitor's location via
`navigator.geolocation.getCurrentPosition()`, and once it has
coordinates, calls `getWeather(lat, long)`, which hits OpenWeatherMap
directly from the browser (`https://api.openweathermap.org/data/2.5/weather`,
API key hardcoded client-side) to fill in the `#weather` widget next to
the masthead. This is a third-party call unrelated to this site's own
backend — it isn't on the API Endpoints page and has nothing to do with
the Lambda/DynamoDB stack the rest of this doc traces.

**On `DOMContentLoaded`**: `renderBlogIntro('99')` writes a static,
hardcoded intro paragraph into `#blog-intro` — purely cosmetic framing
text above the blog stream, no backend call. `blogType "99"` (the
special "home page" type) doesn't match any of the function's
type-specific branches (`"1"`/`"3"`/`"5"`), so it falls through to the
generic "the blog with a purpose..." copy.

**On `window load`** (all three fire independently, not sequenced on
each other):
- `fetchBlogs('99')` is the call that actually populates the page with
  content: it pulls every blog post tagged `blogType: 99` (the ones
  meant to show on the home page specifically, as opposed to a
  category-specific stream like `tech.html`'s) from the `Blogs` table
  in DynamoDB, via **Get all blogs of a given type** (`?blogType=99`),
  fronted by the `getBlogs` Lambda (`Lambdas/getBlogs/`) — it reads via
  a `QueryCommand` on `blogType` (the table's partition key), filtered
  to `published = true`, and returns a plain JSON array. Once
  the result is back, `fetchBlogs()` sorts it via
  `getSortOrder("time", "first")` (newest first), stores it in the
  module-level `allBlogs`, resets `currentBlogPage = 1`, then calls
  `renderBlogPage()`, which slices out just page 1 (`blogPageSize` is
  `1` — the site shows one post at a time, not a feed) and calls
  `displayBlog(postBody, author, time, title, img, imgCap)` to actually
  write it into `#blogsDiv`. `displayBlog()` skips rendering an `<img>`
  tag entirely when `img === "none"`, and otherwise renders one with an
  `onerror` handler that hides both the image and its caption if the
  URL 404s — so a broken or placeholder image fails silently instead of
  showing a broken-image icon. `renderBlogPage()` finishes by calling
  `renderBlogPaginationControls()`, which builds the "← previous post
  title" / "next post title →" links into `#paginationControls`, so a
  visitor can step through older/newer posts without a full reload.
- `fetchCopyrightYear()` (`helper.js`) — a small, unrelated piece of
  chrome: writes `© <current year> Christian Couillard` into `#copy`.
- `fetchNav("index")` (`helper.js`) — builds the top nav bar itself
  (the links to the blog categories, card review sections, tech blog,
  etc.), by looking up `NAV_MAP["index"]` (`home, classic, junk, mcd,
  timmies, tech, mache`) and rendering it as a `<table>` into
  `#global-nav`. Purely client-side — the nav structure is a hardcoded
  map in `helper.js`, not backend-driven, since the site's page/category
  set changes rarely enough that there's no value in making it dynamic.

**User interactions**:
- Hamburger icon (mobile) → `toggleMenu()` (`helper.js`) — toggles an
  `.open` class on `#global-nav` to slide the nav in/out on narrow
  screens. A separate, page-independent `document` click listener in
  `helper.js` closes it again on any click outside
  `#global-nav-placeholder`.
- Pagination links → `nextBlogPage()` / `prevBlogPage()` (`blogs.js`) —
  advance `currentBlogPage`, re-run `renderBlogPage()`, then
  `scrollIntoView()` back to `#blog-intro`. No new API call — these
  just re-slice the `allBlogs` array already fetched on load, since the
  whole type's worth of posts was pulled in one shot up front.
- "WLCMS" footer link → a plain `<a href>` straight to the Cognito
  Hosted UI login URL (`rel="nofollow"`) — no JS involved, this is how
  `/cms` access begins for a logged-out visitor.

## `tech.html`

This page exists to reuse `index.html`'s exact "blog stream" machinery
for a specific category instead of the home-page mix — it's the same
`blogs.js` pattern, just parameterized by whichever `blogType` the URL
specifies (`1`=Tech, `3`=Mach-E, `4`=SYNC Updates, `5`=Raspberry Pi),
rather than a separate page/script per category.

**What loads**: `scripts/blogs.js`, `scripts/helper.js` (`defer`), plus
inline scripts reading `blogType`/`pageName` from the query string and
registering the same `DOMContentLoaded`/`window load` handlers as
`index.html`. The same top-level geolocation/weather code in `blogs.js`
runs here too, since this page's masthead also has a `#weather`
element — see `index.html`'s section above for that mechanism.

**On `DOMContentLoaded`**: `renderBlogIntro(blogType)` — same function
as `index.html`, but this time `"1"`, `"3"`, and `"5"` each have their
own tailored intro copy (Tech/Mach-E/Raspberry Pi respectively).
`blogType "4"` (SYNC Updates) has no matching branch, so it falls
through to the same generic fallback copy `"99"` uses on `index.html` —
worth knowing if that intro ever looks wrong specifically on the SYNC
Updates stream.

**On `window load`**:
- `fetchBlogs(blogType)` is the content-loading call, doing exactly
  what `index.html`'s does — same `Blogs` table, same `getBlogs` Lambda,
  same **Get all blogs of a given type** endpoint, same pagination
  behavior — just filtered to whichever `blogType` this page instance
  represents instead of `99`.
- `fetchCopyrightYear()` — same as `index.html`.
- `fetchNav(pageName)` — called with **only** `pageName`, no `blogType`
  argument, even though `fetchNav(pageName, blogType)` accepts a second
  parameter and its own header comment describes building a
  `${pageName}_${blogType}` lookup key when one is supplied. Since
  `blogType` is never passed here, the key resolves to just `pageName`
  alone — which happens to match `NAV_MAP`'s actual `"tech"` and `"ev"`
  entries directly (there's no `tech_1`-style key in `NAV_MAP` today),
  so the nav still builds correctly, just not via the more specific
  lookup path the function was apparently designed to support.

**User interactions**: identical to `index.html` — `nextBlogPage()`/
`prevBlogPage()` for pagination, `toggleMenu()` for the hamburger, same
reasoning as above (re-slicing an already-fetched array, no new calls).

**Notable**: the page markup includes an empty `<div id="blogTop">`
above `#blogsDiv` that no script in `blogs.js` ever reads from or
writes to — likely a leftover anchor from an earlier version of the
pagination scroll behavior (which now targets `#blog-intro` instead, in
both `nextBlogPage()`/`prevBlogPage()` here and their `waxReviews.html`
counterparts `nextPage()`/`prevPage()`).

## `waxReviews.html`

This is the card-set-review equivalent of the blog pages above, but
its job on load is a bit bigger: it has to build both the top nav *and*
a second, page-specific navigation element (the "set-o-matic" year
picker), then load the actual review content for whichever
year/category the URL specifies. Those three things — nav, year picker,
review content — are independent of each other and all fire off the
same `window load` event, same pattern as the blog pages.

**What loads**: `scripts/wax.js`, `scripts/helper.js` (both `defer`),
plus several inline `<script>` blocks in `<head>`, in this order:

1. A lockout-year redirect check (see "Notable" below) — runs
   immediately, before any other script, since it may bail out of
   rendering this page entirely.
2. A Google Core Web Vitals preload hint for that year's hero image.
3. `DOMContentLoaded` → `renderCardIntro(pageName)`.
4. `window load` → `fetchNav(pageName)`, `renderSetPicker(year, blogCat,
   pageName)`, `fetchCardSetsByYear(year, sortOrder, blogCat)` (in that
   order), plus a `gtag('config', ...)` call for Analytics.

**On `DOMContentLoaded`**: `renderCardIntro(pageName)` (`wax.js`) —
static intro copy keyed by `pageName` (`classicWax`/`junkWax`/`timmies`/
`mcd`), written into `#card-intro`. Same purely-cosmetic role as
`renderBlogIntro()` on the blog pages — sets the tone for the section
before any real content has loaded.

**On `window load`**: these three calls together finish assembling
everything the visitor can see or navigate to on this page.
- `fetchNav(pageName)` (`helper.js`) — builds the top nav bar, same
  mechanism as the blog pages, but `waxReviews.html`'s `pageName`
  values (`junkWax`, `classicWax`, `timmies`, `mcd`) each map to a
  `NAV_MAP` entry that additionally includes `"search"` (Player
  Search), positioned right before `"tech"` — since Player Search only
  makes sense as a jumping-off point from a card-review context.
- `renderSetPicker(year, blogCat, pageName)` (`helper.js`) — builds the
  "set-o-matic" year picker: the row letting a visitor jump directly to
  another year's review within the same category, without going back
  through the nav. It looks up `categoryRanges[blogCat][pageName]` for
  a hardcoded `{start, end}` year range, then builds one `<div>` per
  year into `#set-picker` — the current year renders as plain text,
  every other year as a link to
  `waxReviews.html?year=<y>&pageName=<...>&blogCat=<...>`. Purely
  client-side, no API call — like the main nav, the set of valid years
  per category is a hardcoded map, not something that needs a backend
  round-trip to determine.
- `fetchCardSetsByYear(year, sortOrder, blogCat)` (`wax.js`) is the
  call that actually loads the review itself: it's the main function
  that pulls in every card set matching this year and category from
  the `Cards` table in DynamoDB, via **Get card sets by year**
  (`?year=<y>&blogCat=<c>`), which is fronted by the `getCardSetsByYear`
  Lambda (`Lambdas/getCardSetsByYear/`) — that Lambda queries the
  `blogCat-year-index` GSI, filtered to `blogStatus = "OK"`, so a
  staged/unpublished set is never returned here even if it otherwise
  matches. Once the result is back, `fetchCardSetsByYear()` sorts it via
  `getSortOrder("stars", ...)`, stores it in `allCardSets`, resets
  `currentPage = 1`, and calls `renderCardSetPage()`, which slices out
  one set (`pageSize` is `1` — most years have exactly one set anyway;
  see "Notable" below) and calls the big `displayCardSet(...)` render
  function (17 positional params — `postBody`, `year`, `mfg`, `size`,
  `subsets`, `stars`, `formats`, `headerImg`/`headerImgName`,
  `footerImg`/`footerImgName`, `setName`, `author`, `date`, `upvotes`,
  `downvotes`, `hasChecklist`) plus `fetchPageTitle(item.setName)` for
  each, which sets `document.title` to `Review: <setName>` so the
  browser tab and any bookmark reflect the specific set being viewed,
  not just a generic page title. This same function also calls
  `fetchCopyrightYear()` itself, unconditionally, right after kicking
  off the `fetch()` — so the copyright year is set independent of
  whether the card-set fetch ultimately succeeds or fails.
  `renderCardSetPage()` finishes with `renderPaginationControls()`,
  which only renders anything when there's more than one set for that
  year (most years have exactly one; only 1989-90 onward have
  multiple, once card companies started releasing several sets per
  season).

**User interactions**:
- Vote buttons (👍/👎, inside `displayCardSet()`'s output) exist so a
  visitor can register an opinion on a set without any account/login —
  `castVote(this)` (`wax.js`) reads `setName`/`year`/`voteType` off the
  button's `data-*` attributes (not interpolated into the `onclick`
  string, since `setName` can contain an apostrophe). It updates the
  displayed count and disables both buttons **optimistically** —
  immediately, before the network call resolves, so the page feels
  responsive — records the vote in `localStorage` (`votedSets`) so the
  same browser can't vote twice, then calls **Cast a vote on a card
  set**, fronted by the `castVoteHandler` Lambda
  (`Lambdas/castVoteHandler/`), which does an atomic DynamoDB
  `UpdateItem` with `ADD` against the matching `Cards` item, guarded by
  a `ConditionExpression` so a bad `setName`/`year` pair 404s instead of
  silently creating a garbage item. On success, the optimistic count is
  reconciled with the server's authoritative value; on failure, the
  count is rolled back, the buttons re-enabled, and the `localStorage`
  entry removed, so a failed vote doesn't permanently lock the visitor
  out of retrying.
- "Checklist" link (only rendered when `hasChecklist` is true) exists
  because not every set has had its full card-by-card checklist
  uploaded yet — `openChecklistModal(this)` (`wax.js`) reads `setName`
  off `data-set-name`, shows `#checklistModalOverlay`, resets the
  "Rookies only" checkbox, then calls **Get checklist by set name**,
  fronted by the `getChecklistBySetName` Lambda
  (`Lambdas/getChecklistBySetName/`), which does a `Query` (not a full
  `Scan`) against the `Checklists` table's partition key for an exact
  `setName` match. On success, the raw items are stored in the
  module-level `currentChecklistItems` and `applyChecklistRookieFilter()`
  is called to actually render them (see below) rather than rendering
  the raw response directly.
- "Rookies only" checkbox (inside the modal) → `applyChecklistRookieFilter()`
  (`wax.js`, `onchange`) — filters the already-fetched
  `currentChecklistItems` client-side (`\bRC\b` whole-word match on
  `notes`) and re-renders via `renderChecklistGroups()` — **no new
  fetch**, since the whole checklist was already pulled in one shot when
  the modal opened; this is purely an in-memory re-render for
  responsiveness. `renderChecklistGroups()` itself groups main-set
  cards first, then each insert set (sorted within every group by
  `sortIndex`), labels each insert-set group `"<name> - Insert Set"` or
  `"<name> - Memorabilia"` (the latter when any card in that group has
  `"MEM"` in its notes), and always renders every Insert Set group
  before every Memorabilia group regardless of fetch order, so the
  layout is predictable regardless of how the data happened to come
  back. See `FRONTEND.md`'s "Checklist display" section for the full
  reasoning behind this grouping/labeling.
- Print button (inside the modal) → a plain `onclick="window.print()"`
  — no JS function, relies entirely on the `@media print` CSS rules
  scoped to `body.checklist-modal-open`, since a checklist is meant to
  be a physically-printable reference for someone sorting a real card
  collection.
- "⬇ Download PDF" button (inside the modal, alongside Print — additive,
  not a replacement; Print is untouched) exists for the same
  physical-reference use case, but as a file someone can keep or share
  rather than only print immediately → `exportChecklistPdf()`
  (`wax.js`). It filters `currentChecklistItems` the same way the
  "Rookies only" checkbox does before building the file, so a download
  taken with the filter on only contains the filtered cards. The PDF is
  built entirely client-side via jsPDF (cdnjs, pinned to `4.2.1`) plus
  3 small embedded font files (`scripts/fonts/bebasNeue-normal.js`,
  `scripts/fonts/sourceSans3-normal.js`,
  `scripts/fonts/sourceSans3-bold.js`) — no backend call at all for the
  PDF itself, since the data's already in memory from the earlier
  checklist fetch. All four scripts are injected lazily on first click
  via a small `loadJsPdf()` loader and cached, not loaded as static
  `<script>` tags on page load, so a visitor who never opens a
  checklist never pays for jsPDF's ~1MB weight. The grouping/sorting
  logic (`buildChecklistGroups()`) is shared with the on-screen renderer
  so the two stay in sync from one source of truth rather than
  duplicating the rules. See `FRONTEND.md`'s "Checklist display"
  section for the full PDF layout details (masthead, 2-column
  balancing, headers/footers, etc.).
- Close (`×`) → `closeChecklistModal()`; clicking the dark backdrop
  outside the modal content also triggers it, via a `document`-level
  click listener in `wax.js` that checks `event.target === overlay`.
- Set-o-matic year-picker links → plain `<a href>` navigations to a new
  `waxReviews.html?...` URL — no JS beyond the link itself, since
  changing years is really just a normal page navigation with different
  query params.
- Pagination links (only shown when a year has more than one set) →
  `nextPage()`/`prevPage()` (`wax.js`) — re-slice `allCardSets` and
  `scrollIntoView()` back to `#card-intro`. No new fetch, same reasoning
  as the blog pages' pagination.
- Hamburger icon → `toggleMenu()`, same as the blog pages.

**Notable**: the inline lockout-year redirect exists as a deliberate
easter egg, not a bug workaround — it checks the URL for exactly
`?year=2004&pageName=mcd&blogCat=mcd` (the 2004-05 McDonald's set,
which would otherwise represent the cancelled 2004-05 NHL lockout
season) and, if matched, immediately redirects to `lockout.html?...`
with the same params before any of the rest of the page's scripts run
— see `FRONTEND.md`.

## `playerSearch.html`

This page exists as a cross-set alternative to browsing by year: rather
than picking a year/category and paging through, a visitor can search
directly for a player and jump straight to every set they appear in.

**What loads**: `scripts/playerSearch.js`, `scripts/helper.js` (both
`defer`), plus one inline `window load` script.

**On `window load`**:
- `fetchCopyrightYear()` and `fetchNav("playerSearch")` — same
  mechanism as every other page. `"playerSearch"`'s own `NAV_MAP` entry
  deliberately does **not** include `"search"` itself (no self-link,
  since you're already there).
- If the URL already has a `?q=` param (e.g. a shared/bookmarked search
  link), the input field is pre-filled and `runPlayerSearch(initialQuery)`
  fires immediately, so a shared link shows results right away rather
  than requiring the visitor to press Search again — this is what makes
  a search result actually shareable as a link.

**User interactions**:
- Submitting the form (`onsubmit`, `event.preventDefault()`) is the
  **only** trigger for a search → `runPlayerSearch(document.getElementById('playerSearchInput').value)`
  (`playerSearch.js`). There's deliberately no live/debounced
  search-as-you-type here, because the backing Lambda does a full
  `Scan` per request (see below) — a search-as-you-type UI would mean
  firing that expensive scan on every keystroke, so the design
  trades a slightly less snappy UX for controlling backend cost/load.
- `runPlayerSearch(query)` — rejects anything under 2 characters with
  an inline message, no API call in that case (another guard against
  triggering an expensive scan for a query too short to be meaningful).
  Otherwise it updates the URL via `history.replaceState` (so the
  search becomes shareable/bookmarkable without a full page reload),
  shows a "Searching..." message, then calls **Search players by
  name** (`q` mode), fronted by the `searchPlayerName` Lambda
  (`Lambdas/searchPlayerName/`) — this is the one endpoint on the
  entire site that does a full paginated `Scan` of the `Checklists`
  table (there's no index on `playerName` to `Query` against instead),
  matched case-insensitively in application code, followed by a
  per-matched-set `Query` against `Cards` to pull in `year`/`blogCat`
  for linking. On success, `renderPlayerSearchResults(query, results)`
  renders the response; on a non-2xx response or a network error, an
  inline error message is shown instead.
- `renderPlayerSearchResults()` groups the response by `setName`. For
  each group whose entry included a `year`/`blogCat` (i.e. a matching
  `Cards` item exists), the heading is built as a link to
  `waxReviews.html?year=...&pageName=...&blogCat=...` — `pageName`
  itself isn't returned by the API, so it's derived client-side via
  `getPageNameForYear(blogCat, year)` (`helper.js`), reusing the same
  `categoryRanges` data `renderSetPicker()` uses, so the search results
  link to exactly the same set-o-matic-navigable page the visitor would
  have reached browsing by year. Groups with no matching `Cards` item
  render the set name as plain text instead, suffixed "(review not
  linked yet)" — a checklist can be uploaded before its review is
  written, so this is an expected, not erroneous, state. Every card
  whose `notes` contain `RC` as a whole word gets a bold red highlight
  (`.player-search-card-notes-rc`), the same rule as the checklist
  modal's "Rookies only" filter, so rookie cards are visually
  consistent wherever they appear across the site.

**Notable**: this page's masthead uses the same self-hosted Bebas Neue
treatment as `waxReviews.html`/`lockout.html` (not the
`index.html`/`tech.html` masthead, and no weather widget) — see
`FRONTEND.md`'s "Typography / fonts" section.
