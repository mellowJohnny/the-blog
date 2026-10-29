# SEO Audit & Fix Plan — junkwaxhockey.com

> Generated 2026-10-29. Source: live crawl of `https://www.junkwaxhockey.com` (homepage, robots.txt, sitemap.xml, and 7+ individual pages including two `waxReviews.html` query-string variants). Intended audience: an engineering agent (Claude Code) with access to this site's codebase/repo. Work through the To-Do list top to bottom — it's ordered by impact, and items 1–3 account for most of the current score deficit.

## Context an engineer needs before starting

- **Site structure**: Mostly static HTML pages, plus one dynamic/templated page — `waxReviews.html` — that serves 62 of the site's 69 known URLs via query string: `waxReviews.html?year=<YYYY>&pageName=<slug>&blogCat=<cat>&setID=<id>`. `setID` is present on some entries, absent on others (e.g. year-level landing views like `?year=2024&pageName=timmies&blogCat=tims`).
- **Confirmed `robots.txt`** (verbatim, HTTP 200):
  ```
  User-agent: *
  Disallow: /cms/

  Sitemap: https://www.junkwaxhockey.com/sitemap.xml
  ```
  This is correct and needs no changes.
- **Confirmed `sitemap.xml`**: 69 `<url>` entries, no `<lastmod>` on any entry, no stale/broken references. Query-string ampersands are correctly escaped as `&amp;`.
- **Confirmed duplicate meta content** on `waxReviews.html`, verified on two different query-string combinations (`year=1987&pageName=junkWax&blogCat=reg` and `year=1991&pageName=junkWax&blogCat=reg&setID=9as61m53s07`):
  - Title (identical on both): `Junk Wax Hockey...vintage hockey card set reviews`
  - Meta description (identical on both): `Focusing on the Junk Wax Era, in-depth reviews of almost every hockey card set from 1977-78 to 1994-95, including O-Pee-Chee, Upper Deck, Score, Topps, Pinnacle, McDonald's and Tim Hortons. Are any of them still worth collecting? Let's find out!`
- **Not independently confirmed via raw `<head>` source** (the audit tooling only had access to a rendered/extracted view of each page, not raw HTML — verify with `curl`/view-source before assuming these are 100% certain): absence of `<link rel="canonical">`, Open Graph tags, Twitter Card tags, and JSON-LD on `waxReviews.html` and other pages. All other findings below were directly observed.
- **Static pages confirmed fine on their own title/meta** (not part of the duplicate-content problem): `about.html`, `browseBySet.html`, `playerSearch.html`, `theJunkWaxYears.html`, `timeline.html` all have unique, descriptive, appropriately-sized titles and descriptions already.

---

## To-Do List (ordered by priority)

### 1. [CRITICAL] Generate unique `<title>` and `<meta name="description">` per `waxReviews.html` query-string combination
**Why it matters most**: This single template serves 90% of the site's indexed URLs (62/69), and right now every one of them has identical title/description — none can rank on set-specific long-tail searches (e.g. "1991 upper deck hockey checklist") despite that being exactly what each page reviews.

- [ ] Identify where `waxReviews.html` reads `year`, `pageName`, `blogCat`, `setID` from the query string.
- [ ] Build a title template using those values plus the set/brand name already rendered in the page body, e.g.: `{year} {brand/setName} Hockey Card Set Review | Junk Wax Hockey` (target ~50–60 characters).
- [ ] Build a meta description template, e.g.: `In-depth review of the {year} {brand/setName} hockey card set — checklist, key rookies, and whether it's still worth collecting.` (target ~150–160 characters).
- [ ] For query combinations with no `setID` (year/brand landing views), fall back to a year+brand-level title/description rather than the generic site-wide copy.
- [ ] Verify server-side rendering (not JS-only) so crawlers see the unique tags without executing JavaScript — this page may currently be JS-populated; check before assuming a client-side fix is sufficient.

### 2. [CRITICAL] Add self-referencing canonical tags site-wide
**Why**: With 62 near-identical URLs differentiated only by query string, canonicals tell Google which parameter combination is authoritative instead of making it guess.

- [ ] Add `<link rel="canonical" href="https://www.junkwaxhockey.com/waxReviews.html?year={year}&pageName={pageName}&blogCat={blogCat}&setID={setID}">` to each rendered `waxReviews.html` response, self-referencing the exact query combination served.
- [ ] Add self-referencing canonicals to all static pages too (homepage, about.html, browseBySet.html, playerSearch.html, theJunkWaxYears.html, timeline.html) — currently none were found anywhere on the site.
- [ ] Confirm with `curl -s <url> | grep -i canonical` after deploying, not just a rendered-view tool.

### 3. [CRITICAL] Add an `<h1>` to `about.html`
**Why**: Every other page on the site has exactly one clean H1; `about.html` currently has zero heading tags of any level (0 H1/H2/H3).

- [ ] Add a single `<h1>` (e.g. "About Junk Wax Hockey") to `about.html`, matching the heading pattern used on the other static pages.

### 4. [CRITICAL] Add Open Graph tags site-wide
**Why**: No `og:title`, `og:description`, `og:image`, or `og:url` found on any page checked. This site's traffic depends heavily on sharing in Discord/Reddit/Facebook/collector communities — right now every shared link renders as a bare URL with no preview card.

