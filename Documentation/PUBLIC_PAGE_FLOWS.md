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
meaningful JS of its own, beyond the scores ticker it shares with the
other hockey pages (see the Card Set Reviews flow below) and the
breadcrumb that `renderBreadcrumbs()` fills. Its title, description, H1
and share tags are written in the HTML.

## Home Page - `index.html`

The site's front door is plain static HTML. Its content (the intro card
and the single "junk wax curious?" post) is written into the page, so a
visitor, or a crawler that doesn't run JavaScript, gets the text in the
first response; JavaScript only assembles the chrome around it (the nav,
the footer links and the copyright). It used to be built in the browser:
`renderBlogIntro('99')` wrote the intro and `fetchBlogs('99')` fetched
the one `blogType` 99 post from the `Blogs` table, sorted and paginated
it, and wrote a `BlogPosting` JSON-LD block. Since there is only ever
one Home post, that was an API round trip, a placeholder that reserved
750px of height, and a layout shift, all to show text that never
changes.

**What loads**: `scripts/helper.js` (`defer`) and one inline `window
load` handler. `blogs.js` is not loaded. The masthead is the
edge-to-edge image banner (see `FRONTEND.md`'s "Home page banner"). The
Home page has no scores ticker, by design.

**What is in the HTML**: the intro card (`#blog-intro`: the page's one
`<h1>` plus three short paragraphs) and the post card (`#home-post`: an
`<h2>` title, seven paragraphs, no byline). The post card deliberately
is not `#blogsDiv`, whose `min-height: 750px` pre-sizes content that
arrives late and would only leave dead space under static text. To
change the Home wording, edit `index.html` directly. The type-99 post
still exists in the `Blogs` table but nothing reads it any more, so
editing it in the CMS changes nothing on the site (the CMS no longer
offers Home Page as a type for new posts).

**In the HTML itself**: `<title>`, the meta description, the canonical
(`https://www.junkwaxhockey.com/`, matching `sitemap.xml`'s root entry)
and the Open Graph/Twitter Card tags, with `hellaFilesArch.webp` as the
social-share image. They are static, not set by a script, because
Facebook, Discord, Reddit and X read only the raw HTML and don't run
JavaScript; the page used to call `setPageMeta()` for the same values,
which gave search engines the tags but shared links no preview card.
See `FRONTEND.md`'s "SEO and social tags".

**On `window load`** (independent of each other):
- `fetchCopyrightYear()` (`helper.js`) — a small, unrelated piece of
  chrome: writes `© <current year> Christian Couillard` into `#copy`.
- `fetchFooterLinks()` (`helper.js`) — fills the footer's link columns
  from `FOOTER_SECTIONS`, reusing the same `NAV_ITEMS` addresses as the
  nav. Every public page makes this one call, so only this page spells it
  out; see `FRONTEND.md`'s "Site footer".
- `fetchNav("index")` (`helper.js`) — builds the top nav bar itself
  (the links to the card review sections, the timeline, All Sets and
  Player Search), by looking up `NAV_MAP["index"]` (`classic, junk, mcd,
  timmies, timeline, browse, search`, with no "Home" link, since the
  masthead already is one) and rendering it as a `<table>` into
  `#global-nav`. Purely client-side — the nav structure is a hardcoded
  map in `helper.js`, not backend-driven, since the site's page/category
  set changes rarely enough that there's no value in making it dynamic.

**User interactions**:
- Hamburger icon (mobile) → `toggleMenu()` (`helper.js`) — toggles an
  `.open` class on `#global-nav` to slide the nav in/out on narrow
  screens. A separate, page-independent `document` click listener in
  `helper.js` closes it again on any click outside
  `#global-nav-placeholder`.
- "WLCMS" footer link → a plain `<a href>` straight to the Cognito
  Hosted UI login URL (`rel="nofollow"`) — no JS involved, this is how
  `/cms` access begins for a logged-out visitor. It is hidden (the
  footer's own colour) and only visible as an outline on keyboard focus.

## Tech Blogs - `tech.html`

This page is where the site's **blog stream** machinery runs: one
`blogs.js` pattern, parameterized by whichever `blogType` the URL
specifies (`1`=Tech, `3`=Mach-E, `4`=SYNC Updates, `5`=Raspberry Pi),
rather than a separate page/script per category. `about.html` uses the
same machinery for `blogType` 98; the Home page no longer does.

Since the 2026-10-12 move to `junkwaxhockey.com` nothing links here:
the nav, home page and sitemap no longer list it, so it's reachable
only by direct URL (the posts stay in `Blogs` and in the CMS).

**What loads**: `scripts/blogs.js`, `scripts/helper.js` (`defer`), plus
inline scripts reading `blogType`/`pageName` from the query string and
registering a `DOMContentLoaded` and a `window load` handler. This is
the one page where the weather widget still
runs: `blogs.js` has a block of **top-level code** that executes the
instant it parses (not gated by any event, and unrelated to the blog
content) and only does anything when the page has a `#weather`
element. It asks the browser for the visitor's location via
`navigator.geolocation.getCurrentPosition()`, and once it has
coordinates, calls `getWeather(lat, long)`, which hits OpenWeatherMap
directly from the browser (`https://api.openweathermap.org/data/2.5/weather`,
API key hardcoded client-side) to fill in the widget next to the
masthead. This is a third-party call unrelated to this site's own
backend — it isn't on the API Endpoints page and has nothing to do with
the Lambda/DynamoDB stack the rest of this doc traces.

**On `DOMContentLoaded`**: `renderBlogIntro(blogType)` writes a static,
hardcoded intro into `#blog-intro`: `"1"`, `"3"` and `"5"` each have
their own tailored copy (Tech/Mach-E/Raspberry Pi), and `"98"` (About)
just a heading. Each is rendered as an `<h1>`, the page's one true
page-level heading — the individual post `displayBlog()` renders below
it (see the `fetchBlogs()` bullet below) is deliberately an `<h2>`, so
the page never has two competing `<h1>`s. `blogType "4"` (SYNC Updates)
has no matching branch, so it falls through to the generic fallback
copy (the old Home page welcome text, kept in `blogs.js` for this
case) — worth knowing if that intro ever looks wrong specifically on
the SYNC Updates stream.

This is also where `tech.html` gets its title/meta description/OG tags.
For any `blogType` other than `"98"` (About, which sets its own) or
`"99"` (no longer used), `renderBlogIntro()` looks up a small
`metaByType` map keyed by `blogType` (falling back to a generic "tech
blog" title/description for `"4"`, which has no dedicated entry) and
calls `setPageMeta({...})` (`helper.js`) with that title/description,
the shared hero image as `image`, and a canonical built from
`window.location.search` — e.g.
`https://www.junkwaxhockey.com/tech.html?blogType=1&pageName=tech` —
so each of the 4 `blogType` variants gets its own accurate
title/description/canonical instead of sharing one generic pair. Without
the 98 exclusion, the About page would have been given a `tech.html`
canonical.

**On `window load`**:
- `fetchBlogs(blogType)` is the call that actually populates the page
  with content: it pulls every blog post of that `blogType` from the
  `Blogs` table in DynamoDB, via **Get all blogs of a given type**
  (`?blogType=<n>`), fronted by the `getBlogs` Lambda
  (`Lambdas/getBlogs/`) — it reads via a `QueryCommand` on `blogType`
  (the table's partition key), filtered to `published = true`, and
  returns a plain JSON array. Once the result is back, `fetchBlogs()`
  sorts it via `getSortOrder("time", "first")` (newest first; Raspberry
  Pi is oldest first), stores it in the module-level `allBlogs`, resets
  `currentBlogPage = 1`, then calls `renderBlogPage()`, which slices
  out just page 1 (`blogPageSize` is `1` — the site shows one post at a
  time, not a feed) and calls `displayBlog(postBody, author, time,
  title, img, imgCap)` to actually write it into `#blogsDiv`.
  `displayBlog()` skips rendering an `<img>` tag entirely when `img ===
  "none"`, and otherwise renders one with an `onerror` handler that
  hides both the image and its caption if the URL 404s — so a broken or
  placeholder image fails silently instead of showing a broken-image
  icon. It also builds a `BlogPosting` JSON-LD block from this same
  data (`headline`, `author`, `datePublished`, `image` when present, and
  an `articleBody` excerpt built by stripping HTML tags from `postBody`
  via `stripHtmlTags()`, `helper.js`) and writes it via
  `setJsonLd("jsonld-blogpost", ...)` — a fixed id, since only one post
  is ever shown at a time, so the next pagination click replaces this
  block rather than piling up a new one. `renderBlogPage()` finishes by
  calling `renderBlogPaginationControls()`, which builds the "←
  previous post title" / "next post title →" links into
  `#paginationControls`, so a visitor can step through older/newer
  posts without a full reload.
- `fetchCopyrightYear()` and `fetchFooterLinks()` (`helper.js`) — the
  copyright and the footer link columns, as on every public page.
- `fetchNav(pageName)` — called with **only** `pageName`, no `blogType`
  argument, even though `fetchNav(pageName, blogType)` accepts a second
  parameter and its own header comment describes building a
  `${pageName}_${blogType}` lookup key when one is supplied. Since
  `blogType` is never passed here, the key resolves to just `pageName`
  alone — which happens to match `NAV_MAP`'s actual `"tech"` and `"ev"`
  entries directly (there's no `tech_1`-style key in `NAV_MAP` today),
  so the nav still builds correctly, just not via the more specific
  lookup path the function was apparently designed to support.

**User interactions**:
- Pagination links → `nextBlogPage()` / `prevBlogPage()` (`blogs.js`) —
  advance `currentBlogPage`, re-run `renderBlogPage()`, then
  `scrollIntoView()` back to `#blog-intro`. No new API call — these
  just re-slice the `allBlogs` array already fetched on load, since the
  whole type's worth of posts was pulled in one shot up front.
- Hamburger icon → `toggleMenu()` (`helper.js`), as on every page.

**Notable**: the page markup includes an empty `<div id="blogTop">`
above `#blogsDiv` that no script in `blogs.js` ever reads from or
writes to — likely a leftover anchor from an earlier version of the
pagination scroll behavior (which now targets `#blog-intro` instead, in
both `nextBlogPage()`/`prevBlogPage()` here and their `waxReviews.html`
counterparts `nextPage()`/`prevPage()`).

## Card Set Reviews - `waxReviews.html`

This is the card-set-review equivalent of the blog pages above, but
its job on load is a bit bigger: it has to build both the top nav *and*
a second, page-specific navigation element (the "set-o-matic" year
picker), then load the actual review content for whichever
year/category the URL specifies. Those three things — nav, year picker,
review content — are independent of each other. Nav and year picker
fire off `window load`, same pattern as the blog pages; the review
content starts earlier, on `DOMContentLoaded`, so its request doesn't
wait for fonts, analytics and the ticker (see "Notable" below).

**What loads**: `scripts/wax.js`, `scripts/ticker.js`, `scripts/helper.js`
(all `defer`), plus several inline `<script>` blocks in `<head>`, in this order:

1. A lockout-year redirect check (see "Notable" below) — runs
   immediately, before any other script, since it may bail out of
   rendering this page entirely.
2. A Google Core Web Vitals preload hint for that year's hero image.
3. `DOMContentLoaded` → `renderCardIntro(pageName)`, then
   `fetchCardSetsByYear(year, sortOrder, blogCat, setID)`.
4. `window load` → `fetchNav(pageName)`, `fetchFooterLinks()`,
   `renderSetPicker(year, blogCat, pageName)`,
   `applyRandomMastheadStyling()` (in that order), plus a
   `gtag('config', ...)` call for Analytics. The scores ticker isn't in
   this list: `ticker.js` starts itself on `DOMContentLoaded`.

The raw HTML also holds generic Open Graph and Twitter tags (and no
canonical), so a link shared to Facebook, Discord, Reddit or X, none of
which run JavaScript, still gets a branded card; `fetchPageTitle()`
below overwrites them per set for Google. See `FRONTEND.md`'s "SEO and
social tags".

**On `DOMContentLoaded`**: `renderCardIntro(pageName)` (`wax.js`) —
static intro copy keyed by `pageName` (`classicWax`/`junkWax`/`timmies`/
`mcd`), written into `#card-intro`. Same purely-cosmetic role as
`renderBlogIntro()` on the blog pages — sets the tone for the section
before any real content has loaded. `fetchCardSetsByYear()` (described
below) is started here too and not on `window load`: one indexed copy of
a review page held the fetch's error text instead of the review, so the
request now begins as early as possible, and `fetchJsonWithRetry()`
retries it once.

**On `window load`**: these calls together finish assembling
everything else the visitor can see or navigate to on this page.
- `fetchNav(pageName)` (`helper.js`) — builds the top nav bar, same
  mechanism as the blog pages, but `waxReviews.html`'s `pageName`
  values (`junkWax`, `classicWax`, `timmies`, `mcd`) each map to a
  `NAV_MAP` entry (the other review sections, then `"search"` (Player
  Search), always last — Player Search is in every `NAV_MAP` entry
  except its own page's, and "Junk Wax Timeline" and "All Sets" sit just before it).
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
- `fetchCardSetsByYear(year, sortOrder, blogCat, setID)` (`wax.js`,
  started on `DOMContentLoaded`, listed here with the other page pieces)
  is the call that actually loads the review itself. Its request goes
  through `fetchJsonWithRetry()`: one retry after 1.5 seconds, with a
  non-OK reply such as a throttled 429 counted as a failure, so a
  single dropped request doesn't leave an error message (or, for a
  429, a misleading "coming soon" message) in the page a crawler
  indexes; two failures show the "Ah, Houston" text. It's the main function
  that pulls in every card set matching this year and category from
  the `Cards` table in DynamoDB, via **Get card sets by year**
  (`?year=<y>&blogCat=<c>`), which is fronted by the `getCardSetsByYear`
  Lambda (`Lambdas/getCardSetsByYear/`) — that Lambda queries the
  `blogCat-year-index` GSI, filtered to `blogStatus = "OK"`, so a
  staged/unpublished set is never returned here even if it otherwise
  matches. Once the result is back, `fetchCardSetsByYear()` sorts it via
  `getSortOrder("stars", ...)`, stores it in `allCardSets`, sets
  `currentPage` (to 1, or to the matching set's page when the URL
  carries a `setID`, so a link can name one specific set — see
  `FRONTEND.md`'s "Linking to one specific set"), and calls
  `renderCardSetPage()`, which slices out
  one set (`pageSize` is `1` — most years have exactly one set anyway;
  see "Notable" below) and calls the big `displayCardSet(...)` render
  function (18 positional params — `postBody`, `year`, `mfg`, `size`,
  `subsets`, `stars`, `formats`, `headerImg`/`headerImgName`,
  `footerImg`/`footerImgName`, `setName`, `author`, `date`, `upvotes`,
  `downvotes`, `hasChecklist`, `printRun`) plus `fetchPageTitle(item)` for each —
  despite the name, this now does all of this page's per-set SEO work
  in one place, not just the title: it sets `document.title` to
  the set's CMS SEO title (`seoPageTitle`), or `<setName> Hockey Card
  Set Review | Junk Wax Hockey` when that field is empty (so the browser
  tab/bookmark reflect the specific set, not a generic page title),
  writes the set name into the
  previously-empty `<h1 id="pageHeader">` (this element used to have a
  stale comment claiming `displayCardSet()` populated it — nothing
  actually did, on either `waxReviews.html` or `lockout.html`, until
  this fix), calls `setPageMeta({...})` (`helper.js`) with that title, the
  set's CMS description (`seoMetaDesc`) or, when empty, the review text
  with HTML stripped by `stripHtmlTags()` and cut at a word boundary
  near 155 characters by `truncateAtWord()` (both `helper.js`), the
  set's own `headerImg`/`headerImgName` as the
  social-share image, and a canonical built from the set's own data by
  `buildReviewCanonicalUrl()` (`year`, `pageName`, `blogCat`, plus
  `setID` on multi-set years, so stray query parameters can't create
  duplicate canonicals) — and writes a `Product`+`Review` JSON-LD block (`name`/`image` on the
  `Product`, `author`/`datePublished`/`reviewRating` — out of 5, from
  `stars` — and a stripped-text `reviewBody` on the nested `Review`) via
  `setJsonLd("jsonld-cardset", ...)`, a fixed id for the same
  one-set-at-a-time reason the Tech pages' `jsonld-blogpost` block uses.
  It also calls `renderBreadcrumbs()` (`helper.js`), which fills the
  `#breadcrumbs` nav above the page (Home, the set's navigation
  category, the set) and writes a matching `BreadcrumbList` block
  (`jsonld-breadcrumbs`), replaced the same way on each pagination click.
  `fetchCardSetsByYear()` itself also calls `fetchCopyrightYear()`
  unconditionally, right after kicking off the `fetch()` — so the
  copyright year is set independent of whether the card-set fetch
  ultimately succeeds or fails.
  `renderCardSetPage()` finishes with `renderPaginationControls()`,
  which only renders anything when there's more than one set for that
  year (most years have exactly one; only 1989-90 onward have
  multiple, once card companies started releasing several sets per
  season).
- `applyRandomMastheadStyling()` (`helper.js`) — paints the masthead
  in a random NHL team's colours with its cheer label. Purely
  cosmetic, no API call — see `FRONTEND.md`'s "Typography / fonts".
- `initNhlTicker()` (`ticker.js`, which starts itself on
  `DOMContentLoaded` — no page calls it) adds live hockey context above
  the reviews: it fills the scores strip under the masthead via **Get NHL
  scores**, fronted by the `getNhlScores` Lambda
  (`Lambdas/getNhlScores/`). That Lambda reads no DynamoDB table — it
  calls the NHL's own undocumented API (`api-web.nhle.com`) server-side,
  because that API sends no CORS headers and the browser can't call it
  directly, and slims the result to a stable shape of our own (see
  `NHL_API.md`). In parallel — the request itself never waits on the NHL's —
  it calls
  **Get PWHL scores**, fronted by the `getPwhlScores` Lambda
  (`Lambdas/getPwhlScores/`), which proxies the PWHL's HockeyTech feed
  (see `PWHL_API.md`) and returns the same shape — plus a "Season
  starts" / "Next game" notice on days with no PWHL games. The NHL
  goes first: the PWHL's first render waits for it (up to 2.5s), so the
  strip opens on the NHL section; a league that arrives later is added
  without a visible jump. Independent of the review: it runs in
  parallel with `fetchCardSetsByYear()`, and a league that errors or
  has nothing to show is simply left out. The empty rail is on the page
  from first paint (with a faint shimmer) so nothing pops in, and it
  hides only when both leagues have nothing. On a first visit in a tab
  the strip slides in from the right; arriving from another page in the
  same tab, it instead renders the last scores it cached and carries on
  from the scroll position the previous page had, so a click doesn't
  look like a restart. While a game is live each league re-polls every
  60s and updates scores in place — see `FRONTEND.md`'s "NHL scores
  ticker". The same ticker runs on Player Search, Browse By Set,
  Lockout, The Junk Wax Years and the Timeline, not on the Home page.

**User interactions**:
- Hovering over (or tabbing to) the NHL scores ticker pauses its
  scroll so a score can be read — pure CSS, no JS or API call.
- Clicking a game in the ticker (only started or finished games are
  enabled) → `openNhlGameModal(gameId)` (`ticker.js`) gives the visitor
  the full story of that game without leaving the page. It calls **Get
  NHL game details** (`?gameId=`), fronted by the `getNhlGameDetails`
  Lambda (`Lambdas/getNhlGameDetails/`), which reads no DynamoDB
  table: it combines the NHL's Game Center endpoints, the standings
  (team records) and NHL.com's content API (recap and video) into one
  response — see `NHL_API.md`. The result fills the score header and
  the Summary / Box Score / Recap tabs. Clicking the Recap tab's video
  poster → `playNhlGameVideo()` swaps in the NHL's own Brightcove
  player; no API call of ours. ×, Escape or the backdrop →
  `closeNhlGameModal()`, which also stops any playing video. See
  `FRONTEND.md`'s "NHL game modal".
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
  off `data-set-name`, shows `#checklistModalOverlay`, resets both
  filter checkboxes, then calls **Get checklist by set name**,
  fronted by the `getChecklistBySetName` Lambda
  (`Lambdas/getChecklistBySetName/`), which does a `Query` (not a full
  `Scan`) against the `Checklists` table's partition key for an exact
  `setName` match. On success, the raw items are stored in the
  module-level `currentChecklistItems` and `applyChecklistFilters()`
  is called to actually render them (see below) rather than rendering
  the raw response directly.
- "Inserts only" and "Rookies only" checkboxes (inside the modal) →
  `applyChecklistFilters()` (`wax.js`, `onchange`) — filters the
  already-fetched `currentChecklistItems` client-side (insert-set cards;
  `\bRC\b` whole-word match on `notes`; both on = rookies within insert
  sets; "Inserts only" is hidden for sets with no insert cards, and
  "Rookies only" is hidden unless the *main* set has at least one `RC`
  card, since the filter would otherwise only empty the list) and
  re-renders via `renderChecklistGroups()` — **no new
  fetch**, since the whole checklist was already pulled in one shot when
  the modal opened; this is purely an in-memory re-render for
  responsiveness. `renderChecklistGroups()` itself groups main-set
  cards first, then each Extended Set (titled `"Extended Set - <name>"`;
  a mail-away or box set that belongs with the main set, never hit by
  "Inserts only"), then each insert set (sorted within every group by
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
  (`wax.js`). It filters `currentChecklistItems` through the same
  `filterChecklistItems()` as the on-screen checkboxes before building
  the file, so a download taken with a filter on only contains the
  filtered cards. The PDF is
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

## Player Search Page - `playerSearch.html`

This page exists as a cross-set alternative to browsing by year: rather
than picking a year/category and paging through, a visitor can search
directly for a player and jump straight to every set they appear in.

**What loads**: `scripts/playerSearch.js`, `scripts/ticker.js`,
`scripts/helper.js` (all `defer`), plus one inline `window load`
script. `ticker.js` starts the scores ticker under the masthead by
itself — this page's script never calls it (see the Card Set Reviews
flow).

**On `window load`**:
- `fetchCopyrightYear()` and `fetchNav("playerSearch")` — same
  mechanism as every other page. `"playerSearch"`'s own `NAV_MAP` entry
  deliberately does **not** include `"search"` itself (no self-link,
  since you're already there).
- The page's title, description and share tags are static in the HTML
  (this page used to call `setPageMeta()` for them), reusing this page's
  title/description and the shared hero image, so a shared link gets a
  preview card from crawlers that don't run JavaScript.
  Canonical is always the bare `https://www.junkwaxhockey.com/playerSearch.html`,
  **regardless of any `?q=`** — a deliberate choice: the search tool
  itself is what's worth indexing, not a separate page per query, which
  would just dilute relevance across effectively infinite thin
  `?q=`-variant URLs.
- If the URL already has a `?q=` param (e.g. a shared/bookmarked search
  link), the input field is pre-filled and `runPlayerSearch(initialQuery)`
  fires immediately, so a shared link shows results right away rather
  than requiring the visitor to press Search again — this is what makes
  a search result actually shareable as a link.

**User interactions**:
- **Type-ahead** (added 2026-09-14): as the visitor types 2+ characters
  into `#playerSearchInput`, a dropdown (`#playerSearchSuggestions`)
  suggests matching player names — without hitting the expensive `q`
  mode `Scan` per keystroke. `loadPlayerNameIndex()` fetches the full
  distinct-player-name list exactly once per browser (`namesOnly=1`
  mode, see below), caching it in `localStorage` (30min TTL) so even a
  fresh page load in a later visit skips the network call entirely;
  within a page load, an in-memory promise cache means the fetch (kicked
  off on `window load`, not lazily on first keystroke, so it's usually
  already resolved by the time the visitor finishes typing) is never
  duplicated either. Every keystroke after that just filters the cached
  list client-side via `rankPlayerNameMatch()`, which ranks an exact or
  whole-word match (e.g. "gretzky" matching "Wayne **Gretzky**") above a
  match buried in a longer multi-player card name (e.g. "Brett Hull /
  Wayne Gretzky") — a plain alphabetical `.slice()` had been burying the
  single most relevant result under less-relevant combo-card matches
  that happened to sort earlier. Arrow keys move a highlighted
  selection, Enter selects it (or, with nothing highlighted, falls
  through to a normal form submit), Escape or an outside click closes
  the dropdown, and clicking a suggestion fills the input and runs the
  real search immediately.
- Submitting the form (`onsubmit`, `event.preventDefault()`) →
  `runPlayerSearch(document.getElementById('playerSearchInput').value)`
  (`playerSearch.js`) is still the only way an actual search (`q` mode)
  runs — type-ahead only ever suggests names, it never itself calls `q`
  mode. That endpoint's own full `Scan` per request (see below) is
  exactly why type-ahead was built to filter a once-fetched name list
  client-side instead of live-querying `q` mode on every keystroke.
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
  `waxReviews.html?year=...&pageName=...&blogCat=...&setID=...` — the
  `setID` (returned by the same `Cards` query that supplies
  `year`/`blogCat`) makes the link open that exact set rather than the
  year's top-rated one, and is simply omitted if the response doesn't
  carry it. `pageName`
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

## Junk Wax Timeline - `timeline.html`

An interactive page whose whole job is to turn one markdown file into a
column of flip cards. There is no backend and no API Gateway call; the
only data source is a static file served from the same site.

**What loads**: `scripts/timeline.js`, `scripts/ticker.js` and
`scripts/helper.js` (all `defer`), and one inline `window load` handler.

**On `window load`**, four independent pieces run:
- `fetchNav("timeline")`, `fetchFooterLinks()` and `fetchCopyrightYear()`
  (`helper.js`) build the nav (every link but the page's own) and the
  footer, same as the other static pages.
- `initTimeline()` (`timeline.js`) is the real content. It fetches
  `/timeline/timeline.md`, `parseTimelineMarkdown()` turns the markdown
  into a model (a title plus a list of points, each with nested
  bullets), and `renderTimeline()` builds one card per point. Because
  the cards are built from the file, an author edits text and never
  touches the HTML. If the fetch fails or the file has no cards, a
  friendly message replaces the cards instead of a blank page.
- `setJsonLd()` (`helper.js`) writes an Article JSON-LD block, its body
  text taken from the page's intro paragraph. The title, description,
  canonical and Open Graph/Twitter tags are static in the HTML, so
  crawlers that don't run JavaScript still see them.
- `applyRandomMastheadStyling()` (`helper.js`) paints the masthead in a
  random NHL team's colours, as on the other Bebas-masthead pages.

The scores ticker starts itself from `ticker.js` on `DOMContentLoaded`
(see `FRONTEND.md`'s "NHL scores ticker").

**User interactions**: clicking a card's front flips it
(`setTimelineCardOpen(card, true)`); clicking anywhere on the open back,
or pressing Escape, flips it shut. Each call also marks the card viewed,
keeps focus on the right face and, on close, scrolls a tall card back
into view. How the faces, heights and focus fit together is covered in
`FRONTEND.md`'s "Junk Wax timeline" section.

## Browse By Set - `browseBySet.html`

A catalogue of everything the site has reviewed: its whole job is to
turn one small list of sets into two columns of links. It is reached
from the nav and footer as "All Sets".

**What loads**: `scripts/wax.js` (for the checklist modal only),
`scripts/browseBySet.js` and `scripts/helper.js` (all `defer`), and one
inline `window load` handler. `scripts/ticker.js` is loaded too and
starts the scores ticker by itself.

**On `window load`**, three independent pieces run:
- `fetchNav("browseBySet")`, `fetchFooterLinks()` and
  `fetchCopyrightYear()` (`helper.js`) build the nav (every link but
  its own), the footer and the copyright, like the other pages.
- `initBrowseBySet()` (`browseBySet.js`) is the real content. It calls
  **Get all live sets (public)** once, fronted by the `getPublicCardSets`
  Lambda (`Lambdas/getPublicCardSets/`), which queries the `Cards`
  table's `blogStatus-year-index` GSI for `blogStatus = "OK"` and
  returns only `setID`, `setName`, `blogCat`, `year` and `hasChecklist`
  (plus `now` and `updatedAt`, which this page ignores and the sitemap
  generator uses; the CMS's equivalent returns every review's body
  behind a login, so it can't serve a public page). The sets are split by `blogCat` into
  the Major Releases column (`reg`) and the Fast Food Sets column (`mcd`
  and `tims`), grouped under season headings and sorted, then rendered.
  Each entry's **Review** link is built from `getPageNameForYear()` and
  the set's `setID`, so it opens that exact set; its title drops the
  season because the heading above already shows it. A single click
  listener handles the **Checklist** links (they are rebuilt on every
  render) and calls `openChecklistModal()`, which fetches the checklist
  through **Get checklist by set name** as it does on the review page.
  Once the columns are rendered, `setBrowseItemListJsonLd()` writes an
  `ItemList` JSON-LD block of the same sets and review URLs (built by
  the same `browseReviewUrl()`), so the machine-readable list always
  matches the visible links.
- `applyRandomMastheadStyling()` (`helper.js`) paints the masthead, as
  elsewhere. The title, description and share tags are static in the
  HTML.

If the endpoint is down or returns nothing, a short message replaces
the columns.

## About - `about.html`

The About page uses the same blog-stream machinery as the Tech pages
(see the Tech Blogs section for the full `fetchBlogs()` /
`displayBlog()` trace), pointed at `blogType` 98: it makes the same
`fetchBlogs()` call with `'98'`. **Get all blogs of a given type**
(`?blogType=98`) is fronted by the same `getBlogs` Lambda, which reads
the `Blogs` table by partition key, so no backend change was needed.
Its layout is the Home page's (same banner, nav and footer),
but unlike the Home page its content is still fetched, because the About
post is meant to be edited through the CMS. The heading "about junk wax
hockey..." is written into the HTML (a script used to inject it with
`renderBlogIntro('98')`, which left the raw HTML with no H1; that call
and its branch are gone), and the post below it carries the content,
with the usual byline. The title, description, canonical and share tags
are static in the HTML too, so the page never inherits the tech-blog
metadata `renderBlogIntro()` writes for the Tech pages. It is
footer-only (not in the nav) and has no hidden WLCMS link.
