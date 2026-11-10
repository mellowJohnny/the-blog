# Frontend

Plain HTML/CSS/JS, no framework, no bundler. The Amplify build has three
steps: the generator that writes the per-review pages, sitemap and link
manifest and pre-renders the nav, footer, year picker and Browse By Set
columns into the HTML (see "Sitemap" and "Navigation system" below), then
a minifier for the public scripts and `styles.css` (see "Minified in
production" under `scripts/`), then a step that deletes `Old HTML Pages/`
from the deployed copy so archived pages aren't published; all are
described in `REVIEW_PAGES.md`. Every page
loads a fixed set of `<script src>` tags and wires up behaviour with
`window.addEventListener('load', ...)` / `DOMContentLoaded` handlers
inline in the `<head>`.

## Public pages (repo root)

| Page | Purpose | Key query params | Scripts used |
|---|---|---|---|
| `index.html` | Homepage — an edge-to-edge image banner (`.home-masthead`; its -8px margins cancel the browser's default 8px body margin, and it scales with the window at every width — see "Home page banner" below) over static intro and post cards written straight into the HTML (see "Home page content" below). **No scores ticker, by design.** No weather widget (its only page, `tech.html`, is archived). Its canonical, Open Graph and Twitter tags are static in the `<head>` — see "SEO and social tags". | — | `helper.js` |
| `waxReviews.html` | Card set review stream — the main hockey card content. Since 2026-10-30 it is two things: the **template** the generator copies into one page per set (`/reviews/<slug>/`, with that set's head tags and `year`/`pageName`/`blogCat`/`setID` fixed in the HTML), and the page that still serves the **old query-string URLs**, which rewrite their own address to the slug page once the set loads. See "Linking to one specific set" below and `REVIEW_PAGES.md`. The title, description, canonical, Open Graph/Twitter tags, JSON-LD and breadcrumb are written by JavaScript for every set (a generated page already has the first four in its HTML) — see "SEO and social tags". | `year`, `pageName`, `blogCat`, `sortOrder`, `setID` (all fixed in a generated page) | `wax.js`, `ticker.js`, `helper.js` |
| `reviews/<slug>/index.html` | **Generated, not in git** (gitignored): one page per live set, written by every Amplify build from `waxReviews.html`, plus `reviews/index.json` (the link manifest). See "Sitemap" below and `REVIEW_PAGES.md`. | — | same as `waxReviews.html` |
| `playerSearch.html` | Player search — find every set a player appears in, across all uploaded checklists, with links to each set's review. See "Player search" below. | — | `playerSearch.js`, `ticker.js`, `helper.js` |
| `lockout.html` | Static essay about the 2004-05 NHL lockout. Special-cased redirect target — see below. Its title, description, H1 and social tags are static in the HTML (nothing sets them from JavaScript any more); the breadcrumb is filled by `renderBreadcrumbs()`. Its `year`/`pageName`/`blogCat` globals are fixed (`"2004"`, `"mcd"`, `"mcd"`), not read from the URL, since the nav, footer and sitemap link to the bare `/lockout.html` (2026-11-06); the old per-year hero-image preload went with them (there is no 2004 hero). It loads no set, so it has no loading spinner. | — | `wax.js`, `ticker.js`, `helper.js` |
| `theJunkWaxYears.html` | Static essay on hockey's "Junk Wax" era (the late-80s/early-90s overproduction boom this site's card reviews mostly cover). Linked from `waxReviews.html`'s junkWax intro copy (`renderCardIntro()`, `wax.js`). Since 2026-11-05 it has no set-o-matic year picker (an essay isn't one of the review pages), and its "Junk Wax Curious?" heading sits inside the essay's `.intro` block, the way the Home page places its heading, so the two line up. Was briefly moved into `Old HTML Pages/` by mistake and missed the site-wide HTML/CSS-conformity and SEO passes as a result — since restored and brought in line with the other pages (masthead/fonts/script-loading now match `lockout.html`'s pattern; a `<meta description="...">` typo, which meant this page never actually had a working meta description, and a broken `class="flex-container, intro"` — a stray comma silently prevented that layout class from ever applying — were also fixed). | — | `ticker.js`, `helper.js` |
| `timeline.html` | Interactive timeline of the Junk Wax era — one flip card per season, built in the browser from a markdown file. See "Junk Wax timeline" below. | — | `timeline.js`, `ticker.js`, `helper.js` |
| `browseBySet.html` | Every live set in two columns (Major Releases; Fast Food Sets), grouped by season, each with Review and Checklist links, plus an `ItemList` JSON-LD block of the same links. Since 2026-11-05 the build pre-renders both columns into the HTML, so it is the one page whose raw HTML links to every `/reviews/<slug>/` page. Carries the scores ticker. Linked from the nav (last item under Major Releases) and footer as "All Sets". See "Browse By Set" below. | — | `browseBySet.js`, `wax.js`, `ticker.js`, `helper.js` |
| `waxMuseum.html` | The Wax Museum: a gallery of wax packs, one flip card per pack (front: pack image, set, details; back: the pack's back image and notes). Data comes from the `WaxPacks` table via `getWaxPacks`, entered in the CMS's wax pack pages. Masthead, nav and footer like the other pages; no scores ticker. See "The Wax Museum" below. | — | `waxMuseum.js`, `helper.js` |
| `about.html` | The About page: the Home page's layout, but its single `blogType` 98 post is fetched, so it stays editable in the CMS. Its H1 is static in the HTML, as are its social tags. Footer link only. See "About page" below. | — | `blogs.js`, `helper.js` |

**No longer live**: `cards.html` (the "what is Junk Wax" essay) and `cardChecker.html` (the "Card-O-Matic" slot calculator) were both moved to `Old HTML Pages/` on 2026-08-15, and `tech.html` (the old Tech / Mach-E / Raspberry Pi blog stream, the only page with the weather widget) and `example.html` (a reCAPTCHA demo) followed on 2026-11-05. Since that date the build deletes `Old HTML Pages/` from the deployed copy (`amplify.yml`), so none of them is reachable any more; they stay in git. See "Orphaned / legacy files" below.

**Page titles** follow one pattern: `Heading - short description | Junk Wax Hockey` (for example "The Wax Museum - vintage and junk wax hockey card wax packs, front and back | Junk Wax Hockey"), in `<title>` and the matching `og:title`/`twitter:title`. Review pages take theirs from the set's CMS SEO fields instead.

**Page headings** share one size: the intro `h1`s (Home, About, The Junk Wax Years), the `.header-style h1`s (Player Search, Timeline, Browse By Set, The Wax Museum, Lockout) and the review pages' intro `h2` are all 34px (one rule in `styles.css`). On the public pages the `.header-style` block is also sized and padded to start exactly where the `.intro` text column does, at every width (a `body:has(.site-footer)` rule, so the `/cms` pages, which share the class, keep their layout). The title sits 13px below the nav (25px below the breadcrumbs, from the trail's bottom padding) with about 23px down to the intro text, the same on every page; the intro block's own padding is one shared rule rather than one per page.

**Section headings** go through two shared rules, so they can't drift apart: an h2 rule (`.blog-title`, `#timelineTitle`, `.browse-col-heading`: 26px navy, 22px on phones) and an h3 rule (`.player-search-set-name`, `.browse-season-heading`: 20px navy). Bylines are one `.byline` class (dark grey, upright), built by `blogs.js` and `buildCardSetMarkup()`. Colours, sizes and markup rules for all of this are binding in `STYLE_GUIDE.md`, and `tools/styleCheck/check.mjs` checks them.

### `waxReviews.html` → `lockout.html` redirect

`waxReviews.html` has an inline script that checks if the URL is
exactly `?year=2004&pageName=mcd&blogCat=mcd` and, if so, immediately
redirects to `lockout.html?year=2004&pageName=mcd&blogCat=mcd` — there
was no 2004-05 McDonald's set (season was cancelled), so this swaps in
the essay page instead of showing an empty/broken review page for that
one year+category combination.

Old links that carry `pageName` but no `blogCat` (for example
`?year=1987&pageName=junkWax`, which Google had indexed from an earlier
version of the site) used to ask the API for `blogCat=null` and show
"coming soon". `resolveBlogCat(blogCat, pageName)` in `helper.js` now
takes the category from `categoryRanges` when `blogCat` is missing, so
those URLs load their set and rewrite to its `/reviews/<slug>/` page like
any other old URL.

### Sitemap

`sitemap.xml` (repo root, referenced from `robots.txt`) lists every
real entry-point page for search-engine crawlers (Google, Bing, etc.).
It is a generated file, and since 2026-10-30 it is **not committed**:
`tools/generateReviewPages/generate.mjs` writes it (and the review pages
and link manifest, see `REVIEW_PAGES.md`) on every Amplify build, from
the live site's own data, and `.gitignore` lists `/sitemap.xml`. A save
to a live set in the CMS starts a build, so the sitemap follows the sets
with no manual step. (Before that, `tools/generateSitemap/generate.mjs`
was run by hand and the result committed; that tool was replaced.)

Every review has its own page (see "Linking to one specific set"), and
the sitemap lists exactly one URL per set: its `/reviews/<slug>/` page,
which is also that page's canonical. The old rule (the bare year URL
for a one-set year, one `&setID=` URL per set otherwise) is gone, since
a multi-set year no longer has a URL that stands for it.

The generator reads the set list from the public `getPublicCardSets`
endpoint (see `API_ENDPOINTS.md`) instead of a hardcoded year list, and
reads `categoryRanges` straight out of `scripts/helper.js` to work out
each set's `pageName`, so those year ranges are no longer duplicated
(they were until 2026-10-30); a live set outside every range stops the
run with an error instead of being silently dropped. The old design (a
hardcoded year-by-year list) had drifted from the site and left three
live years out of the sitemap. If the endpoint is unreachable, or a set
has a missing or duplicate slug, the generator exits without writing and
the build fails, so Amplify keeps the previous deployment. The static
pages (home, Player Search, Lockout, The Junk Wax Years, Timeline,
Browse By Set, The Wax Museum, About) are listed alongside. There are no
`tech.html` URLs: that page is archived and not published.

Search engines re-fetch a submitted sitemap on their own schedule, so
deploying is enough; resubmitting in Search Console only nudges it.

Every URL carries a `<lastmod>` date (YYYY-MM-DD), so a crawler can
tell which pages changed and re-fetch those first:

- a **review** uses its `updatedAt`, which `updateCardSet` writes on
  every CMS save, and falls back to its publish date `now` for a set
  that has never been edited since `updatedAt` was introduced. Both
  fields come back from `getPublicCardSets`. A set's date therefore
  moves when you save it in the CMS, and only then;
