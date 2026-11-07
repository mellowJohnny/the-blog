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
| `--color-text-dark` | `rgb(11, 62, 100)` (navy) | h2 and h3 headings, card titles, modal titles |
| `--color-heading-outline` | `rgb(2, 70, 153)` | Nav links, footer band, masthead text outline |
| `--color-link` | `#3FA7D6` | Links in content |
| `--color-byline` | `#555` | Bylines (author, date, reading time) |
| `--color-input-border` | `rgb(85, 174, 233)` | Input borders, result dividers |
| `--color-image-border` | `rgb(22, 86, 138)` | Image borders |
| `--color-masthead-bg` | `rgb(44, 82, 137)` | Masthead fallback background |
| `--color-accent-hover` | `#e551f5` | Link hover accent |

- **Body text** is black on the page background.
- **Red** `#a83232` is the site's one red (rookie cards, required-field
  marks, destructive buttons). Use it only for those, and add it as a token
  the next time a rule needs it.
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
| Card title | 16–18px | Navy, inside small cards only (`.wax-museum-name`, `.timeline-back-title`). |
| Body text | 18px | Intros, review and post bodies. |
| Small text | 16px | Bylines and captions may use it; details lists, footer links. |
| Fine print | 12–14px | Labels, pills, the copyright line. |

- **A new heading joins a shared rule.** Add its selector to the h2 or h3
  rule; give it its own rule only for margins and alignment. Never give a
  heading its own font size or colour.
- The review page intro h2 is 34px on purpose: the real h1 (the set name) is
  hidden, so the intro heading is the visible page title.

## Headings

- One `h1` per page, then `h2`, then `h3`. Never skip a level. Pick the tag
  for its place in the outline, and let the class set the look.
- A heading-looking element uses a heading tag, not a styled `div`.

## Components to reuse

| Need | Use | Don't |
|---|---|---|
| Page title block | `.header-style` with an `h1`, or an `h1` inside `.intro`. Both get the same spacing from the shared rules: 13px below the nav or breadcrumbs, about 23px to the intro text, at every width. | A new title wrapper, or per-page title margins |
| Intro paragraph | `<div class="intro"><p>…</p></div>` inside `.flex-container`. Directly under a `.header-style` heading it gets the shared spacing rule. | Bare text in the intro div, or a per-page intro padding rule |
| Content box (review, post, essay) | `.blog-entry` | A new boxed container |
| Byline | `.byline` (dark grey, regular, not italic) | `<strong><i>` |
| Image caption | Italic, `<em>` or a caption class | Bold italic |
| Button | `.input-button` (the shared "Buttons" block) | A new button style or inline style |
| Flip hint on a card | The shared Flip pill (`.timeline-hint`) | A new pill |
| Section divider | `.browse-season-heading`'s underline or the result divider | Ad hoc `<hr>` styling |

## Markup rules

- **No inline `style=""`** in HTML or in script-built HTML. Use a class.
  Script may set a computed value through `element.style` (for example a
  measured height); fixed looks belong in CSS.
- **No `<i>`, `<b>` or `<font>` for looks.** Use a class, or `<em>`/`<strong>`
  when the meaning is emphasis.
- **Absolute links** to site pages (`/index.html`, not `index.html`), since
  generated review pages sit one folder deeper.
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
links, skipped heading levels in static HTML, and the analytics loader (an
old-style `async` tag, or a page with no window-load loader). It is run by hand and is
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

Found by the 2026-11-06 consistency review. Fix them rather than copy them.
`check.mjs --all` lists the mechanical ones line by line.

- `<!DOCTYPE>` casing and favicon tag formatting differ between pages.
- `body` has no font family, so anything missed falls back to Times.
- Review and post body text is `rgb(34, 38, 41)`, not black like intros.
- `styles.css` still has many hand-typed colours and sizes from before this
  guide.
