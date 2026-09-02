# CMS Page Flows

The companion to `PUBLIC_PAGE_FLOWS.md`, covering all 10 pages under
`/cms`. Same shape per page: what loads, what runs automatically on
load, what each interaction triggers, and which API endpoint (named
exactly as in `API_ENDPOINTS.md`) each function calls. Every page here
loads `scripts/auth.js` first, which gates page access via Cognito —
see `AUTH.md` — that's not repeated per page below. Several pages
define `fetchCopyrightYear()` twice over (it exists, identically, in
both `scripts/cms.js` and `scripts/helper.js`) since not every CMS page
loads both files — where that matters for which copy actually runs,
it's called out.

## `cms/wlcms.html` — CMS home

**What loads**: `auth.js`, `cms.js`. **No `helper.js`** — this page is
the one CMS page that doesn't load it at all.

**On `window load`**: `fetchCopyrightYear()` — resolves to `cms.js`'s
copy, since `helper.js` isn't loaded here.

**No API calls happen on this page at all** — it's a pure navigation
hub, the only CMS page with that property.

**User interactions**:
- Cards / Blogs / Admin dropdown buttons → a small inline script
  written directly in this page (not in any shared `scripts/*.js` file)
  toggles an `.open` class on click, closes any other open dropdown
  first, and closes on an outside click or Escape. Independently, a
  `@media (hover: hover) and (pointer: fine)` CSS rule also opens the
  same dropdown on mouse hover, with no JS involved — see
  `CMS_GUIDE.md`'s "Entry point & pages" section for this nav's full
  description.
- Every link inside a dropdown (`...new card set`, `...edit a card
  set`, `...upload a checklist`, `...new blog post`, `...edit a blog
  post`, `...admin tools`, `AMP SMS`) and the plain `...exit` link are
  all ordinary `<a href>` navigations to another page — no JS, no API
  call.

## `cms/createBlogPost.html`

**What loads**: `auth.js` and the TinyMCE CDN script in `<head>`;
`helper.js` then `cms.js`, both placed just after `</head>` (this
order means `cms.js`'s `fetchCopyrightYear()` is the one that actually
runs, since it's defined last and overwrites `helper.js`'s identical
copy).

**On `window load`**: `fetchCopyrightYear()`, then
`initTinyEditor('#postBody')` (`cms.js`) — initializes the shared
TinyMCE config (lists/link/image/code/autoresize plugins, 1000px wide,
400-500px auto-resizing height) against the Post Body textarea.

**User interactions**:
- "Browse" button next to Image → `openBlogImageBrowser('imgName')`
  (`cms.js`) — calls `fetchBlogImageList()`, which calls **List images
  in the bucket** and filters the result client-side to the `img/blog/`
  prefix, then `renderBlogImageList()` draws a thumbnail grid into
  `#imageList`. Clicking a thumbnail writes the **complete S3 URL**
  into `#imgName` (not just a filename — see `CMS_GUIDE.md`'s
  blog-vs-card-set image field distinction) and closes the modal.
- Image search box inside the modal (`oninput="filterBlogImageList()"`)
  — correctly wired, reading `_blogImageFiles`/`_blogImageTargetFieldId`,
  the state `openBlogImageBrowser()` actually populated on this page.
  (Fixed 2026-09-02 — this used to call `filterImageList()`, which reads
  `_imageBrowserFiles`/`_imageBrowserTargetFieldId` instead, the **card
  set** picker's state, so typing here filtered against whatever
  empty/stale card-set image list happened to be in memory rather than
  the blog images actually shown.)