- a **static page** uses the date of its last git commit
  (`git log -1 --format=%cs -- <file>`), which works in the Amplify
  build because it has the full history (checked from a diagnostic
  build's log). A page change shows up in `<lastmod>` on the build its
  commit starts;
- a URL with no usable date simply gets no `<lastmod>` rather than a
  made-up one.

Nothing is run or committed by hand any more: the Amplify build runs
the generator (`amplify.yml`), whether it was started by a git push or
by a CMS save.

## `scripts/` — shared JS

### Minified in production

The files described below are the **readable source**. Since 2026-10-30 the
Amplify build overwrites its own copies of the public ones (`helper.js`,
`wax.js`, `ticker.js`, `blogs.js`, `playerSearch.js`, `browseBySet.js`,
`timeline.js`, `waxMuseum.js`) and `styles/styles.css` with minified versions, each with a
linked source map (`x.js.map`) beside it, so the live site serves about half
the bytes (roughly 67 KB to 34.5 KB over the wire, since the CDN already
compresses with Brotli). The URLs are unchanged and nothing is committed
minified. The CMS scripts, `auth.js` and `scripts/fonts/*` are not minified.
Working with it (full details in `REVIEW_PAGES.md`): edit the readable
source only; add any new public script or stylesheet to the list in
`tools/minifyAssets/minify.mjs`; keep top-level `function`/`let`/`const`/`var`
declarations at the start of a line, because the build checks that every such
name survives minification (inline `onclick` handlers and calls between scripts
rely on them) and fails, leaving the previous deployment live, if one doesn't;
and expect a production console error to show a minified line unless dev tools
are open, which load the source map and show the real file and line.

| File | Responsibility |
|---|---|
| `blogs.js` | `fetchBlogs()`/pagination/rendering for the blog stream, which `about.html` uses to load its single editable post. It still holds the Tech pages' intro copy (`renderBlogIntro()`) and the weather widget (OpenWeatherMap, from the visitor's geolocation; the bootstrap does nothing on a page with no `#weather` element), but their only page, `tech.html`, was archived on 2026-11-05. Loaded by `about.html` only. |
| `wax.js` | Card set intro copy (`renderCardIntro()`), `fetchCardSetsByYear()`/pagination/rendering for card set reviews (the fetch goes through `fetchJsonWithRetry()` and `waxReviews.html` starts it on `DOMContentLoaded` — see "SEO and social tags"), `fetchPageTitle()` (sets each shown set's title, description, social tags, JSON-LD and breadcrumb), `reviewPath(item)` and `buildReviewCanonicalUrl(item)` (a set's `/reviews/<slug>/` address and the canonical built from it; the query form only for a set with no slug), `syncSetIdInUrl()` (replaces the address bar with the shown set's slug page — for every set, so an old query-string URL, and each set reached by pagination, ends up on its own clean address), the sort of a year's sets by `compareSetsForDefault()` from `helper.js`, the thumbs up/down vote widget (`castVote()` — see "Voting feature" below), and the checklist modal (`openChecklistModal()`/`closeChecklistModal()`/`renderChecklistGroups()`, plus PDF export via `exportChecklistPdf()`/`buildChecklistPdfDocument()` — see "Checklist display" below; its HTML-escaping now uses the shared `escapeHtml()` in `helper.js`, moved there 2026-08-24 when `playerSearch.js` needed it too). Pagination controls (`renderPaginationControls()`) only render when there's more than one set for a given year/category — most years have exactly one, only 1989-90 onward have multiple; they render inside `displayCardSet()`'s own template, directly above the vote widget, not as a separate element elsewhere on the page. The previous and next entries are real `<a href>` links to the neighbouring set's page (`reviewHref(item)`: the `/reviews/<slug>/` path, or the query form for a set with no slug), not click handlers (`nextPage()`/`prevPage()` were removed), so crawlers follow them and Back works; at either end the missing direction is a disabled `<span>`. The prev/next set name in that label always drops its leading release year (`stripYearFromSetName()` — e.g. "1991-92 Pinnacle" → "Pinnacle"), since the year picker above already shows the year and the shorter label fits a phone. It used to show the full name on desktop and the short one on phones, via a `.pagination-setname-full`/`.pagination-setname-short` pair of spans that a mobile breakpoint swapped between; that pair and its CSS were removed so one rendering path serves every width. The name goes through `escapeHtml()` before it is inserted. The NHL scores ticker and its game modal used to live here and moved to `ticker.js` — see below. |
| `ticker.js` | The NHL/PWHL scores ticker under the masthead (`initNhlTicker()` and its helpers — see "NHL scores ticker" below) and the game modal opened from it (`openNhlGameModal()` and its render helpers — see "NHL game modal" below). Moved verbatim out of `wax.js` so pages that have nothing else to do with card sets (Player Search, the essays) can show the ticker. Starts itself on `DOMContentLoaded`. |
| `timeline.js` | `timeline.html` only: fetches `/timeline/timeline.md`, parses it (`parseTimelineMarkdown()`) and builds the flip cards (`renderTimeline()`, `buildTimelineCard()`). Entry point is `initTimeline()`. See "Junk Wax timeline" below. |
| `browseBySet.js` | `browseBySet.html` only: fetches the live set list once from `getPublicCardSets` (`BROWSE_SETS_URL`), splits it into the two columns, groups by season and builds the Review/Checklist links (`initBrowseBySet()`; `browseReviewUrl()` builds a set's review URL for both the links and the `ItemList` JSON-LD from `setBrowseItemListJsonLd()`: its `/reviews/<slug>/` page when the set has a slug, else the old query-string form). Checklist clicks hand off to `openChecklistModal()` in `wax.js`. The column markup comes from `browseColumnHtml(sets)`, a pure function the build generator also runs (in a Node sandbox) to pre-render the columns into the page, so the two can't drift. See "Browse By Set" below. |
| `waxMuseum.js` | `waxMuseum.html` only: fetches every pack once from `getWaxPacks`, sorts them (`sortWaxPacks()`: oldest year first, then one set at a time A to Z, then series order, then "Low" before "High" packs, then name) and renders the flip cards in batches of six as the visitor scrolls (`renderWaxMuseum()`, `buildWaxPackCard()`). Entry point is `initWaxMuseum()`. See "The Wax Museum" below. |
| `cmsWaxPack.js` | The three CMS wax pack pages (`newWaxPack.html`, `pickWaxPack.html`, `waxPackEdit.html`): the shared form, its fixed manufacturer/packaging/type dropdowns, the front/back image pickers (S3 `img/wax-packs/`), the review-link dropdown (from `getPublicCardSets`), and the save and delete calls, which send the Cognito token. See `CMS_GUIDE.md`. |
| `helper.js` | Cross-page utilities: a generic `escapeHtml()` (moved here from `wax.js` 2026-08-24, shared with `playerSearch.js`), `stripHtmlTags()` (extracted from `estimateReadingTime()`'s own tag-stripping regex so the SEO helpers below can build plain-text descriptions/structured-data fields from the same raw HTML `postBody` without duplicating it), `truncateAtWord(text, max)` (cuts plain text at a word boundary and adds "..." only when it cut — shared by `wax.js`'s description fallback and the CMS SEO generators), `renderBreadcrumbs(pageName, label, url)` with `SITE_ORIGIN` and `BREADCRUMB_CATEGORY_IDS` (the visible breadcrumb nav plus its `BreadcrumbList` JSON-LD), `estimateReadingTime()`, date formatting (`fixDate()`, `getMonthName()`), the generic sort comparator `getSortOrder(property, order)` (used for both blogs, by `time`, and card sets, by `stars` — consolidated from two identical functions on 2026-08-12), the dynamic top nav (`NAV_ITEMS`/`NAV_GROUPS`/`NAV_SELF`/`NAV_MAP`, the pure `navHtml()` and the thin `fetchNav()`; see "Navigation system"), `resolveBlogCat()` (the category for an old review URL that has `pageName` but no `blogCat`), the review-link upgrade (`loadReviewLinks()` fetches `/reviews/index.json`, the manifest each build writes, as soon as `helper.js` runs on any non-CMS page; `applyReviewLinks()` swaps the `href` of every link carrying `data-review-cat`/`data-review-year` or `data-review-setid` to its `/reviews/<slug>/` page, called after the nav, footer, breadcrumb, year picker and Player Search results render; `reviewLinkAttrs()` adds those attributes for a `NAV_ITEMS` entry with a `review` year; `compareSetsForDefault()` is the one rule for which set a bare-year link opens — highest `stars`, ties by `setName` — shared with `wax.js`'s sort; see "Linking to one specific set"), the "set-o-matic" year-picker builder (the pure `setPickerHtml()` plus the thin `renderSetPicker()` — renders as plain flex-wrap `<div>`s, not a table; see "Mobile / responsive design" below) and its `categoryRanges` data (hoisted to module scope 2026-08-24 so `getPageNameForYear(blogCat, year)` — used by `playerSearch.js` to build review links — can share it rather than duplicating the ranges a third time; since 2026-10-30 `tools/generateReviewPages/generate.mjs` also reads this literal straight out of the file, so keep it a plain object literal ending in `};` at the start of a line), the SEO/social meta pair `setPageMeta({title, description, image, url, type})` (creates or updates `<title>`, the meta description, `link[rel=canonical]`, and the Open Graph/Twitter Card tags in one call — now used only by `waxReviews.html`, whose values depend on data (it also served the archived `tech.html`); the static pages carry those tags in their HTML instead, see "SEO and social tags") and `setJsonLd(id, data)` (creates or replaces a `<script type="application/ld+json">` block by id, so a page can update its own structured data as new content loads without accumulating duplicate blocks — see `PUBLIC_PAGE_FLOWS.md` for how `waxReviews.html`/`lockout.html` and the blog pages each use both), `cmsAlert(message)` and `cmsConfirm(message)` (styled, Promise-based replacements for the native `alert()`/`confirm()`, used throughout the CMS — `cmsConfirm()` resolves a boolean and uses a red header instead of `cmsAlert()`'s blue, to flag the more serious/destructive action; see `CMS_GUIDE.md`'s "CMS alert / confirm modals" section; kept here rather than a dedicated file, per the site owner's preference for growing `helper.js` over adding a new `<script>` tag per feature), `applyImgWrapSmSizing()` (sets `--wrap-w`/`--wrap-h` custom properties on every `.img-wrap-sm`/`.img-wrap-md` image in a rendered `postBody`, read from the image's own inline style size, not its `width`/`height` attributes — see "Mobile / responsive design" below and `CMS_GUIDE.md`'s "Wrapped/middle images in review body content"; called once from `wax.js`'s `renderCardSetPage()` after each page's sets have rendered), `buildCardSetMarkup()` (the single source of truth for a card set review's HTML, shared by the live site's `displayCardSet()` and the CMS preview modal's `renderPreview()` — added 2026-09-28 to end the drift between two hand-maintained copies; see "Card set markup is shared with the CMS preview" below), the one loading spinner every public page uses (`showSpinner(container)` — see "Loading spinner" below), hamburger menu toggle, cookie helper, the copyright-year footer line (`fetchCopyrightYear()`) and the public-page footer's link columns (`FOOTER_SECTIONS`, the pure `footerHtml()` and the thin `fetchFooterLinks()` — see "Site footer" below). The nav block and the footer block are each wrapped in `// nav-block:start`/`:end` and `// footer-block:start`/`:end` comments: the build generator runs exactly those slices (plus a few single functions it lifts by name) to pre-render the same markup, so keep the comments and keep those functions free of DOM access. |
| `playerSearch.js` | `playerSearch.html` support code: submits a player-name search to `searchPlayerName`, renders results grouped by set (linked via `getPageNameForYear()` in `helper.js` where a matching `Cards` item exists, plain text otherwise; each link carries `data-review-setid` and `applyReviewLinks()` upgrades it to the set's `/reviews/<slug>/` page); also the type-ahead dropdown (`initPlayerSearchTypeahead()`/`loadPlayerNameIndex()`/`rankPlayerNameMatch()`) that suggests player names client-side from a once-fetched, cached name index. See "Player search" below. |
| `adminTools.js` | `cms/admin.html` support code: a growing set of self-service site-health checks (broken images, review-image alt text and size, review pages deployed, orphaned checklists), each its own function calling the site's existing read APIs directly; the orphaned-checklist check can also delete the ticked checklists through `saveChecklist`. Its `fetchAllCardSets()` (every live set, via `getCardSetsByYear`, shared by the two image checks) happens to share a name with a different function in `cmsCardSet.js` (the CMS pick list); the two files are never loaded on the same page, so they don't clash, but rename one before ever loading both. See `CMS_GUIDE.md`'s "Admin Tools" section. |
| `auth.js` | Cognito OAuth2 code exchange + token refresh, gates every `/cms` page. See `AUTH.md`. |
| `cmsBlog.js` | Blog post CRUD: `createBlogPost`, `updateBlogPost`, `deleteBlogPost`, `getBlogsForUpdate`, `getStagedBlogsForUpdate`, `displayBlogs`, `displayStagedBlogs`, `fetchBlogByID`, `populateBlog`, and the `BLOG_TYPE_LABELS` lookup object. One of 4 files split out of the former `scripts/cms.js` (1592 lines, deleted) on a by-concern basis, moved verbatim with no logic changes. See `CMS_GUIDE.md`. |
| `cmsCardSet.js` | Card-set review CRUD: `createCardSet`, `updateCardSet`, `deleteCardSet`, `fetchAllCardSets`, `fetchAllStagedCardSets`, `displayCardSets`, `displayStagedCardSets`, `fetchCardSetByID`, `populateCardSet`, `openPreview`, `renderPreview`, `closePreview`, and the `CARDSET_CATEGORY_LABELS` lookup object. Split out of the former `cms.js` alongside `cmsBlog.js` — see that row above. Also owns the Star Rating widget shared by `createCardSet.html`/`setEdit.html`: `initStarRatingWidget()` (wires click/hover on the five star icons, called once per page on load) and `paintStarRating(value, containerId)` (the actual paint logic, also called by `populateCardSet()` once a set's real rating loads) — see `CMS_GUIDE.md`'s "Star Rating widget". `renderPreview()` no longer carries its own copy of the review markup: it calls `buildCardSetMarkup()` in `helper.js`, the same builder the live site uses, so the preview can't drift from production — see "Card set markup is shared with the CMS preview" below. |
| `cmsImageBrowser.js` | The S3 image browser/upload modal, both families together since they share code (card-set images and blog images both use `uploadNewImage()`/`closeImageBrowser()`): `fetchImageList`, `renderImageList`, `openImageBrowser`, `filterImageList`, `openBlogImageBrowser`, `fetchBlogImageList`, `renderBlogImageList`, `filterBlogImageList`, `uploadNewImage`, `closeImageBrowser`. Split out of the former `cms.js` — see `cmsBlog.js` row above. `openImageBrowser(targetFieldId, onSelect)` gained an optional callback mode 2026-09-22 — when provided, picking/uploading an image calls `onSelect(fileName, imageUrl)` instead of writing to a form field, which is how the card-image-insert toolbar buttons (`cmsFormUI.js`) reuse this same picker. See `CMS_GUIDE.md`. |
| `cmsFormUI.js` | Generic CMS form UI: `initTinyEditor` (TinyMCE init), `initPreviewEditor` (the inline editor behind the `setEdit.html` preview modal) plus the submit-button state helpers (`cmsButtonSubmit`, `cmsCreateButtonReset`, `changeMeBack`, `cmsUpdateButtonReset`, `changeMeBackUpdate`). Split out of the former `cms.js` — see `cmsBlog.js` row above. `fetchCopyrightYear()`, also formerly in `cms.js`, was dropped entirely during the split rather than migrated to any of these 4 files — it was a byte-identical duplicate of the copy already in `helper.js`, and every page that used the `cms.js` copy already loaded (or gained) `helper.js`. `initTinyEditor(selector, { cardImageBlocks })` gained an options param 2026-09-22 — true only on `createCardSet.html`/`setEdit.html`, it swaps TinyMCE's native image button/plugin for two custom ones (`registerCardImageBlockButtons()`) that insert the site's wrap/middle review images as atomic, non-editable blocks; `stripEditorOnlyMarkup()` removes that editor-only markup before any save. The wrap dialog inserts a fixed 150×150 inline size and offers a **Logo Type** dropdown (All-Star Logo → `img-wrap-sm`, Corporate Logo → `img-wrap-md`, the default) — it briefly auto-computed dimensions from the picked file's `naturalWidth`/`naturalHeight` instead, but that was dropped once wrap images settled on a standard size. See `CMS_GUIDE.md`'s "Wrapped/middle images in review body content". Also hosts the card-set SEO helpers: the **Generate** button functions for the SEO title (no site-name suffix since 2026-10-30), description, keywords and URL slug (`generateSeoTitle()` and friends, built from the form's own values — see `CMS_GUIDE.md`), `seoSlugProblem(slug)` (the required-and-URL-safe check `createCardSet()` and `updateCardSet()` run before saving; the Lambdas repeat it), the length counters and textarea auto-sizing (`updateSeoCharCounts()`, `autosizeTextarea()`), and the middle-image helpers (`imageNaturalSize()`, `fillMiddleImageSizes()`, `middleImageAltDefault()`). Also defines `tinyEditorReady`, a promise resolved with the editor once `tinymce.init()` finishes: `populateCardSet()`/`populateBlog()` set the body through it, since the edit pages' record fetch can finish before the editor exists. |
| `adminSMS.js` | Autobus SMS admin page logic: character/segment counter, GSM-7 vs Unicode encoding detection, broadcast send, bulk subscriber import, add-subscriber modal. See `CMS_GUIDE.md`. |
| `checklistUpload.js` | `cms/uploadChecklist.html` support code: the upload/parse modal (drag-and-drop, mirrors `adminSMS.js`'s bulk-import modal structure/CSS), rendering the parsed result as an editable table, `saveChecklist()`, the Delete Checklist modal (same `.bulk-*` design and open/close behaviour as the upload modal), and that modal's Set Name type-ahead. The type-ahead is deliberately its own copy of `playerSearch.js`'s pattern rather than a shared helper, so the live public Player Search page stays untouched — a known duplication, not an oversight. It differs in two ways: its index is in-memory only (two Cognito-authorized fetches, not a public one worth persisting to `localStorage`), and it renders suggestions with `textContent` since set names contain apostrophes. The modal's group list is likewise read once per set and then edited in memory after each delete, rather than re-queried. See `CMS_GUIDE.md`. |
| `cardSlotCalc.js` | `computeGridSpace()` — the Card-O-Matic slot/page calculator, used only by `cardChecker.html`. **No longer live** — `cardChecker.html` moved to `Old HTML Pages/` on 2026-08-15 (see "Public pages" above); this row previously said "Still live," which went stale when that move happened and wasn't updated here. |
| `quadratic.js` | **Deprecated** (2026-08-12) — `quadSolver()`, a quadratic equation solver used only by `Old HTML Pages/quad2.html`, which is itself orphaned (not linked from current nav — see "Orphaned pages" below). Excluded from future JS work. |
| `pw.js` | **Deprecated** (2026-08-12) — `generatePassword()`, a tiny random password generator used only by `Old HTML Pages/pw.html`, itself orphaned. Excluded from future JS work. |
| `magic8Ball.js` | **Deprecated** (2026-08-12) — console-only Magic 8-Ball toy (hardcoded question, `console.log`s the answer — no DOM interaction). Not linked from any page. Excluded from future JS work. |

## SEO and social tags

Two kinds of crawler read this site, and they differ in the one way that
matters here. **Google runs JavaScript** (Search Console's "View crawled
page" shows the JS-built nav, footer and review text), so anything a
script writes into the page is indexed. **Facebook, Discord, Reddit and X
do not**: they read the raw HTML once, so a preview card is built only
from tags that are literally in the file. A tag that exists only after
JavaScript runs therefore works for search but gives a bare link when
the page is shared. The rules below follow from that.

**Static pages** (`index.html`, `about.html`, `browseBySet.html`,
`playerSearch.html`, `theJunkWaxYears.html`, `timeline.html`,
`waxMuseum.html`, `lockout.html`) hold their `<title>`, meta description, `canonical`, the
`og:` tags (type, title, description, url, image) and the `twitter:`
tags (card, title, description, image) directly in the `<head>`. The
HTML is the only source: their old `setPageMeta()` calls were removed so
the values can't drift between a file and a script. The image on every
one is the site-wide `hellaFilesArch.webp`. `playerSearch.html`'s
canonical is always the bare page, so a `?q=` search never becomes its
own indexed URL. `about.html` and `lockout.html` also hold their H1 in
the HTML (a crawler that doesn't run JS finds no heading otherwise), and
`lockout.html` has its own title and description rather than the
generic review-page ones it used to inherit.

**Review pages.** Since 2026-10-30 a review has two kinds of address.
A **generated page** (`/reviews/<slug>/`, built from `waxReviews.html`
by every Amplify build — see "Linking to one specific set" and
`REVIEW_PAGES.md`) has the set's own title, description, canonical,
`og:` and `twitter:` tags written straight into its HTML, so Facebook,
Discord, Reddit and X show a per-set preview card. The **old
query-string URLs** are served by `waxReviews.html` itself, which can't
hold a correct canonical or title for any one set (it serves every one),
so its HTML carries only *generic* `og:` and `twitter:` fallbacks (title,
description, the site image) and **deliberately no canonical and no
`og:url`**: a fixed one would point all of them at the same page. For
both, once a set loads, `fetchPageTitle()` (`wax.js`) calls
`setPageMeta()`, which writes the set's values again (a no-op change on
a generated page) and, on an old URL, adds the canonical and `og:url`
built by `buildReviewCanonicalUrl()` — the set's `/reviews/<slug>/` page,
or the query form for a set with no slug. The title and description
come from the set's CMS fields (`seoPageTitle`, `seoMetaDesc`); only
when a field is empty does the code fall back to
`<set name> Hockey Card Set Review` (no site-name suffix since
2026-10-30, the same as the CMS Generate button) and to the first ~155
characters of the review text cut at a word boundary (`truncateAtWord()`;
the generator can't see the review text, so a generated page with no
description gets "<set name> hockey card set review from Junk Wax
Hockey." and a warning in the build log). The CMS **Generate** buttons
exist so those fields are filled with something better than the
fallback — see `CMS_GUIDE.md`. What a generated page still lacks is the
review text itself: that is drawn in the browser, so a crawler that
doesn't run JavaScript sees the head but not the body.

**Why the review fetch starts on `DOMContentLoaded` and retries.** One
Search Console snapshot of a review page held the error text from the
fetch's `catch` ("...Ah, Houston, we've had a problem...") instead of
the review, while a Live Test of the same URL rendered it fine, so the
failure was intermittent. Two cheap hedges followed. `waxReviews.html`
now calls `fetchCardSetsByYear()` from its `DOMContentLoaded` handler
instead of `window load`, which also waits on fonts, analytics and the
ticker, so the request starts earlier and has more of the crawler's
render budget. And `fetchJsonWithRetry()` makes one retry after 1.5
seconds, counting a non-OK reply (for example a throttled 429) as a
failure: before, a 429's JSON error body fell through to the "coming
soon - this set is not in my collection yet" message, which is wrong
for a set that exists. After two failures the visitor still sees the
error message.

**Structured data** (JSON-LD, written with `setJsonLd()` so a page that
changes content replaces its block rather than stacking copies):

| Block | Where | Notes |
|---|---|---|
| `Product` with a `Review` and rating | each review on `waxReviews.html` | Set by `fetchPageTitle()` per set. |
| `BreadcrumbList` | `waxReviews.html`, `lockout.html` | `renderBreadcrumbs()` (`helper.js`). |
| `ItemList` | `browseBySet.html` | `setBrowseItemListJsonLd()`: one entry per set that has a review link, in the order the page lists them. |
| `Article` | `theJunkWaxYears.html`, `timeline.html` | Built from the page's own text. |

**Breadcrumbs.** `waxReviews.html` and `lockout.html` have a
`<nav id="breadcrumbs" aria-label="Breadcrumb">` that
`renderBreadcrumbs(pageName, label, url)` fills as `Home > category >
page`, and the same call writes the matching `BreadcrumbList`. The
middle step is the real navigation category the page belongs to (90s
Junk Wax, Classic 80s Sets, McDonald's Hockey, Tim Hortons Hockey,
looked up from `NAV_ITEMS`), not a "Junk Wax Years" step, because
`theJunkWaxYears.html` is an essay and not a parent of the review
pages. For the first set of a category the middle link and the current
page share a URL; that is harmless. Styles are `.breadcrumbs` in
`styles.css`. Only pages below a section carry a trail; the top-level
pages have none on purpose (owner decision, 2026-11-07): a "Home ›
Page" trail adds nothing for visitors, and breadcrumbs aren't a ranking
factor.

**The sitemap** is covered under "Sitemap" above.

**Internal links in the raw HTML (2026-11-05).** Search Console showed 45
old `waxReviews.html?...` URLs as "Duplicate without user-selected
canonical" and none of the `/reviews/<slug>/` pages crawled. The cause:
every link to a slug page was built by JavaScript (the nav, footer, year
picker and Browse By Set columns started as query-string links that
`applyReviewLinks()` upgraded after a fetch), so the raw HTML linked only
to the old URLs, and those all share one raw HTML with no canonical.
Every build now pre-renders the nav and footer into each public page and
review page, the year picker into each review page, and the Browse By
Set columns into `browseBySet.html`, with the final `/reviews/<slug>/`
links already in place (see "Navigation system" and `REVIEW_PAGES.md`).
The browser's code skips drawing a block that is already there, so
nothing flickers from old to new links.

## Navigation system (`helper.js`)

The top nav is entirely data-driven. Since 2026-11-03 it has two
dropdown groups, so the bar holds six items instead of eight links in a
row:

**Home** · **Major Releases ▾** (Classic 80s Sets, 90s Junk Wax, All
Sets) · **Fast Food Releases ▾** (McDonald's Hockey, Tim Hortons Hockey)
· **The Wax Museum** · **Junk Wax Timeline** · **Player Search**

The data lives in four objects in `helper.js`:

- `NAV_ITEMS` — every link (label + href). The footer reads the same labels, so renaming a link renames it in both places. `"about"` is defined here but in no nav list: the About page is reached from the footer only.
- `NAV_GROUPS` — the two dropdowns (`major`, `fastfood`): a label and the `NAV_ITEMS` ids inside, in order. A group id sits in a page's list like an item id.
- `NAV_SELF` — the grouped item a page leaves out of its own dropdown (for example `browseBySet` → `browse`); a group left with no links isn't drawn.
- `NAV_MAP` — per-page key (`"index"`, `"junkWax"`, `"waxMuseum"`, ...) → ordered list of top-level ids. Player Search is always last, with The Wax Museum and the Junk Wax Timeline just before it, and each of those three is left out of its own page's list. The Home page leaves out "Home" (the masthead links there). Adding a page to the nav means adding one `NAV_MAP` entry (and a `NAV_SELF` entry if it is a grouped item); a new destination means one `NAV_ITEMS` entry.

`navHtml(pageName, blogType, hrefFor)` builds the table as a string
(`buildNavCell()`, `buildNavGroupCell()`) and `fetchNav()` writes it into
`#global-nav`, then calls `applyReviewLinks()`. The four review-category
items (`junk`, `classic`, `timmies`, `mcd`) carry a `review: { cat, year }`
entry: in the browser they render with the query-string `href` plus
`data-review-*` attributes and `applyReviewLinks()` swaps in the
`/reviews/<slug>/` URL of that year's default set once the manifest loads.

**Pre-rendered by the build (2026-11-05).** Each public page's
`#global-nav` holds `<!-- nav:start --><!-- nav:end -->` markers and
names its `NAV_MAP` key in `data-nav-page` (Lockout uses `mcd`, since it
is reached from the McDonald's links). Every build runs `navHtml()` in a
sandbox with an `hrefFor` that gives each review-category link its final
`/reviews/<slug>/` URL and writes the result between the markers, on the
static pages and on every generated review page (whose key comes from
the set). `fetchNav()` returns early when `#global-nav` already holds a
nav, so the browser never redraws it. The footer works the same way
(`footer:start`/`footer:end` markers, `footerHtml()`). A missing marker,
missing `data-nav-page` or unknown key fails the build. `tech.html` was
the one page left JS-built, and it is archived.

**Behaviour.** A dropdown opens on hover (CSS) or on click/tap/Enter
(`toggleNavGroup()` toggles `.open` and `aria-expanded`); Escape or a
click outside closes it (`closeNavGroups()`). In the phone/tablet
hamburger menu every group is shown expanded: the group name is a
non-interactive heading and its links are indented beneath it.

**Look.** The bar is Nunito 600, 18px, uppercase with 0.08em letter
spacing, the same type as the footer. Dropdown links keep their written
capitalisation (`text-transform: none`, normal letter spacing) and are
20px on desktop (the nearest type-scale size, `STYLE_GUIDE.md`), since
mixed case reads smaller than the bar's capitals.

The "set-o-matic" year picker works the same way: `categoryRanges` maps
`blogCat` → `{start, end}` year ranges per page, and the pure
`setPickerHtml(year, blogCat, pageName, hrefFor)` builds one flat list of
`<div>` year cells (no `<table>`) into a single `.card-set-nav` flex-wrap
container — see "Mobile / responsive design" below for why it's
`<div>`-based. In the browser `renderSetPicker()` writes it with
query-string links that `applyReviewLinks()` upgrades; each generated
review page has it pre-rendered between `set-picker` markers with the
final `/reviews/<slug>/` links (the year's default set, the same one
`applyReviewLinks()` would pick), and `renderSetPicker()` then leaves it
alone. A year with no live set (2004 McDonald's, the lockout) keeps its
query link, which redirects to `lockout.html`.

## Mobile / responsive design

The main content layout has two layers. At 600px and below, `@media
(max-width: 600px)` in `styles/styles.css` makes `.flex-container div`
(the main content-width wrapper, see below) fluid. Above 600px it is a
fixed `1000px` box with 15px of padding and 5px of margin, about 1040px
in all, which is wider than any screen under roughly 1060px. A second
band, `@media (min-width: 601px) and (max-width: 1060px)`, covers
tablets: it sets the width to the viewport minus the margins, capped at
1030px, with `box-sizing: border-box`, so the padding and margin stay at
their desktop values but fit inside the screen. The cap makes the band's
upper end meet the desktop size exactly, so nothing jumps at 1061px.
Without that band the review pages scrolled sideways between 601px and
about 1060px, because `.flex-container div` applies to every nested
div, not just the outer wrapper.

The global nav has its own breakpoint at 1220px. At 1220px and below
the hamburger menu stays active (normally phone-only), and from 1221px
the full `<table class="nav-table">` (one `<td>` per top-level item,
built by `navHtml()` in `helper.js`) takes over. The table needs to
fit on one line: below its natural width it shrinks each cell until
label text wraps mid-word. The widest bar (six items, in uppercase
Nunito) measures about 1185px, so 1221px leaves about 20px of headroom;
a wrapped bar was measured at 1201px. The `@media (min-width: 1221px)`
block (further down the file) is what turns the hamburger back off and
shows the table. When an item is added or a label changes, re-measure
the widest bar and move all three 1220/1221 values together (`max-width:
1220px`, the tablet band's `max-width: 1220px` and `min-width: 1221px`).
Fonts are self-hosted and preloaded, so the bar normally paints in
Nunito; a probe once caught it at 1241px in the fallback face before
Nunito loaded, which is why the headroom matters.

Within the hamburger range, a narrower band, `@media (min-width: 601px)
and (max-width: 1220px)`, bumps the hamburger icon and open-menu sizing
up (32px → 48px icon, 14px → 20px menu text, more generous link
padding) beyond the phone-tuned defaults. A tablet's screen is big
enough that phone-sized controls read as too small.

A round of mobile-responsiveness work (waxReviews.html, the
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
  on for their intended 1000px content column). Recurred again on
  `playerSearch.html`: the shared rule was also forcing every
  `.player-search-group` result div to `width: 1000px`/its own
  padding+margin, which both misaligned the results (pushing the whole
  block into overflow, since `#playerSearchResults` itself has to
  flex-shrink to fit but its own forced-width children didn't) and
  silently stomped that div's *intended* spacing/border-bottom, since
  the shared rule's specificity beat it too. Same fix pattern: an
  `#playerSearchResults .player-search-group` override, not touching
  the shared rule. Recurred a third time on `displayCardSet()`'s new
  `.set-details-grid` (see below): its child divs (`.set-details-name`/
  `.set-details-image`/`.set-details-list`) inherited both the
  1000px-desktop and 100%-mobile versions of the shared rule, quietly
  overriding the grid's own `width`/`padding`/`margin`. Same fix again:
  `#cardSetDiv .set-details-grid` / `.set-details-name` /
  `.set-details-image` / `.set-details-list` overrides. Recurred a
  fourth time on `playerSearch.html`'s type-ahead dropdown: the new
  `.player-search-input-wrap` (wraps the input + suggestions list, for
  `position: relative` positioning) is itself a `<div>` nested inside
  `.flex-container`, so it silently inherited the shared rule's 15px
  padding/5px margin too, pushing the actual input box 20px right of
  the label/button/intro text above and below it - not caught until the
  site owner noticed the misalignment visually. Same fix again:
  `#player-search-form .player-search-input-wrap` overriding
  `padding`/`margin` back to `0`.
- **`<table>` elements resist non-table `display` overrides
  unpredictably across browsers.** Several bugs this round traced back
  to forcing `display: flex`/`display: block` onto a `<table>`/`<tr>`
  while a sibling kept a mismatched table-related display role (or to
  `display: contents` on a `<tr>`, which is a known-unreliable
  combination in Safari specifically). The fix each time was the same:
  stop fighting the table model and use plain `<div>`s with flexbox
  instead — see the set-o-matic picker (`renderSetPicker()` in
  `helper.js`) and the footer caption/image block
  (`.set-footer-table-style` in `buildCardSetMarkup()`, `helper.js`,
  rendered by both `displayCardSet()` and the CMS preview), both of
  which used to be `<table>`s and are now `<div>`s for exactly this
  reason.
- **A `rowspan`'d table cell can't be visually reordered above the rows
  it spans, via a breakpoint or otherwise.** `displayCardSet()`'s
  set-details box used to be a `<table>` with the set name and a
  `rowspan`'d header-image cell sharing row 1 — on mobile this squished
  the name into a narrow column beside the image instead of the name
  spanning full width above it, because the mobile CSS set `tr {
  display: block }` (stacking most rows correctly) but never `td {
  display: block }` too, so row 1's two cells stayed `display:
  table-cell` and kept competing for width regardless. Fixed by
  replacing the table with CSS Grid (`.set-details-grid`, three
  independent `grid-area`s: `.set-details-name`/`.set-details-image`/
  `.set-details-list`) — desktop defines `grid-template-areas` as
  `"name image" "list image"` (matching the old layout exactly),
  mobile redefines it as `"name" "image" "list"` in one column. No
  table semantics involved, so no rowspan fight. `cms/cmsCardSet.js`'s
  `renderPreview()` (the `setEdit.html` preview modal) used to keep its
  own copy of the old table-based markup, which silently drifted from
  production several times (top padding, image alignment, a missing
  Checklist row, a missing publish date). Both now render from one
  builder, `buildCardSetMarkup()` in `scripts/helper.js` — see "Card
  set markup is shared with the CMS preview" below.
- **A higher-specificity rule elsewhere can silently neutralize a
  lower-specificity `!important` cap, even when both use `!important`.**
  `.img-wrap-left`/`.img-wrap-right` (small hand-inserted logo images
  in a card set's `postBody`, e.g. the All-Star Game logo on
  McDonald's sets — see `CMS_GUIDE.md`'s "Wrapped/middle images in
  review body content") carried a `max-width: 50px !important` cap that turned out
  to have been dead code since the day it was added (2026-08-09):
  `.set-details-author img { max-width: 100% !important; height: auto
  !important; }` sits lower in the file and has higher specificity
  (class+element, 0,1,1, vs. class alone, 0,1,0), so it always won —
  these images actually rendered at whatever size the CMS content set,
  completely unconstrained, on every breakpoint, the whole time. Same
  root cause as the `.flex-container div` issue above (a broad selector
  outranking a narrower one that assumed it would win), just a
  different selector pair. Found while building real mobile scaling for
  these images; fixed by scoping the new rules under `.set-details-author
  img.img-wrap-sm`/`.img-wrap-md` (0,2,1) to out-specificity the 100%
  rule. The original dead 50px cap on `.img-wrap-left`/`.img-wrap-right`
  themselves was left in place, still inert — not removed as part of
  this fix.
- **`transform: scale()` shrinks an element visually but doesn't reflow
  surrounding layout.** The first attempt at the mobile image scaling
  above used `transform: scale(0.25)` on `.img-wrap-sm` — a true
  "percentage of the image's own current size" shrink needing zero
  per-image CSS values. But `transform` doesn't affect the box model:
  the floated image's original full-size box stayed reserved, leaving
  an unacceptable blank gap next to the now visually-tiny image, with
  wrapped text held at arm's length from it rather than flowing in
  close. Replaced with real `width`/`height` overrides instead:
  `applyImgWrapSmSizing()` (`helper.js`, called from `wax.js` once each
  set's `postBody` renders) reads each `.img-wrap-sm`/`.img-wrap-md`
  image's actual rendered size and sets `--wrap-w`/`--wrap-h` custom
  properties from it, so the mobile rule's `calc(var(--wrap-w) * 0.5)`
  (`.img-wrap-sm`) / `* 0.65` (`.img-wrap-md`) resizes the real box and
  lets text reflow tight against the smaller image. It reads the
  inline `style` width/height specifically, not the `width`/`height`
  attributes — older `postBody` content has cases where the two have
  drifted out of sync (the attribute left stale after the style was
  hand-edited), and the style is what actually determines the
  desktop-rendered size.
- **A percentage width chosen for desktop can compound into a visibly
  smaller image on a phone.** The middle image in a review body
  (`.card-middle-img`, inserted by the CMS) is 75% of the text column;
  on a 390px phone that column is only about 354px, so the image came
  out at 268px, noticeably narrower than the header image (320px) and
  footer image (354px) above and below it. The phone block now sets it
  to 100% of the column, with `box-sizing: border-box` so its 2px border
  stays inside that width (this codebase has no global border-box
  reset). Desktop keeps 75%. The CMS also records the image's real
  `width`/`height` attributes (see `CMS_GUIDE.md`); the rule
  `.set-details-author img { height: auto !important }` keeps the
  picture proportional while the attributes let the browser reserve its
  space before it loads.
- **A percentage `width` plus `padding` on the same box needs
  `box-sizing: border-box`, or the padding renders as *extra* width
  rather than eating into it.** `.checklist-modal-content` (the
  checklist modal — see "Checklist display" below) is `content-box` by
  default (the browser default; this codebase doesn't reset it
  globally); at its `width: 92%`/`padding: 16px 18px` mobile rule that
  rendered a few px wider than the viewport itself, bleeding past the
  right edge of the screen on a real phone (caught on an iPhone 14).
  Fixed by adding `box-sizing: border-box` to the shared rule.
- **A bleed-to-the-edge negative margin has to be re-matched at every
  breakpoint that changes the parent's padding, or it over/undershoots.**
  `.checklist-modal-masthead` cancels `.checklist-modal-content`'s
  padding with an equal-and-opposite negative margin so its background
  bar spans the full modal width instead of stopping at the padding
  line. Its desktop values (`-32px` margin / `32px` padding) matched
  the desktop content padding, but the mobile breakpoint shrinks that
  content padding to `18px` without touching the masthead - so the
  unchanged `-32px` overshot by 14px a side, bleeding the masthead past
  the modal (and on a narrow phone, the viewport) edge, the same
  overflow as the `box-sizing` bug above but from a different cause.
  Fixed with a matching mobile override (`margin: 0 -18px 16px -18px;
  padding: 14px 18px;`) inside the same media block.

## Typography / fonts

Since a font audit and cleanup on 2026-11-05 the site uses four
families, all **self-hosted** from `/fonts/` and declared once, in a
"Fonts" block at the top of `styles.css`. No page loads anything from
Google Fonts.

| Family | Role | Weights / styles loaded |
|---|---|---|
| **Nunito** | Wayfinding: the nav bar and dropdowns, the footer, the year picker and its heading, Browse By Set's Review/Checklist links, the Flip pills | 200, 600 |
| **Source Sans 3** | All other text: headings (including Browse By Set's column and season headings since 2026-11-07), intros, review bodies, set details values, the ticker, modals, the CMS. It is also the `body` default on the public pages (`body:has(.site-footer)`), so text with no rule of its own never falls back to the browser's serif | 400, 700, italic 400, italic 700 |
| **Bebas Neue** | The "Junk Wax Hockey" masthead and the checklist modal's masthead | 400 |
| **Special Elite** | The typewriter accent on review pages: set details field names and values table, captions, the Checklist link | 400 |

**How they're served.** Each family is the woff2 Google serves (one
variable file per subset and style), in latin and latin-ext, with
Google's version in the filename (`source-sans-3-latin-v20.woff2`).
Every face has Google's `unicode-range`, so the latin-ext file downloads
only for text that needs it (names like Hašek), and `font-display:
swap`. A variable file gets one `@font-face` per weight we use, so a
request for a weight we don't load resolves to the nearest loaded one
exactly as before (a 700 Nunito request gets 600, not real bold).
Browsers fetch a font file only when text on the page uses it, so
Special Elite downloads only on review pages. `customHttp.yml` (Amplify
custom headers) gives every `.woff2` a one-year `immutable` browser
cache; that's safe because a font update gets a new filename. The
licences sit beside the files (`fonts/LICENSE-*.txt`: SIL OFL 1.1 for
Nunito, Source Sans 3 and Bebas Neue, Apache 2.0 for Special Elite), and
`fonts/README.md` says how to update them. The checklist PDF export
embeds its own copies of Bebas Neue and Source Sans 3
(`scripts/fonts/*.js`), separate from page rendering.

**What was removed and why.** Work Sans (it set headings and intros;
replaced by Source Sans 3 after comparing mockups, option B), Spicy Rice
(used only by the archived `tech.html` masthead), Fira Code (used only by
the CMS empty-list messages) and Source Sans 3's unused 200 weight. Rules
that asked for weights a family doesn't have now ask for the one that
renders (Source Sans 3 600 → 700, Bebas Neue 500 → 400), which changed
nothing on screen. Source Sans 3 italic files were added, so `<i>`/`<em>`
in review bodies are true italics instead of slanted uprights. Special
Elite has no bold: its bold field names are the browser's synthesised
bold, kept on purpose (commented in `styles.css`); its faked italic on
`.card-table-style td` was removed. The footer's copyright line and the
WLCMS link ask for Nunito 200 explicitly (they used to ask for 400 and
silently get 200), and the Flip pills, which sit inside buttons that
don't inherit the page font, name Nunito 600 themselves. The hamburger
`☰` uses `system-ui`, since the glyph isn't in any of our fonts.

**Keeping the swap from moving the page.** Text used to render in Arial,
then jump when the web fonts arrived (the biggest layout shift on review
pages, 0.355 on PageSpeed). Two things work together:

- Every public page preloads `nunito-latin` (the nav and footer) and,
  where it has the masthead, `bebas-neue-latin`; `waxReviews.html` (and
  so every generated review page) also preloads the latin Source Sans 3
  and Special Elite files. The files are requested with the HTML instead
  of after the stylesheet is parsed.
- `styles.css` defines a metric-matched fallback face per text font
  ("Source Sans 3 Fallback", "Nunito Fallback"): Arial scaled with
  `size-adjust`, `ascent-override` and `descent-override` to the web
  font's average glyph width and line box, and every `font-family` stack
  lists it between the web font and `sans-serif`. Any swap that still
  happens then moves the text by almost nothing. The numbers were
  computed with fontTools from the real font files (Nunito matched to
  weight 600, its common use). `local("Arial")` doesn't exist on
  Android, where the stack falls through to plain `sans-serif`.

**`styles.css` itself is not preloaded or swapped** — every public page
loads it with a plain blocking `<link rel="stylesheet">`. It used to use
a `preload`+`onload` swap (non-render-blocking), but that meant a
visible flash of unstyled content on every navigation, compounded by
the CDN's `max-age=0` browser caching forcing a revalidation each time.
A missing font only swaps to a fallback; missing CSS breaks the whole
layout, so the stylesheet blocks and the fonts don't.

The pseudo-headline convention inside body content is deliberate: card
reviews use `<p class="caption">` (Special Elite) baked into the stored
`postBody`, while the blog posts used plain bold text.

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

**Random team colors + cheer label + pop-in animation**: `applyRandomMastheadStyling()` (`helper.js`) runs on load on all 7 pages using this masthead (`waxReviews.html`, `lockout.html`, `playerSearch.html`, `theJunkWaxYears.html`, `timeline.html`, `browseBySet.html`, `waxMuseum.html`) — picks one of 32 NHL teams at random from `NHL_TEAM_COLORS`, sets `--team-primary`/`--team-tertiary` CSS custom properties that drive `.wax-reviews-mast-table`'s gradient (a simpler solid+stripe design via `.masthead-two-color` for genuinely two-color teams), and creates/reuses a `.masthead-team-label` span in the bottom-right corner showing that team's cheer text (e.g. "Go Canucks Go!") so the random pick is visually verifiable. That label's text is rendered via `renderLoudText()`, which wraps each character in its own `.loud-char` span with a staggered `animation-delay` — `styles.css`'s `loudPopIn` keyframes then pop/rotate each letter in on a delay, purely because a CSS `animation` on an element plays automatically the moment that element exists in the DOM (no JS trigger needed, since the label is fully torn down and rebuilt on every load rather than reused in place). `prefers-reduced-motion: reduce` skips the animation and shows the finished text immediately.

## Page speed decisions (review pages)

Measured with PageSpeed Insights mobile on `/reviews/1992-93-fleer-ultra/`,
2026-10-30. After the changes in this pass: CLS 0.355 to 0, LCP 6.2 s to
5.2 s (Lighthouse's slow-phone simulation), while a throttled real browser
reaches the header image at about 2.1 s and PageSpeed's own observed
breakdown is about 1.9 s. What was done, and why it was enough:

- Header and footer images carry `width`/`height` (see "Card set markup"),
  the fonts don't swap visibly ("Typography / fonts"), the year picker
  draws on `DOMContentLoaded`, and pagination uses real links.
- LCP is the set's header image, whose `<img>` is created by JavaScript.
  The generated head preloads the image and the set-data request
  (`REVIEW_PAGES.md`, "Loading speed"), and API Gateway compression is on
  (`ARCHITECTURE.md`).

Left alone on purpose, so nobody re-opens them without a reason:
`styles.css` as a render-blocking request (about 40 ms, unscored; it must
block, see "Typography / fonts"), "reduce unused CSS" (one sitewide
stylesheet, unscored; splitting it adds requests and lets the CMS preview
drift from the live page), and the larger fix of writing the header image,
or the whole set details, into the generated HTML (it would take simulated
LCP well under a second, but is a bigger change to how pages are built;
revisit if field data after about 2026-12-01 still shows a slow LCP).

## Buttons

Every site/CMS button shares one rounded style, defined once in a
"Buttons" block in `styles/styles.css` (placed after each button's own
rule, so it wins at equal specificity), with tokens on `:root`
(`--btn-radius`, `--btn-secondary-border`, `--btn-secondary-hover`):

- **Primary** (the default): filled, 10px corners, and a thin outer ring
  in the button's own colour — `box-shadow: 0 0 0 1px #fff, 0 0 0 2px
  var(--btn-ring)`. Every action button is the CMS blue
  (`--color-button`, `#256386`); destructive ones (`.delete-btn`,
  `.cms-confirm-confirm-btn`) are red (`--color-red`, `#a83232`) and set
  `--btn-ring` to match. Hover darkens via
  `filter: brightness(0.92)`; keyboard focus gets an outline.
- **Secondary**: white with a grey border and no ring — every Cancel and
  every pure-dismiss Close. Comes from `.bulk-btn-cancel`,
  `.cms-confirm-cancel-btn`, or the `.btn-secondary` modifier on an
  `.input-button` (blogEdit/setEdit's Cancel).
- **Disabled**: the same button at 45% opacity — Parse/Upload before a
  file is picked, Add Subscriber until both fields are filled.
- **Compact**: the checklist modal's Print/Download PDF buttons and the
  two triggers on `cms/uploadChecklist.html` keep a smaller padding.

Covered classes: `.input-button`, `.bulk-btn`, `.cms-alert-ok-btn`,
`.cms-confirm-cancel-btn`, `.cms-confirm-confirm-btn`,
`.checklist-modal-print-btn`, `.checklist-modal-pdf-btn`,
`.autobus-send-btn`. **A new button class has to be added to that
grouped selector** to pick the style up; a per-button rule should only
set its fill colour (and `--btn-ring`), never its own radius, padding
or hover. Inline `style=""` on a button bypasses all of this — the image
browser's Choose File/Upload controls were converted from inline styles
to `.input-button` for exactly that reason. Deliberately excluded: the
👍/👎 `.vote-btn` pills, the `.cms-nav-parent` dropdown toggles, `×`
close icons, the hamburger, and TinyMCE's own toolbar buttons.

## Loading spinner

Every public wait for data uses one spinner, `showSpinner(container)` in
`helper.js` (2026-11-07). Before it, loading looked four different ways:
two copies of the same full-screen spinner (Player Search, the Wax
Museum), "Loading..." text (All Sets, Timeline, both modals) and a blank
box (the review pages, About).

- **Two placements.** With no argument it shows a small white card
  centred on the screen (`.site-spinner-overlay`, built on first use and
  appended to `body`, so no page carries spinner markup). Until
  2026-11-08 this was a full-screen white wash; the owner picked the card
  from a set of mockups so the page stays visible. The page also stays
  usable during a load (a second search just replaces the first). The
  card has a fixed width, so it doesn't resize as phrases of different
  lengths rotate. Given an element, it puts the same
  ring inside it (`.site-spinner-inline`), which is how the checklist and
  NHL game modals show it without stacking an overlay on the modal.
- **The 500ms delay.** It appears only if the load takes longer than
  500ms (300ms until the owner raised it, 2026-11-07), so a fast load
  never flashes it. It returns a `hide()` function
  that each caller runs when the fetch settles, success or failure;
  `hide()` cancels the delay, so a fast load never shows anything. A
  counter keeps overlapping overlay calls (two quick Player Searches)
  from hiding it early.
- **The fun text.** Under the ring, `startSpinnerText()` types a random
  phrase from `SPINNER_PHRASES` a letter every 50ms behind a blinking
  block cursor (`.site-spinner-cursor`, in the text colour), and picks a
  different one every 2 seconds. The untyped rest of the phrase is laid
  out but invisible (`.site-spinner-text-rest`), so the centred text
  doesn't slide sideways as it grows. The typed text, cursor and rest are
  built once and only their text changes, because re-rendering the cursor
  would restart its blink. The phrase is `aria-hidden`; screen readers
  get the box's `role="status"` and `aria-label="Loading"` once instead of
  a new phrase every second.
- **Where it's used.** `runPlayerSearch()`, `initWaxMuseum()`,
  `initTimeline()`, `fetchCardSetsByYear()` (it covers the retry pause),
  `fetchBlogs()` (About), `openChecklistModal()` and `openNhlGameModal()`.
  Error messages still go in each page's own status element.
- **Tapping a link (touch devices, 2026-11-07).** On a slow phone
  connection a tap gave no sign it worked until the next page arrived.
  `showNavigationSpinner()`, one document `click` listener on public pages,
  shows the overlay when a tap on a touch screen with no hover
  (`(hover: none) and (pointer: coarse)`) follows a link that leaves the
  page. It skips links a page handles itself (`defaultPrevented`: the
  Checklist links), new-tab and download links, `mailto:`/`tel:`, and
  `#hash` links on the same page. It uses the same 500ms delay, so a fast
  page change shows nothing. A `pageshow` listener hides it when Back
  restores a page from the back/forward cache (which would otherwise
  come back with the overlay up), and a 20-second timeout hides it if
  the navigation never completes. Desktop keeps the browser's own
  indicator (owner decision).
- **All Sets refreshes silently.** The build pre-renders its list, so
  `initBrowseBySet()` shows the spinner only when the columns start empty
  (an unbuilt local checkout). Whiting out a list that's already on
  screen would be worse than no indicator.
- **The CMS copy.** The SMS tool's `#autobus-spinner-overlay`
  (`adminSMS.js`) shares the ring's CSS, but has its own markup and no
  text, and deliberately stays a full-screen overlay: it also blocks taps
  while a broadcast is sending.

## Card set markup is shared with the CMS preview

The live site (`displayCardSet()`, `wax.js`) and the CMS preview modal
(`renderPreview()`, `cmsCardSet.js`) render a card set review from one
builder: `buildCardSetMarkup()` in `scripts/helper.js`. `helper.js` is
already loaded by both `waxReviews.html` and `cms/setEdit.html`, the
same way `escapeHtml()`/`estimateReadingTime()`/`fixDate()` are shared.

This replaced two hand-maintained copies of the same template. They
drifted repeatedly — by the time they were merged the preview was
missing the details block's top padding, top-aligning the header image
instead of centering it against the details column, never rendering
the Checklist row, and omitting the publish date from the author line.
None of that was visible to the person relying on the preview to see
what would go live.

Worth knowing when changing either side:

- Optional rows (Checklist, Print Run) are left out entirely when their
  value is absent — `printRun` is also treated as absent when blank or
  whitespace, and is escaped via `escapeHtml()` since it's free text.
- The builder covers the set-details grid, the author/body table and
  the footer block only. Pagination controls and the vote widget stay
  in `displayCardSet()` — they're live-site interactions, not part of
  what an author previews.
- `interactive: false` (the preview) renders the Checklist link
  without its `onclick`. `openChecklistModal()` lives in `wax.js`,
  which `setEdit.html` doesn't load, so a live handler would throw.
  The markup is otherwise identical, so it still looks the same.
- Callers pass fully-built image URLs (`headerImgUrl`/`footerImgUrl`).
  The live site concatenates the S3 prefix the API returns; the CMS
  concatenates its own known `img/cards/` base.
- The header image is written `width="620" height="294"` and the footer
  `width="890" height="325"`: the median sizes of the existing files, so
  the browser reserves about the right box before the image loads (the
  alternative, re-shooting every image to one size, wasn't needed). The
  CSS keeps `height: auto` on both (`.table-footer-img` gained it with
  this change) so the attribute never stretches an image to a fixed
  height. A file with a different shape (the 1992-93 Upper Deck header is
  620x360) still moves the layout a little once it loads. Middle images
  already get their dimensions from the CMS when the review is saved.
- The preview needs the set's `now` (date) and `hasChecklist` values,
  which aren't form fields — `fetchCardSetByID()` stashes them in
  module-level variables for `renderPreview()` to read. Note the field
  is `now`, not `date` (see `DATA_MODEL.md` on field naming).
- `.set-details-grid` sets `width: 100%` deliberately. Its percentage
  column tracks shrink-wrap to content when the parent's width is
  indefinite, which is the case inside the preview modal but not under
  `#cardSetDiv` (where `.flex-container div` forces a fixed width).
- The modal's typography rule is `.preview-modal`, **not**
  `.preview-modal *`. The old blanket selector (with `!important`)
  destroyed the real `.set-details-*` styling inside `#previewContainer`
  and had to be undone by hand with markup-specific selectors for every
  change — it was the mechanism behind the drift. Don't reintroduce it;
  target the specific offending rule instead.

## Voting feature (waxReviews.html)

Each card set review ends with a thumbs up/down widget (`castVote()`
in `wax.js`) — see `Documentation/API_ENDPOINTS.md` for the endpoint
contract and `Documentation/LAMBDA_FUNCTIONS.md` for the backend
(`Lambdas/castVoteHandler/`). Frontend behavior worth knowing:

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

## Checklist display (waxReviews.html)

Connecting the `Cards` and `Checklists` tables on the public site was
built as two steps. **Step 1**: `displayCardSet()` in `wax.js` takes a
`hasChecklist` param (the `Cards` item's own `hasChecklist` boolean —
see `DATA_MODEL.md`, set by `saveChecklist` the first time a checklist
is uploaded for that exact `setName`) and, when true, adds a row to the
set-details table between Manufacturer and Rating, bumping the
header image cell's `rowspan` from 7 to 8 to match. **Step 2** (built
after Step 1 shipped) turned that row into an actual "Checklist" link
that opens a modal displaying the full checklist, fetched on demand
from `getChecklistBySetName` — see `LAMBDA_FUNCTIONS.md` and
`API_ENDPOINTS.md`.

- **The link**: `<a class="checklist-view-link" data-set-name="...">Checklist</a>`,
  styled as a bold underlined blue link. `setName` is passed via a
  `data-set-name` attribute (same reasoning as the vote buttons above —
  avoids breaking on an apostrophe in an inline `onclick` string), read
  by `openChecklistModal(link)`.
- **The modal**: one shared `#checklistModalOverlay` in `waxReviews.html`
  (not rebuilt per set) — `openChecklistModal()` sets its title, adds
  `body.checklist-modal-open`, shows the overlay, then fetches and
  fills it in. `closeChecklistModal()` reverses all of that; the
  backdrop-click-to-close handler routes through this same function
  rather than toggling the overlay directly, so the body class is
  always correctly removed. 75% width (max 1400px) on desktop, 92% on
  mobile (`@media (max-width: 600px)`, matching the site's one
  breakpoint — see "Mobile / responsive design" above); cards render in
  a 3-column CSS multi-column layout (1 column under 600px).
- **Grouping/ordering**: `renderChecklistGroups(items)` groups the
  fetched items main-set cards first, then each insert set by name, and
  sorts within each group by `sortIndex` — never by raw fetch order,
  since the DynamoDB sort key sorts as a plain string (`"INSERT#"`
  sorts before `"MAIN#"`, and card numbers don't sort numerically) —
  see `DATA_MODEL.md`. The actual grouping/sorting/labeling logic lives
  in a pure helper, `buildChecklistGroups(items)`, extracted out of
  `renderChecklistGroups()` when PDF export (below) was added —
  it returns already-grouped/sorted/labeled data (`[{title, cards},
  ...]`, "Main Set" first) with no DOM involved, and both the on-screen
  HTML renderer and `buildChecklistPdfDocument()` call it, so the two
  outputs share one source of truth for grouping instead of two
  hand-maintained implementations that could drift apart.
- **Extended Set groups**: items with `type === "extendedSet"` (a
  mail-away or box set that belongs with the main set, ticked in the CMS
  upload page) form their own groups titled `"Extended Set - <name>"`,
  placed right after "Main Set" and before every insert group (several
  sort alphabetically), with no Insert Set/Memorabilia suffix logic.
  They are not inserts, so "Inserts only" hides them.
- **Insert set group titles carry a type suffix**: each insert set's
  heading renders as `"<name> - Insert Set"` (e.g. `"Powerhouse
  Pillars - Insert Set"`), except when any card in that group has
  `"MEM"` as a whole word in its `notes` (memorabilia/jersey relic
  cards), in which case the whole group is labeled `"<name> -
  Memorabilia"` instead (e.g. `"NHL Jerseys - Memorabilia"`). `"Main
  Set"` is unaffected — the suffix only applies to insert set titles.
  Every `"- Insert Set"` group also renders before every `"-
  Memorabilia"` group, regardless of their relative order in the
  fetched items — a stable sort (`Array#sort` is stable in modern JS)
  on the `isMemorabilia` flag reorders the two categories as a block
  without disturbing either category's own internal order.
- **Checklist filters ("Inserts only" and "Rookies only")**: two
  badge-style checkboxes (`.checklist-modal-filter`, wrapped in
  `.checklist-modal-filters`) on the same row as the set-name title,
  right-justified. Filters client-side only — `openChecklistModal()`
  caches the fetched items in a module-level `currentChecklistItems`,
  and toggling either checkbox calls `applyChecklistFilters()`, which
  runs the cached array through `filterChecklistItems()` and re-renders
  via `renderChecklistGroups()` — no re-fetch of
  `getChecklistBySetName`. "Inserts only" keeps `type === "insertSet"`
  cards; "Rookies only" is a `\bRC\b` whole-word match on `notes`
  (the same rule `playerSearch.js` uses for its own RC styling). With
  both on, the result is the rookies inside insert sets. The state is
  read in one place, `getChecklistFilterState()`, shared by the screen
  render and `exportChecklistPdf()` so a download always matches what
  is showing. "Inserts only" is hidden (`hidden` attribute, with a
  `[hidden]` rule in `styles.css` because the pill's `display: flex`
  would otherwise override it) when the loaded checklist has no insert
  cards, which is 13 of the 62 sets. "Rookies only" is hidden the same way
unless the *main* set has at least one card whose notes contain `RC`
(`applyChecklistFilters()` checks the cards that are neither `insertSet`
nor `extendedSet`): a set with no rookies in its main checklist would
only offer a filter that empties the list, so a set whose only RC cards
sit in insert sets doesn't show it. Group headers disappear on their
  own when a filtered group has zero cards, since they're derived from
  the same filtered array, and a filter that matches nothing shows its
  own message rather than the "no checklist data" one. Both checkboxes
  reset to unchecked on every `openChecklistModal()` call, and a fetch
  that resolves after a checkbox has already been toggled is routed
  through `applyChecklistFilters()` too (not rendered raw), so a slow
  response can't silently stomp the visitor's choice. The wrapper lives
  inside `.checklist-modal-title-row`, not `.checklist-modal-controls`,
  so it's explicitly added to the `@media print` hide rule alongside
  Print/Close rather than inheriting it for free.
- **Escaping**: all rendered checklist text goes through the shared
  `escapeHtml()` in `helper.js` (distinct from `checklistUpload.js`'s
  narrower `escapeAttr()`, used only for CMS review-table attribute
  values).
- **Filter title suffix**: when a filter is on, the modal title gains
  " - Inserts", " - Rookies" or " - Inserts - Rookies" (e.g. "1990-91
  O-Pee-Chee Premier - Rookies"), from `checklistFilterSuffix()`, so a
  printed or downloaded list says it is filtered. `openChecklistModal()`
  stores the plain set name in the title element's `data-set-name`, and
  `applyChecklistFilters()` rewrites the title from it on every toggle,
  which also makes the suffix disappear again when unticked or when
  another set is opened. Print prints the modal title, and the PDF
  export reads it for its header; the PDF filename is built separately
  from `data-set-name` so it comes out as e.g.
  `...-Inserts-Rookies-checklist.pdf`.
- **Groups that are not insert sets**: `CHECKLIST_NO_SUFFIX_GROUPS` in
  `wax.js` lists `"<setName>|<insertSetName>"` keys whose group title
  skips the " - Insert Set" suffix. The Tembec test run in 1989-90
  O-Pee-Chee (132 cards that were never sold) stays there on purpose and
  still counts as an insert group for the "Inserts only" filter. Box and
  mail-away sets that belong with a main set are Extended Sets instead
  (above), not entries here.
- **Print**: a "🖨 Print" button in the modal calls `window.print()`.
  The masthead inside the modal (`.checklist-modal-masthead`) mirrors
  `waxReviews.html`'s real masthead treatment (scaled-down Bebas Neue)
  but on a flat background color rather than the photographic hero
  image — both for modal-size reasons and because background images are
  unreliable in print output. Its text reads "Junk Wax Hockey.com" (the
CSS uppercases it) rather than the bare site name, so a printed or
downloaded checklist carries the web address; the PDF export draws the
same words in its own header bar (`drawOutlinedText()` in `wax.js`), and
both modal copies (`waxReviews.html`, `browseBySet.html`) were changed
together. `@media print` rules are scoped under
  `body.checklist-modal-open` (added after an early, unscoped version
  blanked out the *entire* page on any print, not just while the modal
  was open); print output hides everything except the modal, drops to 2
  columns, hides the print/close buttons, and shows print-only
  checkboxes beside each card (`.checklist-modal-card-checkbox`,
  `display: none` on screen). It also shows a custom print-only footer
  (`© {year} www.junkwaxhockey.com`, populated once via `new
  Date().getFullYear()`) — browsers don't let a page suppress their own
  native print header/footer (title/URL/date) via CSS; that's a
  user-controlled "Headers and footers" checkbox in the print dialog,
  not something the page can override, so this is a second, clean
  footer shown only for the parts of the print output that need one.
- **Download PDF**: a "⬇ Download PDF" button sits alongside Print in
  `.checklist-modal-controls` and calls `exportChecklistPdf()` in
  `wax.js` — a separate, additive feature, not a replacement; Print is
  untouched. It builds the file client-side with jsPDF (cdnjs, pinned
  to `4.2.1`) plus three small font files —
  `scripts/fonts/bebasNeue-normal.js`, `scripts/fonts/sourceSans3-normal.js`,
  `scripts/fonts/sourceSans3-bold.js`, each just a global base64-encoded
  TTF string. Fonts come from Google Fonts (github.com/google/fonts):
  Bebas Neue as-is (matching the masthead font used elsewhere on the
  site), and Source Sans 3 — which only ships as a variable font
  upstream — instantiated to static Regular/Bold weights via a one-time
  `fonttools.varLib.instancer` step before being base64-embedded. All
  four scripts (jsPDF + 3 fonts, ~1MB combined) are loaded lazily:
  `loadJsPdf()` is a small promise-chain loader that injects `<script>`
  tags dynamically on first click of Download PDF and caches the result
  so a second click doesn't re-fetch, rather than static `<script>` tags
  in the HTML — most visitors who open a checklist never click Download,
  so it shouldn't cost anything on a normal page load.

  `exportChecklistPdf()` filters `currentChecklistItems` through the same
  `filterChecklistItems()` as the on-screen checkboxes before building the PDF, so a
  download taken while the filter is on only contains the filtered
  cards. The document itself, built by `buildChecklistPdfDocument()`,
  matches the on-screen/print look as closely as practical, letter-sized
  with as many pages as needed:
  - A masthead bar on page 1 only ("THE HELLA FILES" in embedded Bebas
    Neue on a colored bar matching the on-screen masthead's background
    color, with a small 4-direction offset behind the text approximating
    the on-screen text-shadow/outline effect), then the set name as a
    title.
  - A genuine 2-column layout, not a naive "fill column 1, then column
    2." It replicates the real CSS multi-column behavior where a group
    title (`column-span: all` on screen) breaks the column flow and
    forces a restart, and it balances each page's worth of content
    evenly by height between the two columns rather than greedily
    filling the first column to its limit — so a short group, or the
    last partial page of a long group, doesn't leave one column (often
    half the page) empty beside it. This balancing was added after a
    real bug surfaced testing against actual production checklist data:
    an 18-card insert set on the 2024-25 Tim Hortons set rendered
    entirely in column 1, leaving column 2 empty, before the fix.
  - Group titles get a colored bottom border matching the on-screen
    `.checklist-modal-group-title` underline, and won't start a section
    unless there's room for the title plus at least 3 card rows —
    otherwise the section starts fresh on the next page/column, avoiding
    a lonely 1-2-row orphan.
  - Each card row shows an unfilled checkbox square (same idea as the
    print-only checkbox above) plus card number, player name, and notes.
  - A running header appears on every page after the first — the set
    name in smaller gray text with a thin rule under it — so a reader
    can tell which set they're looking at without scrolling back to
    page 1.
  - A footer appears on every page: copyright text on the left, "Page X
    of Y" on the right.

  New CSS: `.checklist-modal-pdf-btn` in `styles/styles.css`, styled to
  match the existing `.checklist-modal-print-btn`.

## NHL scores ticker (Wax Reviews, Player Search, Browse By Set, Lockout, The Junk Wax Years, Timeline)

A dark strip between the masthead and the nav, scrolling NHL and PWHL
scores right to left — each league introduced by its logo: last
night's finals (under their date, e.g. "Oct 10") until today's first
puck drop, then today's games (under "Today") — start time, live period and clock, or
final. Fed by `getNhlScores` and `getPwhlScores` (`Lambdas/`, see
`LAMBDA_FUNCTIONS.md`), which proxy the NHL's undocumented API and the
PWHL's HockeyTech feed — see `NHL_API.md` and `PWHL_API.md`. Code is in
`scripts/ticker.js` (`initNhlTicker()` and helpers; the `nhl-*` names predate the
PWHL and cover both leagues), loaded by `waxReviews.html`,
`playerSearch.html`, `browseBySet.html`, `lockout.html`,
`theJunkWaxYears.html` and `timeline.html`. **The Home page deliberately has no ticker.** The script starts itself on
`DOMContentLoaded` (not `window load`, which waits for every image), so
pages don't call it. A page needs only `<script src="/scripts/ticker.js"
defer>`, the rail markup — one `<div id="nhlTicker" class="nhl-ticker"
role="region" aria-label="NHL scores" aria-busy="true" tabindex="0">`
between the masthead and the `<nav>` — and a `<noscript><style>.nhl-ticker
{ display: none; }</style></noscript>` in the head so a visitor without
JavaScript doesn't get a permanently empty bar. The game modal's markup
is not in the pages: `initNhlGameModal()` injects it if it isn't there.

- **There from first paint, hidden only if there's nothing to show**:
  the rail is in the static HTML (no `hidden`), so its 40px is reserved
  before any score arrives — nothing pops in or pushes the page down. While
  it's still empty a faint light band sweeps across it
  (`.nhl-ticker[aria-busy="true"]:empty::after`; `:empty` ends it the
  moment the strip is built, and `prefers-reduced-motion` turns it off).
  Once every league's first fetch has settled, `aria-busy` is removed and
  the rail is hidden if no league had anything — an API error on first
  load, or no games and no notice from either league.
  `.nhl-ticker[hidden] { display: none; }` is required, not redundant —
  the strip's own `display: flex` would otherwise override the `hidden`
  attribute. That collapse is the one case where the page shifts (46px,
  with its 6px gap).
- **Two leagues, fetched independently** (`TICKER_LEAGUES`,
  `refreshTickerLeague()`): each league has its own endpoint, poll
  timer and game key, and both are requested in parallel on load — the
  NHL never waits on the PWHL, and a league that fails or is empty just
  has no section. Each copy of the marquee holds one
  `.ticker-league[data-league]` section per league, in config order
  (NHL first): the league's logo, then last night's games after their
  date and today's after "Today" (`.nhl-ticker-label`; the date is
  the group's earliest start in the visitor's time zone, so it agrees
  with the start times beside it — a Tokyo visitor sees "Oct 11" for
  Oct 10 evening games), all built by the same chip code — both Lambdas
  return the same shape. NHL and PWHL game IDs can collide, so in-place
  updates are scoped to the league's section.
- **"Season starts" / "Next game"**: on any day with no games today,
  each league's Lambda sends an `upcoming` notice, shown after the
  previous game day's results (if any) as "Next game Dec 26" or, before
  a season, "Season starts Dec 5" (`.ticker-league-note`) — dated in
  the visitor's own time zone and followed by **every game that day**,
  team logos and local start times, as ordinary disabled chips. So a
  section always reads logo → results → what's next, and a league's
  logo is on the strip whenever it has anything recent or scheduled —
  the PWHL plays a few nights a week, the NHL has breaks (Christmas,
  All-Star, the Olympics). In summer, before the next schedule is
  published, there's nothing to show and the league has no section.
- **Changing a league's section without a jump**
  (`replaceTickerLeagueSection()`): when a league's set of games
  changes — the second league arriving, "Last night" dropping off, a
  notice turning into games — the swap waits for a moment it can't be
  seen. With `x` the scroll position and `w` the strip width, it's
  safe when the section (in copy A) is entirely right of the view —
  nothing visible moves — or entirely left of it while its copy-B twin
  is entirely right — then everything visible shifts by the section's
  size change, which is cancelled by moving the animation's
  `currentTime` by the same amount (`findHiddenSwap()`,
  `applyTickerSectionSwap()`). The geometry also says whether a safe
  moment can come at all this pass: if so it re-checks every 200ms (a
  window narrower than two checks' worth of scrolling doesn't count,
  since a check could skip it — that once made a swap wait forever),
  with one full pass as a backstop; if not — too few games, or the
  changing games are the ones on screen — it swaps now and fades the
  section in (`.ticker-league-entering`). The animation duration is set
  to the millisecond, not rounded, so the position maths lands
  exactly. Tests measured every visible item's screen position before
  and after each kind of swap: no movement.
- **Seamless marquee** (`applyNhlTickerMotion()`, re-run by a
  `ResizeObserver` when the strip's width changes): the chip track is
  rendered twice inside `.nhl-ticker-scroller`, which CSS slides
  `translateX(0 → -50%)` on a loop. That loop only looks continuous if
  each copy is at least as wide as the strip, so both copies get
  `min-width` equal to the strip's width. With many games that changes
  nothing; with only a few, each copy ends in empty space, and the next
  pass enters on the right just as the first game starts to leave on
  the left. It's `min-width` rather than padding computed from a
  measured width because the text width changes after render (the web
  font loading, scores updating in place), which left a measured gap
  50px off. The copy is `aria-hidden` so each game is announced once.
  The duration is set from a copy's width (`NHL_TICKER_PX_PER_SEC`), so
  the speed is the same at any game count. Hover or keyboard focus (the
  strip is `tabindex="0"`) pauses it; `prefers-reduced-motion` drops
  the animation, the copy and the `min-width`, leaving a swipeable row.
- **NHL first**: with no cached scores, the other leagues hold their
  first render until the NHL has rendered, failed or come back empty,
  or 2.5s pass (`TICKER_NHL_FIRST_WAIT_MS`), so the strip opens on the NHL
  section instead of whichever league answered first. Later refreshes
  don't wait.
- **Entrance** (`startTickerEntry()`): on the first build in a tab, after
  a 100ms hold, the whole strip slides in from the far right at the
  normal scroll speed, wrapped in `.nhl-ticker-entry` (CSS
  `nhlTickerEnter`), with the marquee loop paused at its start until the
  strip arrives and then taking over with no jump. A league arriving
  mid-entrance is swapped in at once and faded in, since the position maths
  above assumes the loop is running. Not played under
  `prefers-reduced-motion`, and not when the strip is restored (below).
- **Carrying on across pages**: every nav click is a full page load, so
  the strip is rebuilt, but in a way meant to look continuous. Two
  `sessionStorage` entries, per tab: `tickerPos` (the scroll offset in
  pixels, saved on `pagehide` and when the tab is hidden — pixels, not a
  fraction, because later leagues are inserted to the right of the
  NHL so the offset holds while the strip's width doesn't — and not
  saved mid-entrance) and `tickerData:<league>` (that league's last
  response). On the next page `initNhlTicker()` renders the cached
  responses straight away (priming, with no swap maths), then sets the
  loop to the saved offset *plus* the time since it was saved at
  `NHL_TICKER_PX_PER_SEC`, so it sits where it would have been had it
  kept scrolling through the page load, and skips the entrance. The
  normal fetch follows; the existing game-key comparison updates chips in
  place or swaps changed sections without a visible jump. The position
  is good for 30 minutes and the cached scores for 10; a new tab, or
  anything older, starts fresh with the shimmer and the entrance. A
  late web-font swap changes the strip's width, so
  `refitTickerMotion()` re-measures and holds the same pixel offset.
  Starting on `DOMContentLoaded` rather than `window load` is part of
  this: the strip shows as soon as the HTML and CSS are ready, not
  after the page's images.
- **Refresh**: `scheduleNhlTickerRefresh()` polls every 60s while a
  game is `PRE`/`LIVE`/`CRIT` — today's, or last night's if one runs
  past midnight; otherwise it sleeps until the next scheduled start
  time; with nothing left to play it sleeps until 2 minutes after
  midnight Eastern, so an open tab rolls over to the new day (the
  Lambdas never cache past midnight, so that refresh gets it). Polling
  pauses in a background tab (`visibilitychange`) and catches up when
  the tab returns. A refresh with the same set of games updates each
  chip's score and status in place (matched by `data-game-id`, in both
  copies), so the scroll never jumps; a new set of games — last night's
  finals dropping off — replaces that league's section through the
  off-screen swap above. A failed refresh keeps the
  last good scores and retries.
- **Status text** (`formatNhlGameStatus()`): start times are converted
  from the API's UTC to the visitor's own time zone and locale by
  `toLocaleTimeString()` in the browser — 5:00 p.m. in Toronto is
  2:00 p.m. in Vancouver. Live games show "2nd 12:34", "2nd INT",
  "OT 3:10", "2OT" in the playoffs, or "SO" (in red); finals show
  "Final", "Final/OT" or "Final/SO". In a final, the winning team's
  abbreviation and score are bold white (`.nhl-team-winner`) and the
  loser's stay regular weight; live and upcoming games have no winner
  marked. Shootouts need no special case — the NHL's final score
  already credits the shootout winner with one extra goal. "Today" is the NHL's game day, so
  a visitor far from North America can see a "Today" game at, say,
  6:00 a.m. their time.
- **Built with** `textContent`/`createElement`, not `innerHTML`, so
  nothing from the upstream API is ever parsed as HTML. Logos
  hot-link straight from `assets.nhle.com` (images don't need CORS).
- **Placement**: outside `.flex-container`, so the `.flex-container
  div` descendant-selector trap (see "Mobile / responsive design")
  doesn't apply. 40px tall with 42x28px logos (36px and 33x22px under
  600px) — the NHL's logos are 3:2 SVGs with built-in padding, so a
  square box would shrink them to fit its width. PWHL team logos are
  square PNGs (28x28, 22x22 on mobile); the league logos are 48x32
  (NHL) and an 85x18 PWHL wordmark. The wordmark's own violet
  (`#33058d`) is only 1.27:1 against the strip, so it's repainted in
  the same hue at 65% lightness (`#8b53f9`, 3.86:1 — above the 3:1
  guideline for graphics): `logoColor` in `TICKER_LEAGUES` makes
  `buildTickerLeagueLogo()` render a box in that colour with the logo
  as its CSS mask (`.ticker-league-logo-masked`, `role="img"` and an
  `aria-label` for screen readers). A cross-site mask needs the image
  host to allow CORS; Cloudinary allows any origin. Every
  logo's size is fixed up front — `<img>` width/height attributes, or
  CSS for the masked PWHL wordmark — so widths never shift while logos
  load; the swap's maths depends on that. A 6px gap separates
  it from the masthead, whose drop shadow needs `z-index: 1` on
  `.wax-reviews-mast-table` — otherwise the ticker, later in the page,
  paints over it. The shadow applies on all four pages sharing that
  masthead.
- **Chips are buttons**: each game is a `<button class="nhl-chip">`
  (with a reset so it reads as ticker text) that opens the game modal
  below. Upcoming games are `disabled` until puck drop — there's
  nothing to show yet — and a refresh enables them once they start.
  PWHL games stay disabled: there's no PWHL game modal yet
  (`clickable: false` in `TICKER_LEAGUES`).
  Chips in the scroll's duplicate copy get `tabindex="-1"`, so the
  keyboard visits each game once. One click listener on `#nhlTicker`
  covers every chip, including ones added by later refreshes.

### When "Last night" drops off the ticker

"Last night" is decided entirely in the Lambda. It shows last night's results **until the first of today's games starts**, then drops them.

**The rule** (`Lambdas/getNhlScores/index.mjs`):

1. Fetch today's games from the NHL (`/v1/score/{today}`, where "today" is the calendar date in Eastern time).
2. If **every** game today is still `FUT` (scheduled) or `PRE` (warm-up), or there are no games today, also fetch the previous game day's games, keeping the finished ones (`FINAL`/`OFF`) and any still being played.
3. Once any of today's games is past warm-up (`LIVE`), `previous` comes back empty.

**What the page does with it** (`scripts/ticker.js`):

- The ticker stores the list of game IDs it's showing. When the "last night" games stop arriving, that list changes, so that league's section is replaced with only today's games and the last-night date label goes (off-screen when possible — see "Changing a league's section without a jump").
- Before puck drop, the ticker doesn't poll every minute. It sleeps until the first scheduled start time, then checks every 60s.

**In practice, on a typical evening:**

| Time (ET) | What the ticker shows |
|---|---|
| Morning to first puck drop | Last night (finals) → Today (start times) |
| Scheduled start, e.g. 7:00 | Unchanged: games sit in `FUT`/`PRE` for warm-ups, and the real puck drop is usually a few minutes after the listed time |
| First game goes `LIVE` | "Last night" drops on the next refresh, within about 1–5 minutes |
| Rest of the evening | Today only, live and final |

The 1–5 minute range comes from caching. Until a game is live, the Lambda's response may be cached for up to 5 minutes, so the first refresh after puck drop can still get an older copy.

**Edge cases:**
- **A day with no games:** `previous` is filled all day, followed by the "Next game" notice and that day's games (see "Season starts" / "Next game" above).
- **Breaks of several days:** the NHL's `prevDate` is the previous **game** day, not the calendar day — on Dec 24 and 25, 2025 it was Dec 23 — so the last results stay on the strip, dated, for the whole break, followed by "Next game Dec 27".
- **When "today" begins:** at **midnight Eastern**, decided by the Lambdas — not the NHL's own `/v1/score/now`, whose `currentDate` was observed still on Sunday at 10:21 a.m. Monday (Oct 12, 2026), which left Sunday's finals labelled "Today" all morning. Both Lambdas also cap their caching at midnight, and an open tab re-fetches 2 minutes after it.
- **A game still live at midnight:** a late West Coast start (10:00 p.m. ET) can run past midnight. It becomes "yesterday's" game mid-play but stays on the strip under yesterday's date with its live clock, and keeps the 60s polling going until it ends.
- **Postponed games:** these stay `FUT`, so a day whose only game is postponed would keep showing "Last night" all day. That's harmless, but the code doesn't treat it specially.

**The PWHL** follows the same rule, from `Lambdas/getPwhlScores/index.mjs`. The HockeyTech feed has no "current date" of its own, so "today" and "yesterday" are calendar days in `America/Toronto`. On a day with no PWHL games, the section shows yesterday's results (if any) and then "Next game {date}" — or "Season starts {date}" before the regular season's first game — with that day's games, and nothing in summer before the next schedule is published.

## NHL game modal (the ticker pages)

Clicking a started or finished game in the ticker opens a modal modelled
on nhl.com's game page: a score header, then three tabs — Summary, Box
Score, Recap. Fed by `getNhlGameDetails` (`Lambdas/getNhlGameDetails/`,
see `LAMBDA_FUNCTIONS.md`); code in `ticker.js` (`openNhlGameModal()`,
`renderNhlGameHeader()`/`…Summary()`/`…BoxScore()`/`…Recap()`); markup
is a static `#nhlGameModalOverlay` in `waxReviews.html`.

- **Header**: logos, abbreviations, each team's W-L-OTL record, scores
  (the loser's grey in a final), status ("Final (SO)", or the live
  period and clock via the ticker's `formatNhlGameStatus()`), then the
  date in the visitor's time zone and the venue.
- **Summary**: one section per period — "No Scoring" when empty — with
  each goal's time, team logo, scorer and season total, assists, a
  PPG/SHG/EN badge and the score after it; then the shootout (✓/✗ per
  attempt) and the three stars.
- **Box Score**: the line score (OT/SO columns only when played,
  totals bold) with the W/L goalies beside it, then eight team stats
  side by side.
- **Recap**: a click-to-play highlights poster, then NHL.com's
  headline and summary with "Read full recap on NHL.com ↗". Only the
  click creates the Brightcove `<iframe>` (`playNhlGameVideo()`), so
  nothing heavy loads unless asked; the NHL's player shows a pre-roll
  ad first. With no recap posted yet, it links to the NHL.com game
  page instead. The article photo only shows when there's no video,
  since the poster already carries one.
- **Reuses the checklist modal's classes** (`.checklist-modal-overlay`,
  `-content`, `-close`) for the same white, rounded look, with
  `.nhl-game-modal` narrowing it to 900px. It never sets
  `body.checklist-modal-open`, so the checklist's print rules don't
  touch it.
- **Closing**: ×, Escape or the backdrop call `closeNhlGameModal()`,
  which also empties the Recap panel so a playing video stops.
- **Stale responses are ignored**: every open and close bumps
  `nhlGameRequestId`, and a response is only drawn if it still matches
  — so a slow load for a game that's been closed, or replaced by
  another, can't overwrite what's showing.
- **Tabs**: real `role="tab"`/`tabpanel` markup. Summary is selected
  on every open; arrow keys move between tabs.
- **Live games** show a snapshot as of opening — the modal doesn't
  auto-refresh. Reopening fetches again (cached 30s while live).
- **Escaping**: everything from the API goes through `escapeHtml()`
  (`helper.js`), the same as the checklist modal.
- **Mobile**: the header stacks each logo above its abbreviation and
  shrinks the scores. The site-wide mobile `table { display: block }`
  rule is undone for `.nhl-linescore`/`.nhl-team-stats` — as blocks,
  their rows stop stretching to full width. A long playoff line score
  scrolls inside `.nhl-linescore-wrap` instead of the page.

## Site footer (public pages)

Every public page ends with the same dark-blue band (the nav links' blue,
`--color-heading-outline`): link columns, then the copyright. It uses its own
class, `.site-footer`, because the `/cms` pages share both `.page-footer`
and `fetchCopyrightYear()` and must not change.

**Markup.** Each page has `<footer class="site-footer">` holding
`<nav id="footer-links">` and `<div id="copy">`, and its load handler calls
`fetchFooterLinks()` (`helper.js`). Since 2026-11-05 the build pre-renders
the link columns between `<!-- footer:start --><!-- footer:end -->`
markers inside `#footer-links` (on every public page and generated review
page), with final `/reviews/<slug>/` links, and `fetchFooterLinks()`
returns early when the columns are already there; `footerHtml()` builds
the same markup in both places. `#copy` is untouched, so the copyright
still comes from `fetchCopyrightYear()` (on `waxReviews.html`, from
`fetchCardSetsByYear()`).

**Columns are data.** `FOOTER_SECTIONS` in `helper.js` is a list of columns,
each with an optional `heading` and a list of links. A link with an `id` is
looked up in `NAV_ITEMS`, so its address lives in one place and the footer
can't drift from the nav; an optional `label` overrides the nav's wording
(the footer says "Classic '80s", the nav "Classic 80s Sets"). A link with no
`id` is a page that doesn't exist yet and renders as a dimmed, unlinked
`<span aria-disabled="true">`, which keyboard users skip. Both former
placeholders ("All Sets", i.e. Browse By Set, and "About") now have ids and
are live, so nothing is dimmed today, but the mechanism remains: a future
page is added to `NAV_ITEMS`, given an `id`, and markup and CSS don't change. A column with no heading stands
on its own. Unlike the nav, the footer lists every page, its own included,
since it works as a site map.

**Layout.** The footer bleeds to the window edges with negative side margins
that cancel the body's 8px margin (the same trick as the home banner). To
anchor short pages, `body:has(.site-footer)` becomes a column flex container
with `min-height: 100vh` and the footer takes `margin-top: auto`. The
`:has()` scoping is the point: a plain `body` rule would also change every
`/cms` page. Columns wrap on narrow screens.

**The hidden WLCMS link (Home only).** `index.html` keeps its login link
inside the footer. It is hidden by giving it the footer's own blue, not the
page background colour it used before, which would show on a dark band.
Keyboard users still get a white focus outline. The rule is written as
`.site-footer .footer-wlcms` because the global `a:link, a:visited` rule
(near the top of `styles.css`) has higher specificity than a single class
and would otherwise turn the link blue and visible.

**Type.** Nunito 600 for the links and headings; the copyright line and
the WLCMS link are Nunito 200 by choice (stated explicitly, since only 200
and 600 are loaded).

**JavaScript off.** The links are in the HTML (pre-rendered), so they
show; only the copyright year is still written by script.

## Home page content (`index.html`)

The Home page is plain static HTML: the intro card (`#blog-intro`, the
page's one `<h1>` plus three short paragraphs) and the post card
(`#home-post`: an `<h2>` title and seven paragraphs, no byline) are
written into the markup. It was built in the browser before — an intro
from `renderBlogIntro('99')` and the single `blogType` 99 post fetched
through `getBlogs` — which cost an API round trip, a 750px height
placeholder and a layout shift to display text that never changes, and
meant the text wasn't in the HTML a crawler first receives. The page now
loads only `helper.js` (for the nav, footer links and copyright) and
makes no request for content.

Practical consequences: edit the Home wording directly in `index.html`;
the old type-99 post still exists in the `Blogs` table but nothing reads
it (the CMS no longer offers Home Page as a type for new posts, though
`BLOG_TYPE_LABELS` still labels the existing post); and the post card
deliberately is not `#blogsDiv`, whose `min-height: 750px` pre-sizes
late-arriving content and would only add dead space here. The old
`BlogPosting` structured-data block went with the dynamic rendering. The
blog-stream machinery in `blogs.js` is still used by `about.html`
(`tech.html`, its other user, is archived).

## Home page banner

`index.html`'s masthead (and `about.html`'s, which uses the same
banner markup) is an image, `images/masthead-v19.webp` (1500x250, a 6:1
strip), inside a `.home-masthead` wrapper. The wrapper has three jobs,
each done in CSS so the page needs no script:

- **Edge to edge, at every width.** Its -8px margins cancel the
  browser's default 8px body margin and the image scales with the
  window. There is deliberately no maximum width: the footer is also
  edge to edge, and the banner is meant to match it. The cost is height
  on very wide screens (about 233px at 1400px wide, 320px at 1920px and
  427px at 2560px) and an enlarged, slightly soft image there, since
  the file is 1500px wide; a larger source file, or a `srcset` with a
  2x version for wide windows, would sharpen it. A pixel-accurate image
  needs about the window width times the screen's pixel density. The
  nav row beneath is left-aligned like every other page's (the old
  Home-and-About-only `.nav-centered` centring was removed once the banner
  went edge to edge).
- **Taller on phones.** At 600px and below the image is forced to a
  7:2 box (`object-fit: fill`) instead of its native 6:1, because the
  native strip is too thin to read on a phone.
- **Wax-paper texture.** `::before` lays a lit turbulence map and fine
  grain over the image with `mix-blend-mode: overlay`, and `::after`
  adds a gloss sheen and worn edges. Both use the banner file itself as
  a `mask-image`, so the texture follows the artwork's shape. That means
  the mask URL in `styles.css` has to name the same file as the `<img>`
  in `index.html` (and its preload); swapping the banner means changing
  all three together. The wrapper uses `isolation: isolate` so the blend
  mode only affects the banner, not the page behind it.

Older banner variants stay in `images/` but nothing references them.

## Junk Wax timeline (`timeline.html`)

A vertical timeline where each season of the Junk Wax era is a card.
Tapping a card flips it to show that season's bullet points. The
content lives in plain markdown (`timeline/timeline.md`), so adding or
editing a season is a text edit, with no HTML or code change.

**Why the markdown is outside `/cms/`.** The page fetches the file at
load. `robots.txt` disallows `/cms/`, and Google obeys that for the
files a page pulls in while rendering, so a file under `/cms/` would
have rendered an empty timeline to the crawler. At `/timeline/` it is
fetchable, and therefore also publicly readable, which the page needs
anyway.

**File format.** `###` is the section title, each `####` starts a card,
and `-` bullets are its content. Every two spaces of indent nests a
bullet one level deeper, under the nearest shallower bullet above it
(`parseTimelineMarkdown()` keeps a stack of open levels, so a
mis-indented bullet attaches to the closest valid parent instead of
breaking the list). A heading that starts with a season such as
`1984-85` has it split off as a badge; the rest becomes the card title.

**How a card works.**
- Each card has two faces, a front (a real `<button>`, since a button
  can't hold the bullet list) and a back with the list. Cards alternate
  left and right of a centre line on wide screens and stack on phones.
- The card's height is set from whichever face is showing
  (`syncTimelineCardHeight()`), because the faces are absolutely
  positioned for the 3D flip and would otherwise leave the card sized
  to neither. A `ResizeObserver` re-syncs it when text rewraps on a
  resize or the web font loads. Heights only animate after the first
  layout (`.timeline-ready`), so cards don't grow from zero on load.
- A closed card's hidden face is still laid out, and a back face taller than
  its card would stretch the page below the footer. `#timelineSection` uses
  `overflow-y: clip` (not `hidden`, so it doesn't become a scroll container)
  to cut that off; its bottom padding leaves room for the card shadows.
- The front shows a "Flip" pill (`.timeline-hint`, vertically centred on
  the right), the same pill as the Wax Museum's cards (one shared rule),
  replacing the old ↻ icon. It is `aria-hidden`, since the button's own
  label already says what it does.
- Opening a card marks it viewed: its front greys out and gets a hidden
  "(viewed)" for screen readers. That state lives in page memory only,
  so a reload starts fresh.
- Clicking anywhere on the open card closes it. The back's title row is
  the real button, which is the keyboard and screen-reader way to close
  it, so no separate close button is drawn. Escape also closes.
- Focus follows the card: opening moves focus to the back's title row,
  closing returns it to the front. A tall card leaves the page scrolled
  far below where it began, so on close the page scrolls back up to the
  card if its top is off screen (`scrollTimelineCardIntoView()`).
- The hidden face is `inert` and `aria-hidden`, so only one face is ever
  reachable by keyboard or screen reader.
- With `prefers-reduced-motion`, the flip becomes an opacity swap. It
  must still flip `visibility` instantly, otherwise the closing card
  cannot take focus while its face is still fading out.

**Page-level pieces.** Like the other static public pages it holds its
title, description, canonical and share tags in the HTML (see "SEO and
social tags"), builds an Article JSON-LD block with `setJsonLd()`,
carries the scores ticker, and has a
`<noscript>` message because the cards need JavaScript to exist at all.
While the markdown loads the shared spinner shows (see "Loading
spinner"); a failed load puts a message in `#timelineStatus`.

## Linking to one specific set (`setID`)

A year's review page loads **every** live set for that year and category
(`getCardSetsByYear`) and pages through them one at a time, sorted by
star rating, so a link that only names the year can only ever land on
the top-rated set. The fix is to let the URL name the set:
`waxReviews.html?year=1990&pageName=junkWax&blogCat=reg&setID=2q6zbsrnl9q`.

**How the page picks the set.** The page still makes one request for the
year; `setID` only chooses where the existing pagination starts.
`waxReviews.html` passes `params.get("setID")` into
`fetchCardSetsByYear(year, sortOrder, blogCat, setID)`, which sorts the
sets into `allCardSets` and then does

    const startIndex = setID ? allCardSets.findIndex(set => set.setID === setID) : -1;
    currentPage = startIndex >= 0 ? startIndex + 1 : 1;

`findIndex` returns the array position of the matching set, or -1 when
there is no ID or no match; the `+ 1` converts a zero-based position to
a one-based page number. `renderCardSetPage()` then shows the set at
that page (the page size is 1), and the Back/Next controls move
`currentPage` through the same array from wherever the visitor landed. A
missing or unknown ID (a stale link, an unpublished set, the wrong year)
falls back to page 1, exactly the old behaviour. Matching by ID rather
than by page number keeps links correct when ratings, and therefore the
sort order, change.

**Why not fetch one set by ID.** `getCardSetByID` is behind the Cognito
authorizer (CMS only), so a public page would need another public Lambda
and API, and would still need the whole year's list for the Back/Next
labels.

**The address bar and canonical follow the set.** (Since 2026-10-30
this is the *fallback*: every set with an SEO Friendly URL slug gets its
own `/reviews/<slug>/` page and the address bar, canonical and sitemap use
that instead — see "Each set has its own page" below. What follows is
still what happens for a set with no slug.) For years with more
than one set, `syncSetIdInUrl()` writes the shown set's `setID` into the
URL with `history.replaceState` (so paging adds no history entries), and
`buildReviewCanonicalUrl()` builds the canonical and `og:url` from the
set's own data in a fixed order (`year`, `pageName`, `blogCat`, then
`setID` on multi-set years only). Two reasons: before this, paging never
changed the URL, so every set in a multi-set year declared the year URL
as its canonical; and the old canonical copied the whole address bar, so
any stray query parameter (`utm_source`, `fbclid`, a different parameter
order) created its own canonical. A bare year URL still works and its
canonical points at the top-rated set's `setID` URL. Single-set years
keep the bare year URL. The sitemap lists exactly these canonical URLs
(see "Sitemap").

**Who supplies the IDs.** The two places that build links to reviews
both get `setID` from their backends: `browseBySet.js` from
`getPublicCardSets` and `playerSearch.js` from `searchPlayerName`. Each
treats the ID as optional, so a page deploy and a Lambda deploy can
happen in either order.

### Each set has its own page (`/reviews/<slug>/`, 2026-10-30)

The full explanation, with the pipeline, the comparison with an
enterprise static-site setup and the change log, is in `REVIEW_PAGES.md`.
What matters for the front end:

- **A page per set, built for the HTML.** Every Amplify build runs
  `tools/generateReviewPages/generate.mjs`, which copies `waxReviews.html`
  once per live set into `reviews/<slug>/index.html`. It replaces two
  blocks marked with comments: `review-head` (title, description,
  canonical, `og:*`, `twitter:*`) with the set's own values, and
  `review-params` (the script defining `year`, `sortOrder`, `pageName`,
  `blogCat`, `setID`) with fixed values. That is why `setID` is now a
  global defined in that block and the `DOMContentLoaded` handler passes
  it to `fetchCardSetsByYear()` instead of calling `params.get("setID")`
  inline. Nothing else in the file differs, so a generated page is the
  same page with the right head and the right set already chosen. The
  review itself is still drawn in the browser by `wax.js`.
- **Why folder URLs.** Each page is `reviews/<slug>/index.html` and is
  linked as `/reviews/<slug>/`: a server answers a folder URL with its
  `index.html`, so no `index.html` shows in the address (Amplify
  confirmed by a spike page). A `<slug>.html` layout would have needed a
  console rewrite rule per set.
- **Absolute links.** A generated page sits one folder deeper, so the
  masthead and checklist-modal links in `waxReviews.html` are
  `/index.html`, not `index.html`.
- **Old URLs keep working.** `waxReviews.html?year=...` is still served as
  is, with its generic head. When the set loads, `syncSetIdInUrl()`
  replaces the address bar with `/reviews/<slug>/` and the canonical
  points there, so bookmarks work and search engines consolidate them
  without redirect rules. `sortOrder` is not carried over. The 2004/mcd
  redirect to `lockout.html` is unchanged.
- **Canonical, address bar, sitemap.** `reviewPath(item)` gives
  `/reviews/<slug>/`; `buildReviewCanonicalUrl()` and `syncSetIdInUrl()`
  (both in `wax.js`) use it, and the sitemap lists exactly those URLs.
  Paging between sets in a multi-set year moves the address to each set's
  own page.
- **Links to reviews come from a manifest.** The nav, footer, breadcrumb
  category link, year picker and Player Search results render with the
  query-string `href` plus `data-review-*` attributes;
  `loadReviewLinks()` (`helper.js`) fetches `/reviews/index.json`, which
  the same build wrote, and `applyReviewLinks()` swaps in the slug URLs.
  A link follows a page only if both exist in one deployment, and with
  the manifest missing the query links still work. A year's default set
  (what a year link opens) is the highest `stars`, ties by set name —
  `compareSetsForDefault()`, also used by `wax.js` to sort a year's sets,
  so year links and old bare-year URLs agree. Browse By Set links to a
  slug directly because its own fetch already returns the slug.
- **Slug rules.** `seoURLSlug` is a required CMS field (lowercase
  letters, numbers, single hyphens, unique among live sets), enforced by
  `seoSlugProblem()` in `cmsFormUI.js` and by `createCardPost`/
  `updateCardSet`. The generator refuses to write anything if a live set
  has none, an invalid one, or a duplicate.

## Browse By Set (`browseBySet.html`)

A public version of the CMS's "edit a live set" list: every live set,
grouped by season, so a visitor (or a crawler) can see everything the
site has reviewed on one page. It is linked from the nav and footer as
"All Sets" (one shared `NAV_ITEMS` label); the page's own heading and
title stay "Browse By Set". It reuses the `waxReviews.html` masthead,
nav markup, footer and scores ticker.

**Data.** The CMS list endpoint is login-only and returns every
review's full body text, so a public page can't use it. `getPublicCardSets`
(see `API_ENDPOINTS.md` and `LAMBDA_FUNCTIONS.md`) is a small public
Lambda that returns only a few small fields: `setID`, `setName`,
`blogCat`, `year` and `hasChecklist` for this page, `seoURLSlug` for its
Review links (to the set's `/reviews/<slug>/` page), plus `stars`, `now`,
`updatedAt` and the SEO and header-image fields for the review-page
generator that every build runs (this page ignores those), cached for 30
minutes. `initBrowseBySet()` fetches it
once from `BROWSE_SETS_URL` and fails soft with a short message (no
sets live, endpoint down, or no URL configured) instead of an empty
page.

**Layout.** Two columns: **Major Releases** (`blogCat` `reg`) and **Fast
Food Sets** (`mcd` and `tims` together). Each column groups its sets
under a season heading derived from the stored year (1990 shows as
"1990-91"), oldest first and A to Z within a season; the columns stack
on phones with Major Releases first. The columns are plain divs
deliberately placed outside `.flex-container`, whose bare `div` rule
would force every nested div to 1000px wide.

**Each set.** The title is shown without its season, since the heading
above already carries it (`stripYearFromSetName()` from `wax.js`, a
display-only trim: the Checklist link's `data-set-name` keeps the full
name because the checklist lookup is keyed on it). **Review** links to
the set's page using `getPageNameForYear()` and `setID` (see "Linking to
one specific set"); it is left out if a year falls outside every known
range. **Checklist** appears only when `hasChecklist` is set and opens
the same modal, with Print and PDF download, as the review page: the
page loads `wax.js` for that and carries a copy of the modal markup. A
single click handler on the column container catches Checklist clicks,
because the links are rebuilt on every render. All text goes through
`escapeHtml()`. A set whose stored year disagrees with its name will show
under the wrong season heading now that the title no longer repeats the
year, so keep them consistent in the CMS.

**Structured data.** After rendering, `setBrowseItemListJsonLd()` writes
an `ItemList` JSON-LD block: one entry per set that has a review link
(name and absolute URL), in the order the page shows them, so a crawler
gets the same list in machine-readable form. It uses the same
`browseReviewUrl()` as the visible Review links, so the two can't
disagree.

**Pre-rendered columns (2026-11-05).** The two column divs hold
`browse-major` and `browse-fastfood` marker comments. Every build runs
`browseColumnHtml()` from `browseBySet.js` in a sandbox (with
`escapeHtml`, `getPageNameForYear` and `stripYearFromSetName` lifted from
`helper.js`/`wax.js`) and writes the columns between the markers in the
deployed copy, so the page's raw HTML links to every `/reviews/<slug>/`
page, the main way a crawler finds them. In the browser,
`initBrowseBySet()` still fetches and re-renders the same markup,
silently: it shows the loading spinner only when the columns start
empty (see "Loading spinner"). Its old "Loading the sets..." line sat
above a list that was already complete.

## The Wax Museum (`waxMuseum.html`)

A gallery of the wax packs behind the card sets, live since 2026-11-03.
Each pack is a flip card: the front shows the pack image with its set
name and details (manufacturer, packaging, cards per pack, price) and a
"Flip" pill; the back shows the back-of-pack image and notes. Packs with
a linked review get a link to its `/reviews/<slug>/` page.

**Data.** `initWaxMuseum()` fetches every pack once from `getWaxPacks`
(public, cached 30 minutes; see `API_ENDPOINTS.md`), from the `WaxPacks`
table (`DATA_MODEL.md`). Images are on S3 under `img/wax-packs/`. The
shared loading spinner shows while it loads (see "Loading spinner"), and
a status line explains a failure or a `noscript` visitor.

**Order.** `sortWaxPacks()`: oldest year first, then one set at a time
(A to Z by the name without its season or "Series N"), then series order
(none, 1, 2, ...), then "Low" before "High" packs (`waxPackRelease()`:
Low packs were released before High ones), then A to Z by name.
Grouping by set (`waxPackSet()`) ignores "Low", "High" and "Jumbo"
(Jumbo since 2026-11-05), so "Topps Low", "Topps High" and "Parkhurst
Series 2 Jumbo" sit with the rest of their set. The API's own order is by key, which isn't the name's order.

**Rendering.** Cards render six at a time (`WAX_MUSEUM_BATCH`) as the
visitor scrolls, and images load lazily. Flipping is a click or Enter;
`setWaxPackCardFlipped()` keeps focus and the hidden face's
accessibility state in step.

**Editing.** Packs are added and edited in the CMS (New Wax Pack, Edit
Wax Pack; see `CMS_GUIDE.md`). The museum page itself isn't linked from
the CMS menu.

## About page (`about.html`)

The Home page's layout (same banner, nav, footer and scripts)
showing the blog post(s) of `blogType` 98. Unlike the Home page, which
is static, it still fetches its content: `fetchBlogs('98')`, plus
`fetchNav("about")`, because the About post is meant to be edited
through the CMS. Its H1 ("How This Site Comes Together") is written
straight into the HTML inside `#blog-intro`, along with its own
title, description, canonical and social tags, so a crawler that
doesn't run JavaScript still finds a heading and a preview card.
It has no hidden WLCMS link (that stays on Home). There is expected to
be exactly one type-98 post; it renders with the usual byline and the
page paginates if a second ever appears.

`renderBlogIntro()` (`blogs.js`) no longer has a branch for type 98 and
`about.html` doesn't call it: the heading used to be injected by that
branch, which left the raw HTML with no H1. The block inside it that
sets a title, description and `tech.html` canonical (written for the
tech blog) now skips only type 99; About never reaches it, since About
doesn't call the function, so it can't declare the tech blog as its
canonical.

Reached from the footer only (`NAV_ITEMS.about` exists but is in no
`NAV_MAP` list). In the CMS, `BLOG_TYPE_LABELS` in `cmsBlog.js` labels
type 98 "About", so the post is listed under its own heading on
`pickBlog.html` and edited like any other post; `createBlogPost.html`
deliberately has no About option since there is only ever one About post.

## Player search (`playerSearch.html`)

Find every set on the site a given player appears in, across all
uploaded checklists, with a link to each set's review. Added
2026-08-24, backed by `Lambdas/searchPlayerName/` (see
`LAMBDA_FUNCTIONS.md`) and `scripts/playerSearch.js`.

- **The form**: a single text input (`#playerSearchInput`, min 2
  characters) submitted to `searchPlayerName?q=...`. An actual search
  only ever runs on submit (Search click, or Enter with no suggestion
  highlighted) - the Lambda's `Scan`-per-request design (see
  `LAMBDA_FUNCTIONS.md`) makes firing it on every keystroke needlessly
  expensive. See "Type-ahead" below for what *does* happen live, as you
  type.
- **Type-ahead** (added 2026-09-14): a dropdown
  (`#playerSearchSuggestions`) suggests matching player names as you
  type 2+ characters, without ever calling the expensive `q` mode per
  keystroke. `loadPlayerNameIndex()` fetches the full distinct-player-
  name list exactly once (`searchPlayerName?namesOnly=1`, see
  `LAMBDA_FUNCTIONS.md`) - kicked off on `window load` (not lazily on
  first keystroke, so it's usually already resolved by the time a
  visitor finishes typing) and cached both in-memory (a shared promise,
  so a prefetch and a keystroke racing each other never double-fetch)
  and in `localStorage` (30min TTL, matching the endpoint's own
  `Cache-Control`, so even a later page load skips the network call).
  Every keystroke after that filters the cached list client-side -
  `rankPlayerNameMatch()` ranks an exact/whole-word match (e.g.
  "gretzky" → "Wayne **Gretzky**") above a match buried in a longer
  multi-player card name (e.g. "Brett Hull / Wayne Gretzky"), since a
  plain alphabetical `.slice(0, 8)` had been burying the single most
  relevant name under less-relevant combo-card matches that happened to
  sort earlier. ArrowUp/ArrowDown highlight a suggestion, Enter selects
  the highlighted one (or falls through to a normal submit if none is
  highlighted), Escape/an outside click closes the dropdown, and
  clicking a suggestion fills the input and calls `runPlayerSearch()`
  immediately.
- **In-progress feedback**: `runPlayerSearch()` clears the old results
  and shows the shared loading spinner (see "Loading spinner") for the
  duration of the fetch, hidden again in a `finally` so it clears on
  success, an empty result, or an error alike. The `Scan`-per-request
  Lambda above takes about 4 seconds, and the old static "Searching..."
  text alone made it hard to tell whether anything was happening.
- **Results**: grouped by `setName`, each group showing every matching
  card (number, player name, notes, and which insert set it's from, if
  any) under that set, ordered main-set cards first then each insert
  set, sorted within each group by `sortIndex` — the same ordering rule
  `wax.js`'s checklist modal uses (see "Checklist display" above), not
  raw fetch order. A group's heading (an `h2`, styled by the shared h3
  rule; see "Section headings" near the top) is a link to that set's review
  on `waxReviews.html` when the API returned a `year`/`blogCat` for it
  (i.e. a matching `Cards` item exists); otherwise it's plain text - see
  `DATA_MODEL.md`'s "setName ↔ Cards.setName 1:1 assumption" note for
  when/why that can happen.
- **Building the link**: `searchPlayerName` returns `{ setName, year,
  blogCat }`, not a ready-made URL - `pageName` (the third param
  `waxReviews.html` needs) is derived client-side via
  `getPageNameForYear(blogCat, year)` in `scripts/helper.js`, reusing
  the same `categoryRanges` data `renderSetPicker()` uses for the
  year-picker widget, rather than duplicating that mapping a third time
  (until 2026-10-30 it was also duplicated, with a keep-in-sync comment,
  in the old `tools/generateSitemap/generate.mjs`; the replacement
  generator now reads `categoryRanges` out of `helper.js` instead). The
  link is then upgraded: it carries `data-review-setid` (plus the
  category and year as a fallback), and `applyReviewLinks()` points it at
  that set's `/reviews/<slug>/` page once the build manifest loads, so a
  click opens the exact set and the address bar doesn't change.
- **Nav**: added as `search` in `NAV_ITEMS`, labeled "Player Search" -
  shown site-wide (every `NAV_MAP` entry except `playerSearch`'s own,
  which self-excludes like every page does), always last (see
  "Navigation system" above). It used to appear only on the
  `waxReviews.html`-backed pages, right before `tech`; made site-wide
  2026-10-13 once the site became hockey-only.
- **Escaping**: all rendered text (player names, notes, set names) goes
  through the shared `escapeHtml()` in `helper.js` (see the `scripts/`
  table above).
- **Links open the exact set**: each result's link appends `&setID=`
  when the search response carries one, so a hit on, say, 1991-92 Pro
  Set Platinum opens that set rather than the year's top-rated one.
  `searchPlayerName` returns the `setID` from the same `Cards` query it
  already makes for `year`/`blogCat`; a response without it (an older
  deploy) still links to the year page. See "Linking to one specific
  set".
- **Masthead**: uses the same `waxReviews.html`/`lockout.html` masthead
  treatment (Bebas Neue) rather than the Home page's image banner - see
  "Typography / fonts" above.
- **Rookie cards called out**: a card whose `notes` contain `RC` as a
  whole word (`\bRC\b` - so it won't match `RC` as a substring inside
  some other token) renders bold and in the site's one established red
  (`--color-red`, same as `.delete-btn`/`label sup`) via a
  `.player-search-card-notes-rc` class, rather than blending in with
  every other trailing marker.

## Orphaned / legacy files

These exist in the repo but aren't published:

- `Old HTML Pages/` — `pw.html`, `quad2.html`, `signup.html`, `thanks.html`, `cards.html` and `cardChecker.html` (moved here 2026-08-15), and `tech.html` (the old blog stream) and `example.html` (a generic Google reCAPTCHA demo) (moved here 2026-11-05 with `git mv`). Since 2026-11-05 the Amplify build runs `rm -rf "Old HTML Pages"` after the generator and minifier, so nothing in this folder is deployed; before that, everything in it was publicly reachable, because the build publishes the whole repo (`artifacts.files: '**/*'`). The dead nav entries for `tech.html` (`NAV_ITEMS.tech`/`mache`, `NAV_MAP.tech`/`ev`) were removed at the same time.

Note that the build still publishes every other repo folder: `Documentation/`, `Lambdas/` source, `tools/` and `CLAUDE.md` all return 200 on the live site. That was flagged on 2026-11-05 and left as is by choice; the same build step could exclude them.

(`styles/styles copy.css` and `Lambda Functions/newAllBlogs.html`, both previously listed here, no longer exist in the repo.)
