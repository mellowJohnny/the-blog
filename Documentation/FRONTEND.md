# Frontend

Plain HTML/CSS/JS, no framework, no build step, no bundler. Every page
loads a fixed set of `<script src>` tags and wires up behaviour with
`window.addEventListener('load', ...)` / `DOMContentLoaded` handlers
inline in the `<head>`.

## Public pages (repo root)

| Page | Purpose | Key query params | Scripts used |
|---|---|---|---|
| `index.html` | Homepage — shows the "Home Page" blog stream (`blogType=99`), plus the weather widget. | — | `blogs.js`, `helper.js` |
| `tech.html` | Tech / Mach-E / Raspberry Pi blog stream, filtered by `blogType`. | `blogType`, `pageName` | `blogs.js`, `helper.js` |
| `waxReviews.html` | Card set review stream — the main hockey card content. | `year`, `pageName`, `blogCat`, `sortOrder` | `wax.js`, `helper.js` |
| `cards.html` | Static "what is Junk Wax" essay/intro page. No API calls. | — | `wax.js` (unused on this page beyond nav helpers), `helper.js` |
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
| `wax.js` | Card set intro copy (`renderCardIntro()`), `fetchCardSetsByYear()`/pagination/rendering for card set reviews. |
| `helper.js` | Cross-page utilities: `estimateReadingTime()`, date formatting (`fixDate()`, `getMonthName()`), sort comparators (`getSortOrder()` for blogs, `cardSetSorter()` for card sets by star rating), the dynamic top-nav builder (`fetchNav()`/`NAV_MAP`/`NAV_ITEMS`), the "set-o-matic" year-picker table builder (`renderSetPicker()`), hamburger menu toggle, cookie helper, and copyright-year footer. |
| `auth.js` | Cognito OAuth2 code exchange + token refresh, gates every `/cms` page. See `AUTH.md`. |
| `cms.js` | All CMS create/edit/list logic + the S3 image browser/upload modal + TinyMCE init. See `CMS_GUIDE.md`. |
| `adminSMS.js` | Autobus SMS admin page logic: character/segment counter, GSM-7 vs Unicode encoding detection, broadcast send, bulk subscriber import, add-subscriber modal. See `CMS_GUIDE.md`. |
| `cardSlotCalc.js` | `computeGridSpace()` — the Card-O-Matic slot/page calculator, used only by `cardChecker.html`. |
| `quadratic.js` | `quadSolver()` — a quadratic equation solver used by `Old HTML/quad2.html` (not linked from current nav — see "Orphaned pages" below). |
| `pw.js` | `generatePassword()` — a tiny random password generator used by `Old HTML/pw.html`. |
| `magic8Ball.js` | Console-only Magic 8-Ball toy (hardcoded question, `console.log`s the answer — no DOM interaction). Not linked from any page. |

## Navigation system (`helper.js`)

The top nav is entirely data-driven and rebuilt on every page load by
`fetchNav(pageName, blogType)`:

- `NAV_ITEMS` — the master list of every possible nav link (label + href).
- `NAV_MAP` — per-page key (e.g. `"index"`, `"tech"`, `"junkWax"`) → ordered list of which `NAV_ITEMS` to show. `tech`/`ev` pages key off `${pageName}_${blogType}` when a `blogType` is present.
- Adding a new page to the nav means adding one `NAV_MAP` entry; adding a brand-new nav destination means adding one `NAV_ITEMS` entry.

The "set-o-matic" year picker (`renderSetPicker()`) works the same way
— a `categoryRanges` object maps `blogCat` → `{start, end}` year ranges
per page, and the function generates the picker table dynamically
instead of hand-written year links.

## Orphaned / legacy files

These exist in the repo but aren't reachable from the current site
navigation:

- `Old HTML/` — `pw.html`, `quad2.html`, `signup.html`, `thanks.html`. `cardChecker.html`'s own nav bar still links to `/quad2.html` and `/junkWax.html`/`/classicWax.html` (old pre-query-string URL scheme) — these links are stale relative to the current single-page-per-category + query-string routing used elsewhere (`waxReviews.html?...`).
- `example.html` — a generic Google reCAPTCHA demo snippet, unrelated to this site's own reCAPTCHA usage (if any) or content.
- `styles/styles copy.css` — an apparent backup/scratch copy of the main stylesheet.
- `Lambda Functions/newAllBlogs.html` — not reviewed in this pass; name suggests a scratch/reference HTML file that lived alongside the Lambda prototypes.