- "Upload" button in the modal → `uploadNewImage()` (`cms.js`) —
  branches on which target-field variable is set (`_imageBrowserTargetFieldId`
  vs `_blogImageTargetFieldId`) to pick the S3 directory; since this
  page only ever calls `openBlogImageBrowser()`, it correctly resolves
  to `img/blog/`. Calls **Get S3 upload URL (presigned PUT)**, then
  `PUT`s the raw file directly to the returned presigned URL, then
  (on this page's branch) re-runs `fetchBlogImageList()`/
  `renderBlogImageList()` and sets `#imgName` to the upload response's
  `finalUrl` (a full URL, matching the click-a-thumbnail behavior
  above).
- Close (`×`) → `closeImageBrowser()`.
- "Submit Post" button → `createBlogPost(published, title, imgName,
  imgCap, author, blogType)` (`cms.js`) — validates `title` is
  non-blank (`await cmsAlert(...)` + refocus the field if not), then
  reads the TinyMCE body via `tinymce.activeEditor.getContent()` /
  `getContent({format:"text"})` and validates it's non-blank the same
  way. Sets the submit button to its "Crossing Fingers..." state, then
  calls **Create blog post**. On success: `await cmsAlert(data.message)`,
  then redirect to `pickBlog.html`. On a non-2xx response: `await
  cmsAlert(errMsg)`, stays on the page with the form intact. On a
  malformed JSON response: `await cmsAlert("Unexpected server
  response.")`.

**Notable**: `#imgName` defaults to the literal string `"none"` in the
HTML (the sentinel `displayBlog()` checks for to skip rendering an
image) — see `DATA_MODEL.md`'s `Blogs.img` note.

## `cms/createCardSet.html`

**What loads**: `auth.js` and the TinyMCE CDN script in `<head>`; then
`cms.js`, `wax.js`, `helper.js` (in that order — `helper.js` loaded
last, so **its** `fetchCopyrightYear()` is the one that runs here, the
opposite of `createBlogPost.html`). `wax.js` doesn't appear to back
anything this page actually calls — none of its functions
(`fetchCardSetsByYear`, `displayCardSet`, `castVote`, the checklist
modal functions) are referenced anywhere in this page's markup or
inline scripts.

**On `window load`**: `fetchCopyrightYear()`, then
`initTinyEditor('#postBody')` — same as `createBlogPost.html`.

**User interactions**:
- "Browse" buttons next to Header/Footer Image Name →
  `openImageBrowser('headerImgName')` / `openImageBrowser('footerImgName')`
  (`cms.js`) — calls `fetchImageList()` (**List images in the bucket**,
  filtered client-side to `img/cards/`), `renderImageList()` draws the
  thumbnail grid. Clicking a thumbnail writes just the bare
  **filename** into the target field (not a full URL — the `Cards`
  table stores the S3 prefix separately, concatenated at render time in
  `wax.js`'s `displayCardSet()`) and closes the modal.
- Image search box (`oninput="filterImageList()"`) — correctly wired
  on this page, since `openImageBrowser()` is what actually populated
  the state `filterImageList()` reads.
- "Upload" button → `uploadNewImage()` — same function as
  `createBlogPost.html`; here `_imageBrowserTargetFieldId` is the one
  set, so it resolves to `img/cards/`, re-runs
  `fetchImageList()`/`renderImageList()`, and sets the target field to
  the bare `fileName` (not `finalUrl`) on success.
- Close (`×`) → `closeImageBrowser()`.
- "Submit Post" button → `createCardSet(blogStatus, seoPageTitle,
  seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets,
  stars, formats, year, headerImgName, footerImgName, mfg, blogCat)`
  (`cms.js`) — three separate validation checks, each its own `await
  cmsAlert(...)` + refocus + early return: `setName` non-blank, `year`
  non-blank, then the TinyMCE body non-blank. Sets the submit button's
  "Crossing Fingers..." state, then calls **Create card set**. Same
  success/error/malformed-JSON handling pattern as `createBlogPost()`,
  redirecting to `pickCardSet.html` on success; additionally has its
  own network-error `.catch()` showing `await cmsAlert("Network error
  creating the card set.")` (not present on `createBlogPost()`'s
  equivalent chain).

## `cms/pickBlog.html`

**What loads**: `auth.js`, `cms.js`. No `helper.js` — like
`wlcms.html`, `fetchCopyrightYear()` here resolves to `cms.js`'s copy.
Two separate inline `<script>` blocks each register their own `window
load` listener (rather than one combined listener) — both fire, in
the order they were attached.

**On `window load`** (first listener): `getBlogsForUpdate()` (`cms.js`)
— calls **Get all live blogs (for the edit picker)** with the Cognito
`Authorization` header, then groups the result by `blogType` (via
`BLOG_TYPE_LABELS`), inserting an `<h2>` divider each time the type
changes, and calls `displayBlogs(title, blogID, blogType)` per entry —
each one a link to `blogEdit.html?blogID=<id>&blogType=<type>` — into
`#listBlogsDiv`. An empty result shows a message in `#noBlogsDiv`
instead. `fetchCopyrightYear()` also runs in this same listener.

**On `window load`** (second listener): `getStagedBlogsForUpdate()`
(`cms.js`) — same shape, calling **Get all staged (draft) blogs** instead,
grouping the same way but inserting an `<h3>` divider (not `<h2>` —
a small, harmless inconsistency versus the live-list divider above)
into `#listStagedBlogsDiv`, empty case falling back to
`#noStagedBlogsDiv`.

**User interactions**: none beyond the plain `blogEdit.html?...` links
built by `displayBlogs()`/`displayStagedBlogs()`.

## `cms/pickCardSet.html`

**What loads**: `auth.js`, `cms.js`. No `helper.js` (same as
`pickBlog.html`). Two separate inline `window load` listeners again —
this time `fetchCopyrightYear()` is grouped into the **second**
listener (alongside the staged-sets fetch), the opposite grouping from
`pickBlog.html`, where it's in the first.

**On `window load`** (first listener): `fetchAllCardSets()` (`cms.js`,
`async`) — calls **Get all live card sets (for the edit picker)** with the
Authorization header, tolerantly unwraps whichever response shape comes
back (raw array / `data.body` as a JSON string / `data.body` as an
array / `data.Items`), sorts by `blogCat` then `year`, groups with an
`<h2>` divider via `CARDSET_CATEGORY_LABELS`, and calls
`displayCardSets(container, setID, setName)` per entry — a link to
`setEdit.html?setID=<id>` — into `#editBlogsDiv`. Empty result →
`#noBlogsDiv`.

**On `window load`** (second listener): `fetchAllStagedCardSets()`
(`cms.js`, `async`) + `fetchCopyrightYear()`. The staged fetch calls
**Get all staged (draft) card sets**, same tolerant unwrap, then applies a
defensive fallback — any staged item with a `mfg` value but no
`blogCat` (a record predating that field, or created directly in
DynamoDB) is treated as `blogCat: "reg"` before sorting/grouping the
same way as the live list, via `displayStagedCardSets(setID, setName)`
into `#stagedBlogsDiv`. Empty result → `#noStagedBlogsDiv`.

**User interactions**: none beyond the plain `setEdit.html?...` links.

## `cms/blogEdit.html`

**What loads**: `auth.js` and the TinyMCE CDN script in `<head>`; then
(unusually, placed right before `<body>` rather than inside `<head>`
like every other CMS page) `helper.js` then `cms.js` — `cms.js` loaded
last, so its `fetchCopyrightYear()` wins here. The `blogID`/`blogType`
query-param extraction and the `window load` listener live together in
that same post-`</head>` script block.

**On `window load`**: `fetchBlogByID(blogID, blogType)` (`cms.js`) —
calls **Get a single blog by ID**, with the Authorization header. If
`data.item` is missing, shows "Blog not found." in `#errorDiv` and
stops; otherwise calls `populateBlog(blog)`, which sets the TinyMCE
content via `tinymce.get("postBody").setContent(blog.postBody)`,
rebuilds the Published `<select>`'s two `<option>`s with whichever is
currently true marked `selected`, and fills `title`/`imgName`/`imgCap`/
`blogType` (disabled)/`time` (disabled) directly. Also runs
`fetchCopyrightYear()` and `initTinyEditor('#postBody')` in the same
listener.

**User interactions**:
- "Update Post" button → `updateBlogPost(title, imgName, imgCap,
  published, blogType, time, blogID)` (`cms.js`) — **no client-side
  required-field validation at all** (unlike the create form for the
  same content type) — it proceeds straight to submitting. Sets the
  submit button's "Crossing Fingers..." state, reads the TinyMCE
  content via `tinymce.get("postBody").getContent()` (a different
  accessor than `createBlogPost()`'s `tinymce.activeEditor.getContent()`
  — functionally equivalent here since there's only one editor instance
  on the page, but a real inconsistency in how the two forms reach it),
  normalizes `published` to a real boolean and `blogType` to a `Number`,
  then calls **Update blog post**. On success: `await cmsAlert(data.message)`
  then redirect to `pickBlog.html`; on error: `await cmsAlert(...)`,
  stays on the page; on malformed JSON: `await cmsAlert("Unexpected
  server response.")`.
- "Delete Post" button → `deleteBlogPost(blogID, blogType, time)`
  (`cms.js`) — `await cmsConfirm("Delete this blog post? This cannot be
  undone.")` first; if cancelled, nothing else happens. If confirmed,
  calls **Delete blog post** with the Authorization header. On success:
  `await cmsAlert(result.message)` then redirect to `pickBlog.html`; on
  error: `await cmsAlert("Error deleting blog.")`.

**Notable**: the Preview button is present in the HTML but commented
out (`<!-- ... onclick="openPreview()" ... -->`) — unlike
`setEdit.html`, this page has no working live preview.

## `cms/setEdit.html`

**What loads**: `auth.js` and the TinyMCE CDN script in `<head>`; then
`cms.js`, `wax.js`, `helper.js` (`helper.js` loaded last, wins for
`fetchCopyrightYear()`). The `setID` extraction and `window load`
listener are together in `<head>` (unlike `blogEdit.html`'s equivalent
block, which sits after `</head>`).

**On `window load`**: `fetchCardSetByID(setID)` (`cms.js`) — calls
**Get a single card set by ID**, tolerantly unwraps the response the
same way `fetchAllCardSets()` does, and takes `items[0]`. Empty result
shows "these aren't the Droids you're looking for..." in `#errorDiv`;
otherwise calls `populateCardSet(...)` (15 positional args), which sets
the TinyMCE body via `tinymce.activeEditor.selection.setContent(postBody)`
— note this is yet a **third** distinct way this codebase inserts
content into TinyMCE (`createCardSet.html`/`createBlogPost.html` never
need to since they start blank; `blogEdit.html` uses
`tinymce.get("postBody").setContent()`) — rebuilds the `blogStatus`
`<select>`'s options with the correct one marked `selected`, and fills
every other field directly (`setName` and `year` are populated but
`disabled`/`readonly` in the HTML, so they display but can't be
hand-edited). Also runs `fetchCopyrightYear()` and
`initTinyEditor('#postBody')`.

**User interactions**:
- "Browse" buttons (Header/Footer Image Name) → same
  `openImageBrowser()`/`fetchImageList()`/`renderImageList()`/
  `uploadNewImage()` flow as `createCardSet.html`, writing a bare
  filename into the target field.
- "Update Post" button → `updateCardSet(blogStatus, seoPageTitle,
  seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets,
  stars, formats, year, headerImgName, footerImgName, mfg)` (`cms.js`)
  — no client-side validation, same as `updateBlogPost()`. Sets the
  submit button state, reads `tinymce.activeEditor.getContent()`, then
  calls **Update card set**. This Lambda's response shape isn't
  reliable (plain string / `{message}` / `{body}`, itself either a JSON
  string or plain text), so the handler tolerantly unwraps all of them
  into a single `message`, defaulting to `"Update complete."` **only**
  when `response.ok` is actually true (an unrecognized shape on a
  genuine failure never gets shown as a false success). `await
  cmsAlert(message)` always runs; the redirect to `pickCardSet.html`
  only fires when `response.ok`.
- "Preview" button → `openPreview()` (`cms.js`) — reads the current
  (possibly unsaved) form field values plus
  `tinymce.get("postBody").getContent()`, and calls `renderPreview(...)`,
  which builds the same kind of set-details table `displayCardSet()`
  renders on the live site, into `#previewContainer`, then shows
  `#previewModal`. **Purely client-side — no API call.** Two things
  make this not a perfect mirror of the real page: it hardcodes the S3
  `img/cards/` URL prefix directly rather than reading the record's
  actual `headerImg`/`footerImg` prefix fields, and it always uses
  `rowspan="7"` on the header image cell — it never renders a Checklist
  row, unlike the live `displayCardSet()`, which bumps that to `8` when
  `hasChecklist` is true.
- Close preview (`×`) → `closePreview()` — hides the modal and clears
  `#previewContainer`.
- "Delete Set" button → `deleteCardSet(setID, setName, year)` (`cms.js`)
  — `await cmsConfirm("Delete this card set? This cannot be undone.")`
  first. If confirmed, calls **Delete card set**. On success: `await
  cmsAlert(result.message)` then redirect to `pickCardSet.html`; on
  error: `await cmsAlert("Error deleting card set.")`.

## `cms/uploadChecklist.html`

**What loads**: `auth.js` and an inline `window load` listener
(`fetchCopyrightYear()` only) in `<head>`; then `cms.js`,
`checklistUpload.js`, `helper.js` after `</head>` (`helper.js` last,
wins for `fetchCopyrightYear()`).

**On `DOMContentLoaded`** (registered inside `checklistUpload.js`
itself, separately from the page's own `window load` listener): wires
up the upload/parse modal's full interaction set — open/close, file
selection (via input or drag-and-drop), and the Parse button — all
guarded by `if (!importLink) return;` so this same script can safely
load on a page without the modal present.

**User interactions**:
- "Upload Checklist PDF..." link → opens the modal
  (`resetModal()` + `overlay.style.display = "flex"`).
- Selecting/dropping a file → `handleFileSelected()` — rejects anything
  that isn't a PDF by MIME type or `.pdf` extension (inline modal
  feedback, not `cmsAlert`), otherwise enables the Parse button.
- Cancel / clicking the backdrop → closes the modal and resets it.
- "Parse" button → `parseChecklistPdf(file, {...})` — reads the file as
  base64 via `FileReader` (`readFileAsBase64()`, stripping the
  `data:...;base64,` prefix), then calls **Parse a checklist PDF** with
  the Authorization header. On success: fills `#checklistSetName`/
  `#checklistInsertSetName` from the response, calls
  `renderChecklistTable(cards)` — which builds one editable `<tr>` per
  card via `buildChecklistRow()` (Card #/Player Name/Notes text inputs
  plus a per-row delete button, each value escaped via this file's own
  narrower `escapeAttr()`, not the shared `escapeHtml()` in
  `helper.js` — see `FRONTEND.md`) — shows `#checklistReviewSection`,
  sets a status message (mentioning the `skippedDuplicates` count when
  non-zero), and closes the modal. On error: shows the error as inline
  modal feedback instead of closing it.
- "+ Add Row" button → `addChecklistRow()` — appends one more blank
  editable row.
- Per-row delete (`×`) button → removes that `<tr>` directly from the
  DOM — no confirmation, no API call, since nothing has been saved yet
  at this point.
- "Save to DynamoDB" button → `saveChecklist()` (`async`) — three
  sequential validations, each `await cmsAlert(...)` + early return:
  Set Name non-blank, `collectChecklistRows()` yields at least one row,
  every collected row has both a Card # and a Player Name. Sets the
  Save button to a "Saving..." state, then calls **Save a reviewed
  checklist** with the Authorization header, body `{setName,
  insertSetName, cards}`. On success: `await cmsAlert(data.message)`
  (which may carry a `Warning:` suffix if the checklist saved but its
  `Cards` linking step failed — see `LAMBDA_FUNCTIONS.md`'s
  `saveChecklist` entry) then a full-reload redirect back to
  `cms/uploadChecklist.html` itself, ready for the next upload. On
  error: `await cmsAlert(data.error)`. A `.finally()` resets the Save
  button's label/color regardless of outcome.

## `cms/admin.html`

**What loads**: `auth.js` and an inline `window load` listener
(`fetchCopyrightYear()` only) in `<head>`; then `cms.js`,
`adminTools.js`, `helper.js` after `</head>` (`helper.js` last, wins).

**No automatic API calls on load** — both checks below only run when
their button is clicked.

**User interactions**:
- "Run Check" (Broken Image Check) → `runBrokenImageCheck()`
  (`adminTools.js`, `async`) — disables its button, clears prior
  results, then:
  1. `collectBlogImageCandidates()` loops `ADMIN_BLOG_TYPES = [1, 3, 4,
     5, 99]` and calls **Get all blogs of a given type** once per type
     (5 calls total) — defensively checks `res.ok`/`Array.isArray`
     per call and collects a `fetchErrors` message instead of throwing
     if one comes back malformed (e.g. under DynamoDB throughput
     exhaustion). For every blog: the `img` field is a candidate when
     `hasRealImageFilename()` says it's a real filename (not the
     literal `"none"` sentinel, and not a bare S3 prefix with no
     filename after it — see `DATA_MODEL.md`), plus any `<img src>`
     found inside `postBody` via `DOMParser`.
  2. `collectCardSetImageCandidates()` loops every `blogCat`/`pageName`/
     year combination in `categoryRanges` (`helper.js`, skipping the
     `2004|mcd` lockout-redirect combo) and calls **Get card sets by
     year** once per year — same defensive `fetchErrors` handling. For
     every set: `headerImg + headerImgName` and `footerImg +
     footerImgName` (when present) plus any inline `postBody` images
     are candidates.
  3. Candidates are deduplicated by URL (many sets/posts can share the
     same header image), then `testImageLoads()` loads each distinct
     URL as a real `new Image()` (`onload`/`onerror`, with a 15s
     timeout safety net so one stalled request can't hang the whole
     check) in batches of 8 concurrent.
  4. Renders a table of broken URLs with which page/set/post referenced
     each, plus any `fetchErrors` as a separate non-fatal list.

  This single check makes by far the most total API calls of anything
  on the site — potentially dozens in one run.
- "Run Check" (Checklist Integrity Check) → `runChecklistIntegrityCheck()`
  (`adminTools.js`, `async`) — calls **Search players by name** in its
  `audit=1` mode, then reports `unlinkedSetNames` (every uploaded
  checklist with no matching `Cards` item) or a clean "all linked"
  message.

## `cms/smsAdmin.html`

**What loads**: `auth.js` in `<head>`; `helper.js` then `adminSMS.js`
at the very **end** of `<body>` (not `<head>`, and not `defer`d — the
only CMS page structured this way). No TinyMCE (this tool has no rich
text). **No `#copy` footer element exists on this page at all** —
unlike every other page on the site, `smsAdmin.html` has no copyright
footer, so nothing calls `fetchCopyrightYear()` here either.

**On script load** (top-level code in `adminSMS.js`, running the moment
the script tag is reached — not gated by any load event, since by that
point in `<body>` every element it references already exists):
pre-fills the message textarea with `"Autobus Cycling Club:\n"`,
attaches `sendBtn`'s click handler to `sendBroadcast`, wires
`updateSmsStats()` to the textarea's `input` event and the GSM-Safe
Mode checkbox's `change` event and calls it once immediately to
initialize the counter, and separately wires up the open/close/
drag-and-drop handlers for all three modals (bulk import, help, add
subscriber).

**User interactions**:
- Typing in the message textarea, or toggling GSM-Safe Mode →
  `updateSmsStats()` — if GSM-Safe Mode is checked, first rewrites
  curly quotes/em-dashes/ellipses to plain ASCII via
  `applyGsmSafeMode()`. Checks every character against a hardcoded
  `GSM_7` character set to decide GSM-7 (160 chars/segment, 153/segment
  once multi-segment) vs Unicode (70/67) encoding, computes the segment
  count, and turns the counter red/bold once the message exceeds 160
  characters. Purely client-side, no API call.
- "Send" button → `sendBroadcast(event)` (`async`) — `mode` is `"test"`
  or `"live"` from the Test Mode checkbox. If `mode === "live"`: `await
  cmsConfirm("⚠️ LIVE MODE...")` first, aborting if cancelled — see
  `CLAUDE.md`'s "Testing safety" section for why this path must never
  be triggered outside a deliberate, human-confirmed real send.
  Validates the message is non-blank (`await cmsAlert(...)`). Shows the
  spinner overlay, then calls **Send broadcast** with the Authorization
  header, body `{message, mode}`. On success: renders a per-recipient
  results table (name/phone/status/error) plus a summary row
  (success/failure counts), then resets the textarea back to the
  template and re-fires `updateSmsStats()`. On network error: shows a
  single red error row instead. `finally`: hides the spinner regardless
  of outcome.
- "...bulk import" nav link → opens the bulk-import modal
  (`resetModal()`).
- Selecting/dropping a `.json` file → `handleFile()` — validates the
  extension, reads it as text, `JSON.parse`s it, requires a non-empty
  array; on success enables the Upload button and shows the record
  count (inline modal feedback, not `cmsAlert`).
- "Upload" button (inside the bulk-import modal) → `await
  cmsConfirm("⚠️ This will delete ALL existing subscribers...")` first.
  If confirmed, calls **Bulk import subscribers** with the
  Authorization header, body = the raw parsed JSON array (already in
  DynamoDB typed-JSON format per the modal's own instructions). On
  success: shows `deletedCount`/`importedCount`, swaps the
  Upload/Cancel buttons for a Close button. On error: shows the message
  inline, re-enables Upload.
- "...add subscriber" nav link → opens the add-subscriber modal and
  focuses the name field.
- "Add" button (inside that modal) → validates name and phone are both
  non-blank via **inline feedback** (`showAddSubscriberFeedback()`) —
  this is the one CMS form on the whole site whose validation uses
  neither `cmsAlert()` nor `cmsConfirm()`, since only the two genuinely
  destructive actions on this page (live send, bulk replace) were ever
  converted to `cmsConfirm()`. Calls **Add a single subscriber** with
  the Authorization header, body `{firstName, phoneNumber}`. On
  success: shows a confirmation, swaps Save/Cancel for Close. On error
  (e.g. a 409 duplicate phone number): shows `json.error` inline.
- "...user guide" nav link → opens the help modal — static in-page
  content, no API call.
- Every modal's Cancel/Close button, or a click on its own dark
  backdrop, closes that modal.

**Notable**: all three endpoints this page calls are the **only** three
endpoints on the entire site deployed to the API Gateway `prod` stage —
every other endpoint (25 of them) is on `dev`. See `ARCHITECTURE.md`.