- [ ] Add `og:title`, `og:description`, `og:url` to every page, mirroring the (now-unique, per item #1) title/description.
- [ ] Add `og:image` — ideally an actual card-scan image per `waxReviews.html` set, not just the shared site masthead (see item #10).
- [ ] Add `og:type` (`website` for most pages, consider `article` for review pages if applicable).

### 5. [CRITICAL] Add Twitter Card tags site-wide
**Why**: Same lost-preview problem specifically on X/Twitter — none found on any page checked.

- [ ] Add `twitter:card` (`summary_large_image` recommended), `twitter:title`, `twitter:description`, `twitter:image` to every page, reusing the OG values from item #4.

### 6. [WARNING] Add JSON-LD structured data
**Why**: No structured data found anywhere; this content is naturally schema-friendly and currently has zero rich-result eligibility.

- [ ] Add `ItemList` (or `CollectionPage`) schema to `browseBySet.html`.
- [ ] Add appropriate schema (consider `Review` or a custom `CreativeWork`/`Product`-adjacent type — evaluate what fits a card-set review) to each `waxReviews.html` render.
- [ ] Add `BreadcrumbList` schema reflecting the implied hierarchy: Home → Junk Wax Years → {year} → {set name}.

### 7. [WARNING] Add `<lastmod>` to sitemap.xml entries
**Why**: None of the 69 current entries have a `<lastmod>` date, which limits Google's ability to prioritize re-crawling updated/current-season content (there's already a `year=2026` entry in the sitemap).

- [ ] Add `<lastmod>` to every `<url>` entry in the sitemap generation logic, using actual last-modified dates where available (file mtime or CMS-tracked update date), falling back to publish date otherwise.

### 8. [WARNING] Confirm the hamburger nav menu is crawlable
**Why**: A hamburger (☰) icon appears on every page, but its menu items never appeared in the fetched/extracted content on homepage, browseBySet.html, or timeline.html. This may simply be a JS-populated menu Google still executes fine — or it may mean nav links aren't present in the DOM until a user interaction. Could not be distinguished with the audit tooling available.

- [ ] Check the raw DOM (view-source, or Search Console's URL Inspection → "View Crawled Page") to confirm the nav menu's links to about.html, browseBySet.html, playerSearch.html, theJunkWaxYears.html, timeline.html, etc. are present and crawlable, not rendered only after a click.
- [ ] If JS-only, consider adding a crawlable `<nav>` fallback (plain `<a>` tags) even if visually hidden behind the hamburger toggle.

### 9. [WARNING] Consider moving `waxReviews.html` off query-string URLs
**Why**: 62 of 69 sitemap URLs use query parameters rather than clean paths. Not inherently broken, but combined with items #1–2 above, it raises the risk of Google collapsing these into low-value parameterized duplicates instead of indexing each set page distinctly. Lower urgency than #1–2 since those fixes address the root cause either way.

- [ ] Evaluate migrating to clean slugs, e.g. `/sets/{year}-{brand}/` instead of `waxReviews.html?year=...&pageName=...&setID=...`.
- [ ] If migrating, set up 301 redirects from the old query-string URLs to the new slugs, and update sitemap.xml accordingly.

### 10. [OPPORTUNITY] Audit alt text and format on the actual card-scan images
**Why**: Only 3 images were visible across all pages fetched during this audit, despite this being a card-scan-driven review site — the review body content (and its images) wasn't captured by the audit tooling. This is likely the single highest-value image-search asset on the site and needs direct verification.

- [ ] Confirm every card-scan image on `waxReviews.html` pages has descriptive alt text (not filenames like `img_0423.jpg`).
- [ ] Confirm card-scan images use a modern format (WebP/AVIF) and have explicit `width`/`height` attributes to avoid layout shift.
- [ ] Add lazy-loading (`loading="lazy"`) to below-the-fold card images.

### 11. [OPPORTUNITY] Add visible breadcrumbs to `waxReviews.html`
- [ ] Pair with the `BreadcrumbList` schema in item #6: Home → Junk Wax Years → {year} → {set name}, both as visible UI and as additional crawlable internal links back to `theJunkWaxYears.html`/`timeline.html`.

### 12. [OPPORTUNITY] Run a performance pass
**Why**: Render-blocking resources, inline script bloat, and minification could not be assessed by the audit tooling (no raw HTML / Lighthouse access in that session).

- [ ] Run PageSpeed Insights / Lighthouse against representative URLs (homepage + one `waxReviews.html` set page) and address any flagged render-blocking resources or unoptimized assets.

---

## Already confirmed working — do not change

- `robots.txt`: correct, minimal, properly references the sitemap.
- `sitemap.xml`: live, well-formed, all 69 URLs present, no stale entries (aside from the missing `<lastmod>` in item #7).
- Viewport meta tag: present and correctly configured on every page checked.
- Heading structure: clean single-H1 pattern on every static page except `about.html` (item #3).
- The 2–3 images found outside the review template already have good descriptive alt text and use WebP.
- Title/meta description on static pages (`about.html`, `browseBySet.html`, `playerSearch.html`, `theJunkWaxYears.html`, `timeline.html`) are already unique and well-written — do not regenerate these, only fix `waxReviews.html`.
