# Frontend

Plain HTML/CSS/JS, no framework, no build step, no bundler. Every page
loads a fixed set of `<script src>` tags and wires up behaviour with
`window.addEventListener('load', ...)` / `DOMContentLoaded` handlers
inline in the `<head>`.

## Public pages (repo root)

| Page | Purpose | Key query params | Scripts used |
|---|---|---|---|
| `index.html` | Homepage — shows the "Home Page" blog stream (`blogType=99`), plus the weather widget. | — | `blogs.js`, `helper.js` |
| `tech.html` | Tech / Mach-E / Raspberry Pi blog stream, filtered by `blogType`. Masthead uses the same `.masthead-container` (masthead + weather widget) layout as `index.html` — it used to show a decorative gif instead and never actually rendered the weather widget (loaded `blogs.js`, which unconditionally targets `#weather`, but had no such element — silently broken). Fixed by adopting `index.html`'s markup. | `blogType`, `pageName` | `blogs.js`, `helper.js` |
| `waxReviews.html` | Card set review stream — the main hockey card content. | `year`, `pageName`, `blogCat`, `sortOrder` | `wax.js`, `helper.js` |
| `cards.html` | **Deprecated** — per the site owner (2026-08-12), don't include this page in site-wide updates (mobile passes, shared CSS/JS changes, font/font-import work, etc.) even though it's still live/linked and shares markup patterns with other pages. Static "what is Junk Wax" essay/intro page, no API calls. | — | `wax.js` (unused on this page beyond nav helpers), `helper.js` |
| `cardChecker.html` | "Card-O-Matic" utility: given a card number, calculates which page/pocket (of a standard 9-pocket page) it belongs in. | — | `cardSlotCalc.js`, SweetAlert |
| `lockout.html` | Static essay about the 2004-05 NHL lockout. Special-cased redirect target — see below. | — | `helper.js` |

### `waxReviews.html` → `lockout.html` redirect

`waxReviews.html` has an inline script that checks if the URL is
exactly `?year=2004&pageName=mcd&blogCat=mcd` and, if so, immediately
redirects to `lockout.html?year=2004&pageName=mcd&blogCat=mcd` — there
was no 2004-05 McDonald's set (season was cancelled), so this swaps in
the essay page instead of showing an empty/broken review page for that
one year+category combination.

## `scripts/` — shared JS

