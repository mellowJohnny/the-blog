# Style guide — public pages

**Scope:** the public pages at the repo root (Home, About, the review pages,
Player Search, Lockout, The Junk Wax Years, Timeline, Browse By Set, The Wax
Museum) and the parts of `styles/styles.css` and `scripts/*.js` that draw
them. The `/cms` pages follow their own conventions (`CMS_GUIDE.md`, "HTML
conventions for `/cms` pages").

**This guide is binding.** Any new or changed public-page markup, CSS or
script-built HTML follows it. A deviation needs the site owner's approval
first, and an approved one is recorded here. Run the style check before
calling a UI change done (see "The style check" below).

The rule behind every section: **reuse what exists before writing anything
new.** If a heading, colour, size or component is already defined, use it. If
nothing fits, stop and propose an addition to this guide. Don't invent a
one-off value for one page.

## Colours

Use the `:root` tokens in `styles.css`. Don't type a colour value into a rule.

| Token | Value | Use |
|---|---|---|
| `--color-page-bg` | `rgb(228, 241, 250)` | Page background |
| `--color-text` | `#000` (black) | Body text: intros, review and post bodies |
| `--color-text-dark` | `rgb(11, 62, 100)` (navy) | h2 and h3 headings, card titles, modal titles |
| `--color-heading-outline` | `rgb(2, 70, 153)` | Nav links, footer band, masthead text outline |
| `--color-link` | `#3FA7D6` | Links in content |
| `--color-byline` | `#555` | Bylines (author, date, reading time) |
| `--color-input-border` | `rgb(85, 174, 233)` | Input borders, result dividers |
| `--color-image-border` | `rgb(22, 86, 138)` | Image borders |
| `--color-masthead-bg` | `rgb(44, 82, 137)` | Masthead fallback background |
| `--color-accent-hover` | `#e551f5` | Link hover accent |
| `--color-white` | `#fff` | Text on dark backgrounds (footer, phone menu, buttons, Flip pills); card, modal and dropdown backgrounds |
| `--color-button` | `#256386` | Button fills, checklist filter pills, breadcrumb links |
| `--color-red` | `#a83232` | The site's one red: rookie-card notes (the CMS also uses it for required marks and delete buttons) |
| `--color-content-bg` | `rgb(212, 233, 241)` | The `.blog-entry` content box |
| `--color-masthead-text` | `rgb(252, 252, 245)` (cream) | "Junk Wax Hockey" masthead text, page and checklist modal |
| `--color-grey-dark` | `#444` | Dark grey text: modal ×, pagination page count, viewed Timeline year |
| `--color-grey` | `#666` | Muted text: notes, breadcrumb separators and current page, disabled links, viewed cards |
| `--color-grey-light` | `#ccc` | Light borders and dividers |
| `--color-surface-muted` | `#eceff1` | Muted backgrounds: viewed Timeline cards, missing-image placeholders |
| `--color-starburst` | `#ffd23f` (comic yellow) | McFarlane's Shelf "Variant!" starburst only (owner-approved 2026-11-10) |
- **Body text** is black (`--color-text`) everywhere, in the content boxes
  as well as on the page background.
- **Three greys only.** Pick dark, mid or light; don't add an in-between
  shade.
- **Translucent black or white** (`rgba(0, 0, 0, a)`, `rgba(255, 255, 255, a)`)
  is allowed for overlays, sheens and dividers on dark backgrounds. A
  translucent site colour uses `color-mix()` on its token, for example
  `color-mix(in srgb, var(--color-text-dark) 85%, transparent)`.
- A new colour needs a new token, added here first.

## Fonts

Four families, all self-hosted (see `FRONTEND.md`, "Typography / fonts"). No
other family, and no Google Fonts link.

| Family | Use | Weights |
|---|---|---|
| Source Sans 3 | All text and every heading | 400, 700 (and their italics) |
| Nunito | Wayfinding only: nav, footer, year picker, Flip pills | 200, 600 |
| Bebas Neue | The "Junk Wax Hockey" masthead only | 400 |
| Special Elite | Review set details and `.caption` only | 400 |

- The public pages' `body` defaults to Source Sans 3, so text that sets no
  font still gets the right one. Still name the family on components that
  need a specific one; don't rely on the default for Nunito, Bebas Neue or
  Special Elite.
- Always write the full stack with the fallback face, for example
  `'Source Sans 3', 'Source Sans 3 Fallback', sans-serif`.
- Ask only for a weight the family has. A 600 Source Sans 3 renders as 700;
  write 700.
- Form controls don't inherit the page font: give every `input`, `select`,
  `textarea` and `button` a font family explicitly.

## Type scale

| Role | Size | Notes |
|---|---|---|
| h1 page title | 34px | One per page. Black. Shared rule `.intro h1, .header-style h1, #card-intro h2`. |
| h2 section heading | 26px, 22px at 600px and below | Navy. Shared rule `.blog-title, #timelineTitle, .browse-col-heading`. |
| h3 sub-heading | 20px | Navy. Shared rule `.player-search-set-name, .browse-season-heading`. |
| Card title | 16–18px | Navy, inside small cards and modals only. Approved: `.wax-museum-name`, `.timeline-back-title`, `.timeline-heading`, `.checklist-modal-title` (22px, the modal's own title), `.checklist-modal-group-title`, `.set-details-name`. |
| Body text | 18px | Intros, review and post bodies. |
| Small text | 16px | Bylines and captions may use it; details lists. |
| Secondary text | 15px | Footer links, breadcrumbs, checklist cards, Timeline lists. |
| Fine print | 12–14px | Labels (`.footer-heading`), pills, notes, the copyright line. |

- **px only.** No `rem` or `em` sizes: they compound inside nested elements
  and drift off the scale.
- **Icon glyphs** (the ☰ menu button, the × close, the ▾ dropdown arrow) are
  sized to fit their control, not to the text scale.
- **A new heading joins a shared rule.** Add its selector to the h2 or h3
  rule; give it its own rule only for margins and alignment. Never give a
  heading its own font size or colour. The approved card and modal titles
  above are the only exceptions; a new one is approved here first.
- The review page intro h2 is 34px on purpose: the real h1 (the set name) is
  hidden, so the intro heading is the visible page title.

## Headings

- One `h1` per page, then `h2`, then `h3`. Never skip a level. Pick the tag
  for its place in the outline, and let the class set the look.
- A heading-looking element uses a heading tag, not a styled `div`.

## Components to reuse

| Need | Use | Don't |
|---|---|---|
| Page title block | `.header-style` with an `h1`, or an `h1` inside `.intro`. Both get the same spacing from the shared rules: 13px below the nav (25px below breadcrumbs, from the trail's bottom padding), about 23px to the intro text, at every width. | A new title wrapper, or per-page title margins |
| Intro paragraph | `<div class="intro"><p>…</p></div>` inside `.flex-container`. Directly under a `.header-style` heading it gets the shared spacing rule. | Bare text in the intro div, or a per-page intro padding rule |
| Content box (review, post, essay) | `.blog-entry` | A new boxed container |
| Byline | `.byline` (dark grey, regular, not italic) | `<strong><i>` |
| Image caption | Italic, `<em>` or a caption class | Bold italic |
| Button | `.input-button` (the shared "Buttons" block) | A new button style or inline style |
| Flip hint on a card | The shared Flip pill (`.timeline-hint`) | A new pill |
| Breadcrumbs | `#breadcrumbs` filled by `renderBreadcrumbs()`, with its `BreadcrumbList` structured data, on pages below a section only: the review pages and Lockout. Top-level pages have none on purpose (owner decision, 2026-11-07): a "Home › Page" trail adds nothing, and breadcrumbs aren't a ranking factor. | Breadcrumbs on a top-level page |
| Scores ticker | The `#nhlTicker` block, on the hockey content pages. Home and The Wax Museum have none on purpose (owner decision). | Adding it to Home or the Wax Museum |
| Loading spinner | `showSpinner()` (helper.js) around every fetch a visitor waits on; call the function it returns when the fetch settles, success or failure. No argument gives a small card centred on the screen, with no screen wash (page loads; owner decision, 2026-11-08). Passing a modal's body element puts the same ring inline in that body. It appears only after 500ms, so fast loads never flash it. Under the ring, a random phrase from `SPINNER_PHRASES` types out letter by letter behind a blinking block cursor in the text colour and changes every 2 seconds; add new phrases to that list. On touch devices it also shows after a tapped link that leaves the page (`showNavigationSpinner()`), so a new link needs no code of its own; a link a page handles in JavaScript must call `preventDefault()`. Error messages still go in the page's own status element. Content that is already on screen (the pre-rendered All Sets list) refreshes with no spinner. | "Loading..." text, a blank wait, a page-specific spinner copy, or an overlay stacked on a modal |
| Section divider | `.browse-season-heading`'s underline or the result divider | Ad hoc `<hr>` styling |

## Markup rules

- **No inline `style=""`** in HTML or in script-built HTML. Use a class.
  Script may set a computed value through `element.style` (for example a
  measured height); fixed looks belong in CSS.
- **No `<i>`, `<b>` or `<font>` for looks.** Use a class, or `<em>`/`<strong>`
  when the meaning is emphasis.
- **Absolute links to site pages.** Every link (`href`) to a page on this
  site starts with `/`: `/index.html`, `/theJunkWaxYears.html`,
  `/reviews/<slug>/`, never `index.html` or `../index.html`. This applies to
  static HTML and to links built in scripts; script, stylesheet and image
  paths (`src`, `<link href>`) use the same `/…` form. Generated review pages sit one
  folder deeper (`/reviews/<slug>/`), so a relative link that works on a
  root page breaks there. External links (`https://…`), in-page anchors
  (`#…`) and `mailto:` are fine as they are. The style check flags any
  other relative `href` (`relative-link`).
- **Head order.** Every public page starts the same way: `<!doctype html>`
  (lowercase), `<html lang="en-ca">`, then in `<head>`: `<meta charset>`,
  the viewport `<meta>`, the three favicon links (`/favicon.ico`,
  `icon-192.png`, `apple-touch-icon.png`, one attribute per line), then the
  title, description, canonical and social tags. (`waxReviews.html` has no
  canonical in its head on purpose; each set's is set per page.)
- **New public pages** copy an existing page's head and skeleton: the same
  head order, masthead, `nav`/`footer` markers with `data-nav-page`, the
  ticker block where the page has one, and the analytics loader (see
  Analytics below).

## Analytics

Every public page loads Google Analytics (property `G-JMGVGK09QX`) only
after the window `load` event, so it never competes with the page's own
content while it loads. Use exactly this block in the `<head>`:

```html
<!-- Global site tag (gtag.js) - Load Google Analytics until later -->
<script>
  window.addEventListener('load', function() {
    var g = document.createElement('script');
    g.src = 'https://www.googletagmanager.com/gtag/js?id=G-JMGVGK09QX';
    g.async = true;
    document.head.appendChild(g);
  });
</script>
```

and, in the page's main inline script, the standard queue, which records
the page view as soon as the library arrives:

```js
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-JMGVGK09QX');
```

- No `<script async src="…googletagmanager…">` tag: it starts downloading
  during page load. The style check flags it (`analytics-loader`).
- No other tracking or third-party tag without the owner's approval.
- `/cms` pages carry no analytics.

## Known traps

- **`.flex-container div`** is a bare descendant selector: it forces every
  `div` inside `.flex-container` to 1000px with 15px padding and 5px margin.
  A new `div` there needs a reset that outranks it (for example
  `.flex-container .byline`), or use a non-`div` element.
- **`#pageHeader`** is shared by the review pages and Lockout; a rule for one
  hits the other.
- **Form controls** fall back to the system font unless given one (see Fonts).

## The style check

`tools/styleCheck/check.mjs` checks the mechanical rules: colours outside
`:root`, font families, sizes and weights off the scale, headings styled
outside the shared rules, inline `style=""`, `<i>`/`<b>`/`<font>`, relative
links, skipped heading levels in static HTML, the head order (lowercase
doctype, then charset, viewport, favicons and title), and the analytics
loader (an old-style `async` tag, or a page with no window-load loader). It is run by hand and is
never part of the Amplify build.

- `node tools/styleCheck/check.mjs` checks only the lines changed since the
  last commit (and new files). Run it before calling a change done; it must
  report no findings.
- `node tools/styleCheck/check.mjs --all` reports every violation in scope:
  the backlog of known deviations below.

The allowed values (type scale, fonts, CMS-only selectors it skips, approved
heading classes) live in `tools/styleCheck/config.json`. When this guide
changes, change that file with it. It can't see script-built heading levels
or what a page looks like, so the browser check in the list below still
applies.

## Before calling a UI change done

1. Every colour is a token, every font is one of the four, every size is on
   the type scale.
2. Every heading uses a shared rule, and the outline has no skipped level.
3. No inline styles, no `<i>`/`<b>` for looks, links are absolute.
4. Checked in a browser at 1300px and 390px: nothing scrolls sideways, and
   it looks like the neighbouring pages.
5. The style check passes for the changed files.

## Approved deviations

Self-contained components the owner approved on 2026-11-06 to keep their own
palette and sizes. They follow their own internal rules instead of the
tokens and type scale above, and the style check skips them (the
`approvedComponentPrefixes` list in `tools/styleCheck/config.json`).

- **The NHL/PWHL scores ticker** (`#nhlTicker`, `.nhl-ticker`, `.nhl-chip`,
  `.ticker-*`): a dark strip with its own greys, white text and league
  colours, sized to fit 40px.
- **The NHL game modal** (`.nhl-game-*`, `.nhl-linescore`, `.nhl-team-stats`,
  `.nhl-goal-*`, `.nhl-video-*`, `.nhl-recap`): modelled on nhl.com's game
  page, with its own score, badge and tab styles.

New work on these components stays consistent with the component itself.
Anything outside them follows the guide.

## Known deviations still to fix

None. Every item from the 2026-11-06 consistency review is fixed, and
`check.mjs --all` reports no findings (2026-11-07). Keep it at zero: a new
finding is a regression to fix, not a new baseline.