| File | Responsibility |
|---|---|
| `blogs.js` | Blog intro copy (`renderBlogIntro()`), `fetchBlogs()`/pagination/rendering for the blog stream, and the homepage weather widget (calls OpenWeatherMap directly from the browser using the visitor's geolocation). |
| `wax.js` | Card set intro copy (`renderCardIntro()`), `fetchCardSetsByYear()`/pagination/rendering for card set reviews, and the thumbs up/down vote widget (`castVote()` — see "Voting feature" below). Pagination controls (`renderPaginationControls()`) only render when there's more than one set for a given year/category — most years have exactly one, only 1989-90 onward have multiple. |
| `helper.js` | Cross-page utilities: `estimateReadingTime()`, date formatting (`fixDate()`, `getMonthName()`), the generic sort comparator `getSortOrder(property, order)` (used for both blogs, by `time`, and card sets, by `stars` — consolidated from two identical functions on 2026-08-12), the dynamic top-nav builder (`fetchNav()`/`NAV_MAP`/`NAV_ITEMS`), the "set-o-matic" year-picker builder (`renderSetPicker()` — renders as plain flex-wrap `<div>`s, not a table; see "Mobile / responsive design" below), hamburger menu toggle, cookie helper, and copyright-year footer. |
| `auth.js` | Cognito OAuth2 code exchange + token refresh, gates every `/cms` page. See `AUTH.md`. |
| `cms.js` | All CMS create/edit/list logic + the S3 image browser/upload modal + TinyMCE init. See `CMS_GUIDE.md`. |
| `adminSMS.js` | Autobus SMS admin page logic: character/segment counter, GSM-7 vs Unicode encoding detection, broadcast send, bulk subscriber import, add-subscriber modal. See `CMS_GUIDE.md`. |
| `cardSlotCalc.js` | `computeGridSpace()` — the Card-O-Matic slot/page calculator, used only by `cardChecker.html`. Still live; excluded from the 2026-08-12 JS style audit at the site owner's request but not deprecated. |
| `quadratic.js` | **Deprecated** (2026-08-12) — `quadSolver()`, a quadratic equation solver used only by `Old HTML Pages/quad2.html`, which is itself orphaned (not linked from current nav — see "Orphaned pages" below). Excluded from future JS work. |
| `pw.js` | **Deprecated** (2026-08-12) — `generatePassword()`, a tiny random password generator used only by `Old HTML Pages/pw.html`, itself orphaned. Excluded from future JS work. |
| `magic8Ball.js` | **Deprecated** (2026-08-12) — console-only Magic 8-Ball toy (hardcoded question, `console.log`s the answer — no DOM interaction). Not linked from any page. Excluded from future JS work. |

## Navigation system (`helper.js`)

The top nav is entirely data-driven and rebuilt on every page load by
`fetchNav(pageName, blogType)`:

- `NAV_ITEMS` — the master list of every possible nav link (label + href).
- `NAV_MAP` — per-page key (e.g. `"index"`, `"tech"`, `"junkWax"`) → ordered list of which `NAV_ITEMS` to show. `tech`/`ev` pages key off `${pageName}_${blogType}` when a `blogType` is present.
- Adding a new page to the nav means adding one `NAV_MAP` entry; adding a brand-new nav destination means adding one `NAV_ITEMS` entry.

The "set-o-matic" year picker (`renderSetPicker()`) works the same way
— a `categoryRanges` object maps `blogCat` → `{start, end}` year ranges
per page, and the function generates the picker links dynamically
instead of hand-written year links. It emits one flat list of `<div>`
year cells (no per-desktop/mobile split, no `<table>`) into a single
`.card-set-nav` flex-wrap container — see "Mobile / responsive design"
below for why it's `<div>`-based rather than a table.

## Mobile / responsive design

The whole site uses a single breakpoint: `@media (max-width: 600px)`
in `styles/styles.css`. There's no intermediate/tablet breakpoint —
`.flex-container div` (the main content-width wrapper, see below) is a
fixed `1000px` above 600px, so the layout jumps straight from
"desktop, fixed width" to "mobile, fluid width" with nothing in
between. A round of mobile-responsiveness work (waxReviews.html, the
CMS pages, smsAdmin.html) surfaced a few recurring gotchas worth
knowing before touching this CSS again:

- **Every page needs `<meta name="viewport" content="width=device-width, initial-scale=1">`.**
  `cms/smsAdmin.html` was missing it entirely, which meant mobile
  Safari rendered the page at a wide desktop-width virtual viewport and
  just zoomed the whole thing out to fit the screen — the
  `max-width: 600px` media query never actually triggered, even though
  the page visually looked "mobile-sized." Every page now has this tag
  with an explanatory comment above it; keep it on any new page.
- **`.flex-container div` is a bare descendant selector, not a
  direct-child combinator** (`styles.css` top of file: `.flex-container
  div { width: 1000px; padding: 15px; margin: 5px; }`). It was written
  assuming exactly one wrapper `<div>` immediately inside
  `.flex-container`, but as a plain space-combinator selector it
  matches *every* `<div>` nested at *any* depth inside `.flex-container`
  — including any new `<div>`s added later inside `#cardSetDiv` (e.g.
  the vote widget, the footer caption). This has bitten several fixes
  this round (the set-o-matic picker forcing every pill to
  `width: 1000px`, the footer caption inheriting an unwanted
  `padding-left: 15px`/`margin-left: 5px`). The fix pattern used
  throughout: scope the correction under a more specific ancestor
  (`#set-picker .foo`, `#cardSetDiv .foo`) so ID specificity beats the
  class+element specificity of the offending rule, rather than editing
  the shared `.flex-container div` rule itself (which other pages rely
  on for their intended 1000px content column).
- **`<table>` elements resist non-table `display` overrides
  unpredictably across browsers.** Several bugs this round traced back
  to forcing `display: flex`/`display: block` onto a `<table>`/`<tr>`
  while a sibling kept a mismatched table-related display role (or to
  `display: contents` on a `<tr>`, which is a known-unreliable
  combination in Safari specifically). The fix each time was the same:
  stop fighting the table model and use plain `<div>`s with flexbox
  instead — see the set-o-matic picker (`renderSetPicker()` in
  `helper.js`) and the footer caption/image block
  (`.set-footer-table-style` in `displayCardSet()`, `wax.js`), both of
  which used to be `<table>`s and are now `<div>`s for exactly this
  reason.

## Typography / fonts

Every live page (everything above except the deprecated `cards.html` and
`cms/formioSandbox.html`, which wasn't brought into this pass) loads the
identical Google Fonts set via the identical `preload`+`onload`+
`noscript` pattern: Spicy Rice, Nunito (200), Special Elite, Work Sans
(400/700), Source Sans 3 (200/400/700), Fira Code (300). A font audit
found and fixed real bugs here — several CMS pages were silently
missing Work Sans/Source Sans 3/Special Elite for content that actually
renders on them (falling back to a generic system font), while
simultaneously loading Audiowide and Caveat, which nothing on the site
ever uses. Keep any new page's font `<link>` block byte-for-byte
identical to the others unless it genuinely needs a font none of them
load.

`waxReviews.html`'s masthead is the one deliberate exception: it uses a
self-hosted `Bebas Neue` (`@font-face`, only imported by `waxReviews.html`
and `lockout.html`) instead of the `Spicy Rice` every other masthead
uses — **confirmed intentional by the site owner**, not drift, so don't
"fix" it to match. Same for the pseudo-headline convention inside body
content: blog posts (`index.html`/`tech.html`) use plain bold text for
section breaks, while card reviews use `<p class="caption">` (Special
Elite) baked into the stored `postBody` — also confirmed intentional.

One real CSS gotcha found while fixing the waxReviews masthead's mobile
vertical alignment: `.wax-reviews-masthead a` centers its text via
flexbox (`display: flex; align-items: center;`), which was previously
also carrying a manual `padding-top` "to help centering." The two fight
each other, and the padding's visual impact isn't uniform — desktop's
128px text nearly fills its 150px box (little slack for `align-items`
to distribute, so the extra padding barely showed), while mobile's 48px
text sits in a much roomier 90px box (lots of slack, so the same
padding visibly skewed it off-center). Fixed by dropping the manual
padding and trusting `align-items: center` alone. Same lesson as the
`.masthead-container .masthead`/`.mast-table .masthead` fixed-height
issues in the mobile section above — don't hand-tune spacing to
"assist" a centering mechanism that's already doing the job; the two
values drift out of sync differently at each screen size.

## Voting feature (waxReviews.html)

Each card set review ends with a thumbs up/down widget (`castVote()`
in `wax.js`) — see `Documentation/API_ENDPOINTS.md` for the endpoint
contract and `Documentation/LAMBDA_FUNCTIONS.md` for the backend
(`castVoteHandler/`). Frontend behavior worth knowing:

- Vote identity is `setName` + `year` (the `Cards` table's real key —
  see `DATA_MODEL.md`), not `setID`. Because `setName` can contain
  characters like apostrophes (e.g. `"McDonald's Hockey"`), the vote
  buttons pass this through `data-set-name`/`data-year` attributes read
  via `this.dataset` in `castVote(btn)`, rather than interpolating
  `setName` into an inline `onclick="..."` string, which would break on
  the first apostrophe.
- No auth exists on public pages, so repeat-vote prevention is a
  `localStorage` flag (`votedSets: {"<setName>-<year>": "up"|"down"}`)
  — a deterrent, not tamper-proof (clearing storage or switching
  browsers resets it).
- Voting is optimistic: the click immediately updates the displayed
  count and disables/highlights the buttons, before the network
  request resolves. On success the count is reconciled with the
  authoritative server value; on failure (network error, or the
  Lambda's 404 guard for a bad `setName`/`year`) the UI rolls back —
  count, button state, and the `localStorage` entry all revert.

## Orphaned / legacy files

These exist in the repo but aren't reachable from the current site
navigation:

- `Old HTML/` — `pw.html`, `quad2.html`, `signup.html`, `thanks.html`. `cardChecker.html`'s own nav bar still links to `/quad2.html` and `/junkWax.html`/`/classicWax.html` (old pre-query-string URL scheme) — these links are stale relative to the current single-page-per-category + query-string routing used elsewhere (`waxReviews.html?...`).
- `example.html` — a generic Google reCAPTCHA demo snippet, unrelated to this site's own reCAPTCHA usage (if any) or content.
- `styles/styles copy.css` — an apparent backup/scratch copy of the main stylesheet.
- `Lambda Functions/newAllBlogs.html` — not reviewed in this pass; name suggests a scratch/reference HTML file that lived alongside the Lambda prototypes.
