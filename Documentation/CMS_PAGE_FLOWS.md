# CMS Page Flows

The companion to `PUBLIC_PAGE_FLOWS.md`, covering all 10 pages under
`/cms`. Same idea per page: not just what loads and what each
interaction triggers, but why — what each page is actually there to
accomplish, and for anything that reaches the backend, the full chain
from the JS function through the API endpoint (named exactly as in
`API_ENDPOINTS.md`) down to the Lambda that serves it and the DynamoDB
table it reads or writes. Every page here loads `scripts/auth.js`
first, which gates page access via Cognito before any of the rest of
the page's own logic runs — see `AUTH.md` — that's not repeated per
page below. The old 1592-line `scripts/cms.js` no longer exists — it
was split, moved verbatim with no logic changes, into four files by
concern: `scripts/cmsBlog.js` (blog CRUD), `scripts/cmsCardSet.js`
(card-set CRUD), `scripts/cmsImageBrowser.js` (the shared image-browser
modal used by the two "create" forms), and `scripts/cmsFormUI.js`
(`initTinyEditor()`). Each CMS page's `<script src>` tags were updated
to load whichever of the four it actually needs. `fetchCopyrightYear()`
used to be defined identically in both `cms.js` and `scripts/helper.js`
— that duplicate is gone along with `cms.js`, so `helper.js`'s copy is
now the only implementation anywhere; every page below that calls it
resolves to `helper.js`, with no load-order ambiguity left to call out.

## `cms/wlcms.html` — CMS home

This page's entire job is orientation, not data: it's the landing page
after Cognito login, and exists purely to route the logged-in user to
whichever of the other 9 pages they actually want, via a dropdown nav.
Nothing here needs to know about blogs, card sets, or subscribers.

**What loads**: `auth.js`, `helper.js`.

**On `window load`**: `fetchCopyrightYear()` (`helper.js`).

**No API calls happen on this page at all** — it's a pure navigation
hub, the only CMS page with that property, precisely because its whole
purpose is routing rather than reading or writing any data.

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
  call, since this page's job ends the moment a destination is chosen.

## `cms/createBlogPost.html`

This is the "author a new blog post" form — its flow is: pick an
image (optional), write the body in a rich-text editor, submit. The
image-browsing machinery exists because blog posts store a full S3
image URL rather than a bare filename (see "Notable" below), so
picking an image has to happen through a dedicated browser rather than
a plain text field.

**What loads**: `auth.js` and the TinyMCE CDN script in `<head>`; then,
placed just after `</head>` in this order: `helper.js`, `cmsBlog.js`,
`cmsImageBrowser.js`, `cmsFormUI.js`.

**On `window load`**: `fetchCopyrightYear()` (`helper.js`), then
`initTinyEditor('#postBody')` (`cmsFormUI.js`) — initializes the shared
TinyMCE config (lists/link/image/code/autoresize plugins, 1000px wide,
400-500px auto-resizing height) against the Post Body textarea, so the
rich-text editor is ready before the author starts typing.

**User interactions**:
- "Browse" button next to Image → `openBlogImageBrowser('imgName')`
  (`cmsImageBrowser.js`) — calls `fetchBlogImageList()`, which pulls
  the full contents of the S3 image bucket via **List images in the
  bucket**, fronted by the `cmsImagePicker` Lambda
  (`Lambdas/cmsImagePicker/`, a plain `ListObjectsV2Command` with no
  server-side prefix filter), then filters the result client-side down
  to just the `img/blog/` prefix — the filtering happens in the
  browser rather than the Lambda because the same endpoint/Lambda also
  backs the card-set picker's `img/cards/` filtering, so one shared
  unfiltered list serves both. `renderBlogImageList()` then draws a
  thumbnail grid into `#imageList`. Clicking a thumbnail writes the
  **complete S3 URL** into `#imgName` (not just a filename — see the
  "Notable" note below) and closes the modal.
- Image search box inside the modal (`oninput="filterBlogImageList()"`)
  — correctly wired, reading `_blogImageFiles`/`_blogImageTargetFieldId`,
  the state `openBlogImageBrowser()` actually populated on this page.
  (Fixed 2026-09-02 — this used to call `filterImageList()`, which reads
  `_imageBrowserFiles`/`_imageBrowserTargetFieldId` instead, the **card
  set** picker's state, so typing here filtered against whatever
  empty/stale card-set image list happened to be in memory rather than
  the blog images actually shown.)
- "Upload" button in the modal → `uploadNewImage()`
  (`cmsImageBrowser.js`) exists so an author doesn't have to leave the
  CMS and manually put a file in S3 first — it branches on which
  target-field variable is set (`_imageBrowserTargetFieldId` vs
  `_blogImageTargetFieldId`) to pick the S3 directory; since this page
  only ever calls `openBlogImageBrowser()`, it correctly resolves to
  `img/blog/`. It calls **Get S3 upload URL (presigned PUT)**, fronted
  by the `cmsImageUploader` Lambda (`Lambdas/cmsImageUploader/`, 300s
  presign expiry), then `PUT`s the raw file directly to the returned
  presigned URL — the Lambda itself never touches the file bytes, it
  only hands back a URL the browser can upload straight to S3. On this
  page's branch it then re-runs `fetchBlogImageList()`/
  `renderBlogImageList()` so the new image shows up immediately, and
  sets `#imgName` to the upload response's `finalUrl` (a full URL,
  matching the click-a-thumbnail behavior above).
- Close (`×`) → `closeImageBrowser()` (`cmsImageBrowser.js`).
- "Submit Post" button is the call that actually creates the post →
  `createBlogPost(published, title, imgName, imgCap, author, blogType)`
  (`cmsBlog.js`) — first validates `title` is non-blank (`await
  cmsAlert(...)` + refocus the field if not), then reads the TinyMCE
  body via `tinymce.activeEditor.getContent()` /
  `getContent({format:"text"})` and validates it's non-blank the same
  way, so an empty post can't be submitted. Sets the submit button to
  its "Crossing Fingers..." state, then calls **Create blog post**,
  fronted by the `createBlogPost` Lambda (`Lambdas/createBlogPost/`),
  which writes a new item into the `Blogs` table — it generates the
  `blogID` server-side via `crypto.randomUUID()` and sets `time` (the
  table's actual DynamoDB sort key) to `new Date().toISOString()`, so
  the frontend never has to construct either value itself. On success:
  `await cmsAlert(data.message)`, then redirect to `pickBlog.html` so
  the author lands back on the list they'd pick this post from to edit
  it further. On a non-2xx response: `await cmsAlert(errMsg)`, stays on
  the page with the form intact so nothing typed is lost. On a
  malformed JSON response: `await cmsAlert("Unexpected server
  response.")`.

**Notable**: `#imgName` defaults to the literal string `"none"` in the
HTML (the sentinel `displayBlog()` checks for to skip rendering an
image on the live site) — see `DATA_MODEL.md`'s `Blogs.img` note. Blog
posts store the full image URL (unlike card sets, which store a bare
filename plus a separately-tracked prefix) because a blog post's image
can in principle live anywhere, while a card set's header/footer images
always live under a predictable `img/cards/` path that `wax.js` builds
at render time.

## `cms/createCardSet.html`

The card-set equivalent of `createBlogPost.html` — same overall shape
(pick images, write the review body, submit), but for a card set review
rather than a blog post, with more fields (star rating, manufacturer,
SEO fields, etc.) since a card set review carries more structured
metadata than a blog post does.

**What loads**: `auth.js` and the TinyMCE CDN script in `<head>`; then,
placed just after `</head>` in this order: `cmsCardSet.js`,
`cmsImageBrowser.js`, `cmsFormUI.js`, `wax.js`, `helper.js`. `wax.js`
doesn't appear to back anything this page actually calls — none of its
functions (`fetchCardSetsByYear`, `displayCardSet`, `castVote`, the
checklist modal functions) are referenced anywhere in this page's
markup or inline scripts; it's loaded here for no apparent reason.

**On `window load`**: `fetchCopyrightYear()`, then
`initTinyEditor('#postBody')` — same as `createBlogPost.html`, same
reasoning (get the rich-text editor ready before the author starts
typing).

**User interactions**:
- "Browse" buttons next to Header/Footer Image Name →
  `openImageBrowser('headerImgName')` / `openImageBrowser('footerImgName')`
  (`cmsImageBrowser.js`) — calls `fetchImageList()`, the same **List
  images in the bucket** call (same `cmsImagePicker` Lambda) as the
  blog picker uses, filtered client-side to the `img/cards/` prefix
  this time. `renderImageList()` draws the thumbnail grid. Clicking a
  thumbnail writes just the bare **filename** into the target field —
  not a full URL, since the `Cards` table stores the S3 prefix
  separately and `wax.js`'s `displayCardSet()` concatenates the two at
  render time on the live site (see `createBlogPost.html`'s "Notable"
  note above for why this differs from the blog form).
- Image search box (`oninput="filterImageList()"`) — correctly wired
  on this page, since `openImageBrowser()` is what actually populated
  the state `filterImageList()` reads.
- "Upload" button → `uploadNewImage()` (`cmsImageBrowser.js`) — same
  function and same `cmsImageUploader` Lambda as `createBlogPost.html`'s
  upload; here `_imageBrowserTargetFieldId` is the one set, so it
  resolves to `img/cards/`, re-runs `fetchImageList()`/
  `renderImageList()`, and sets the target field to the bare `fileName`
  (not `finalUrl`) on success, matching the filename-only convention
  above.
- Close (`×`) → `closeImageBrowser()` (`cmsImageBrowser.js`).
- "Submit Post" button → `createCardSet(blogStatus, seoPageTitle,
  seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets,
  stars, formats, year, headerImgName, footerImgName, mfg, blogCat)`
  (`cmsCardSet.js`) — three separate validation checks, each its own
  `await cmsAlert(...)` + refocus + early return: `setName` non-blank,
  `year` non-blank, then the TinyMCE body non-blank, so the two fields
  that form the table's actual key (`setName`+`year`) can never be
  submitted empty. Sets the submit button's "Crossing Fingers..."
  state, then calls **Create card set**, fronted by the
  `createCardPost` Lambda (`Lambdas/createCardPost/` — note the AWS
  function name doesn't match the frontend's `createCardSet()` caller
  name), which writes a new item into the `Cards` table and generates
  `setID` via `Math.random().toString(36)` (not a UUID) server-side.
  The Lambda also hardcodes the S3 image URL prefix for `headerImg`/
  `footerImg` — worth knowing if image hosting ever moves off direct S3
  URLs. Same success/error/malformed-JSON handling pattern as
  `createBlogPost()`, redirecting to `pickCardSet.html` on success;
  additionally has its own network-error `.catch()` showing `await
  cmsAlert("Network error creating the card set.")` (not present on
  `createBlogPost()`'s equivalent chain).

## `cms/pickBlog.html`

This page's job is simply to let an editor find the blog post they
want to edit, split into two independent lists — live and staged —
since a live post and a staged draft need separate management (a staged
post isn't visible on the public site yet, so it's worth keeping the
two visually and functionally separate rather than one merged list).

**What loads**: `auth.js`, `cmsBlog.js`, `helper.js` (in that order, in
`<head>`). Two separate inline `<script>` blocks each register their
own `window load` listener (rather than one combined listener) — both
fire, in the order they were attached.

**On `window load`** (first listener): `getBlogsForUpdate()` (`cmsBlog.js`)
pulls the live-post list — calls **Get all live blogs (for the edit
picker)**, fronted by the `listBlogsForUpdate` Lambda
(`Lambdas/listBlogsForUpdate/` — note the AWS function name doesn't
match the frontend's `getBlogsForUpdate()` caller name), which does a
full unfiltered `Scan` of `Blogs` where `published = true`, with the
Cognito `Authorization` header. Once the result is back, it's grouped
by `blogType` (via `BLOG_TYPE_LABELS`), inserting an `<h2>` divider
each time the type changes so an editor can visually scan by category,
and calls `displayBlogs(title, blogID, blogType)` per entry — each one
a link to `blogEdit.html?blogID=<id>&blogType=<type>` — into
`#listBlogsDiv`. An empty result shows a message in `#noBlogsDiv`
instead. `fetchCopyrightYear()` also runs in this same listener.

**On `window load`** (second listener): `getStagedBlogsForUpdate()`
(`cmsBlog.js`) pulls the parallel staged-draft list — calls **Get all
staged (draft) blogs**, fronted by the `getStagedBlogsForUpdate` Lambda
(`Lambdas/getStagedBlogsForUpdate/`), the same kind of full `Scan` of
`Blogs` but filtered to `published = false` instead. Same
grouping/display shape as the live list above, inserting an `<h2>`
divider (matching the live list — a prior `<h3>` inconsistency here was
corrected during the 2026-09 CMS HTML cleanup pass) into
`#listStagedBlogsDiv`, empty case falling back to `#noStagedBlogsDiv`.

**User interactions**: none beyond the plain `blogEdit.html?...` links
built by `displayBlogs()`/`displayStagedBlogs()` — this page exists
purely to get an editor to the right edit form, nothing more.

## `cms/pickCardSet.html`

The card-set equivalent of `pickBlog.html` — same live/staged split,
same reasoning (a staged set isn't public yet, so it's kept visually
separate).

**What loads**: `auth.js`, `cmsCardSet.js`, `helper.js` (in that order,
in `<head>`). Two separate inline `window load` listeners again —
this time `fetchCopyrightYear()` is grouped into the **second**
listener (alongside the staged-sets fetch), the opposite grouping from
`pickBlog.html`, where it's in the first.

**On `window load`** (first listener): `fetchAllCardSets()`
(`cmsCardSet.js`, `async`) pulls the live-set list — calls **Get all
live card sets (for the edit picker)**, fronted by the `getCardSets`
Lambda (`Lambdas/getCardSets/`), which queries the
`blogStatus-year-index` GSI filtered to `blogStatus = "OK"`, with no
projection (full items, not just the fields the picker needs). It
tolerantly unwraps whichever response shape comes back (raw array /
`data.body` as a JSON string / `data.body` as an array / `data.Items`)
— defensive coding against this Lambda's response shape having drifted
over time — then sorts by `blogCat` then `year`, groups with an `<h2>`
divider via `CARDSET_CATEGORY_LABELS`, and calls
`displayCardSets(container, setID, setName)` per entry — a link to
`setEdit.html?setID=<id>` — into `#editBlogsDiv`. Empty result →
`#noBlogsDiv`.

**On `window load`** (second listener): `fetchAllStagedCardSets()`
(`cmsCardSet.js`, `async`) + `fetchCopyrightYear()` (`helper.js`). The
staged fetch calls **Get all staged (draft) card sets**, fronted by the
`getStagedCardSets` Lambda (`Lambdas/getStagedCardSets/` — same GSI as
the live-set Lambda, filtered to `blogStatus = "staged"` instead), same
tolerant unwrap as above, then applies a defensive fallback — any
staged item with a `mfg` value but no `blogCat` (a record predating
that field, or created directly in DynamoDB) is treated as
`blogCat: "reg"` before sorting/grouping the same way as the live list,
via `displayStagedCardSets(setID, setName)` into `#stagedBlogsDiv`.
Empty result → `#noStagedBlogsDiv`.

**User interactions**: none beyond the plain `setEdit.html?...` links —
same "get the editor to the right form" purpose as `pickBlog.html`.

## `cms/blogEdit.html`

Where an existing blog post actually gets edited or deleted — the
flow is: load the post's current data into the form, let the editor
change it, then either save or delete.

**What loads**: `auth.js` and the TinyMCE CDN script, plus (in that
order) `helper.js`, `cmsBlog.js`, `cmsFormUI.js`, all inside `<head>`.
The `blogID`/`blogType` query-param extraction and the `window load`
listener live together in a separate inline `<script>` block right
after `</head>`.

**On `window load`**: `fetchBlogByID(blogID, blogType)` (`cmsBlog.js`)
loads the specific post being edited — calls **Get a single blog by
ID**, fronted by the `getBlogByID` Lambda (`Lambdas/getBlogByID/`),
which does a `Query` on `blogType` (the table's partition key) plus a
`FilterExpression` on `blogID` to narrow to the one post, with the
Authorization header. If `data.item` is missing, shows "Blog not
found." in `#errorDiv` and stops; otherwise calls `populateBlog(blog)`
(internal to `cmsBlog.js`), which sets the TinyMCE content via
`tinymce.get("postBody").setContent(blog.postBody)`, rebuilds the
Published `<select>`'s two `<option>`s with whichever is currently true
marked `selected`, and fills `title`/`imgName`/`imgCap`/`blogType`
(disabled)/`time` (disabled) directly, so the form shows exactly the
post's current saved state before the editor changes anything. Also
runs `fetchCopyrightYear()` (`helper.js`) and `initTinyEditor('#postBody')`
(`cmsFormUI.js`) in the same listener.

**User interactions**:
- "Update Post" button → `updateBlogPost(title, imgName, imgCap,
  published, blogType, time, blogID)` (`cmsBlog.js`) — **no
  client-side required-field validation at all** (unlike the create
  form for the same content type) — it proceeds straight to
  submitting, since the form was pre-populated from an existing valid
  record rather than started blank. Sets the submit button's "Crossing
  Fingers..." state, reads the TinyMCE content via
  `tinymce.get("postBody").getContent()` (a different accessor than
  `createBlogPost()`'s `tinymce.activeEditor.getContent()` —
  functionally equivalent here since there's only one editor instance
  on the page, but a real inconsistency in how the two forms reach it),
  normalizes `published` to a real boolean and `blogType` to a
  `Number`, then calls **Update blog post**, fronted by the
  `updateBlogPost` Lambda (`Lambdas/updateBlogPost/`), which does a
  plain `UpdateCommand` against the `Blogs` table keyed on `blogType`+
  `time` (the table's actual partition/sort key pair). On success:
  `await cmsAlert(data.message)` then redirect to `pickBlog.html`; on
  error: `await cmsAlert(...)`, stays on the page; on malformed JSON:
  `await cmsAlert("Unexpected server response.")`.
- "Delete Post" button → `deleteBlogPost(blogID, blogType, time)`
  (`cmsBlog.js`) — `await cmsConfirm("Delete this blog post? This
  cannot be undone.")` first, since this is destructive and
  irreversible; if cancelled, nothing else happens. If confirmed, calls
  **Delete blog post**, fronted by the `deleteBlogHandler` Lambda
  (`Lambdas/deleteBlogHandler/`), which deletes the `Blogs` item keyed
  on `blogType`+`time`, guarded by a `ConditionExpression` requiring
  `blogID` to also match — a safety check against deleting the wrong
  item if the key pair were ever ambiguous. With the Authorization
  header. On success: `await cmsAlert(result.message)` then redirect to
  `pickBlog.html`; on error: `await cmsAlert("Error deleting blog.")`.

**Notable**: the Preview button is present in the HTML but commented
out (`<!-- ... onclick="openPreview()" ... -->`) — unlike
`setEdit.html`, this page has no working live preview.

## `cms/setEdit.html`

The card-set equivalent of `blogEdit.html` — load the set's current
data, let the editor change it, save/delete — plus a client-side
Preview feature blog posts don't have (see below).

**What loads**: `auth.js` and the TinyMCE CDN script in `<head>`; then
`cmsCardSet.js`, `cmsFormUI.js`, `wax.js`, `helper.js` (in that order,
all in `<head>`). The `setID` extraction and `window load` listener
are together in that same `<head>` block, after those script tags
(unlike `blogEdit.html`'s equivalent block, which sits after
`</head>`).

**On `window load`**: `fetchCardSetByID(setID)` (`cmsCardSet.js`) loads
the specific set being edited — calls **Get a single card set by ID**,
fronted by the `getCardSetByID` Lambda (`Lambdas/getCardSetByID/`),
which does a PartiQL `SELECT * FROM Cards WHERE setID=?` against the
`Cards` table, tolerantly unwraps the response the same way
`fetchAllCardSets()` does, and takes `items[0]`. Empty result shows
"these aren't the Droids you're looking for..." in `#errorDiv`;
otherwise calls `populateCardSet(...)` (15 positional args, internal to
`cmsCardSet.js`), which sets the TinyMCE body via
`tinymce.activeEditor.selection.setContent(postBody)` — note this is
yet a **third** distinct way this codebase inserts content into
TinyMCE (`createCardSet.html`/`createBlogPost.html` never need to since
they start blank; `blogEdit.html` uses `tinymce.get("postBody").setContent()`)
— rebuilds the `blogStatus` `<select>`'s options with the correct one
marked `selected`, and fills every other field directly (`setName` and
`year` are populated but `disabled`/`readonly` in the HTML, since
they're the table's actual key and changing them here would mean
editing the wrong item or orphaning the current one). Also runs
`fetchCopyrightYear()` (`helper.js`) and `initTinyEditor('#postBody')`
(`cmsFormUI.js`).

**User interactions**:
- "Browse" buttons (Header/Footer Image Name) → same
  `openImageBrowser()`/`fetchImageList()`/`renderImageList()`/
  `uploadNewImage()` flow, same `cmsImagePicker`/`cmsImageUploader`
  Lambdas, as `createCardSet.html` (`cmsImageBrowser.js`), writing a
  bare filename into the target field.
- "Update Post" button → `updateCardSet(blogStatus, seoPageTitle,
  seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets,
  stars, formats, year, headerImgName, footerImgName, mfg)`
  (`cmsCardSet.js`) — no client-side validation, same reasoning as
  `updateBlogPost()` (pre-populated from a valid record). Sets the
  submit button state, reads `tinymce.activeEditor.getContent()`, then
  calls **Update card set**, fronted by the `updateCardSet` Lambda
  (`Lambdas/updateCardSet/`) — this Lambda's response shape isn't
  reliable (plain string / `{message}` / `{body}`, itself either a JSON
  string or plain text), so the handler tolerantly unwraps all of them
  into a single `message`, defaulting to `"Update complete."` **only**
  when `response.ok` is actually true (an unrecognized shape on a
  genuine failure never gets shown as a false success). `await
  cmsAlert(message)` always runs; the redirect to `pickCardSet.html`
  only fires when `response.ok`.
- "Preview" button exists so an editor can see roughly how the review
  will look on the live site before actually saving it →
  `openPreview()` (`cmsCardSet.js`) — reads the current (possibly
  unsaved) form field values plus `tinymce.get("postBody").getContent()`,
  and calls `renderPreview(...)` (internal to `cmsCardSet.js`), which
  builds the same kind of set-details table `displayCardSet()` renders
  on the live site, into `#previewContainer`, then shows
  `#previewModal`. **Purely client-side — no API call**, since the
  whole point is previewing changes that haven't been saved yet. Two
  things make this not a perfect mirror of the real page: it hardcodes
  the S3 `img/cards/` URL prefix directly rather than reading the
  record's actual `headerImg`/`footerImg` prefix fields, and it always
  uses `rowspan="7"` on the header image cell — it never renders a
  Checklist row, unlike the live `displayCardSet()`, which bumps that
  to `8` when `hasChecklist` is true.
- Close preview (`×`) → `closePreview()` (`cmsCardSet.js`) — hides the
  modal and clears `#previewContainer`.
- "Delete Set" button → `deleteCardSet(setID, setName, year)`
  (`cmsCardSet.js`) — `await cmsConfirm("Delete this card set? This
  cannot be undone.")` first. If confirmed, calls **Delete card set**,
  fronted by the `deleteCardSetHandler` Lambda
  (`Lambdas/deleteCardSetHandler/`), which deletes the `Cards` item
  keyed on `setName`+`year`, guarded by a `ConditionExpression`
  requiring `setID` to also match, same safety-check pattern as
  `deleteBlogPost()`. On success: `await cmsAlert(result.message)` then
  redirect to `pickCardSet.html`; on error: `await
  cmsAlert("Error deleting card set.")`.

## `cms/uploadChecklist.html`

This page's whole job is turning a checklist PDF into structured
`Checklists` table rows an editor can trust — parse the PDF, let the
editor review/correct every row by hand (since PDF text extraction is
never perfectly reliable), then save.

**What loads**: `auth.js` and an inline `window load` listener
(`fetchCopyrightYear()` only) in `<head>`; then `checklistUpload.js`,
`helper.js` after `</head>`, in that order.

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
- "Parse" button is the call that turns the raw PDF into editable rows
  → `parseChecklistPdf(file, {...})` — reads the file as base64 via
  `FileReader` (`readFileAsBase64()`, stripping the
  `data:...;base64,` prefix), then calls **Parse a checklist PDF**,
  fronted by the `parseChecklistPdf` Lambda
  (`Lambdas/parseChecklistPdf/`, the one Lambda in this repo needing a
  real `pdf-parse` dependency, hence the .zip deploy treatment — see
  `LAMBDA_FUNCTIONS.md`), with the Authorization header. This Lambda
  **never writes to DynamoDB itself** — it's purely parse-and-return,
  which is exactly why the review step below exists: a bad parse can
  be corrected in the browser before anything is actually saved. On
  success: fills `#checklistSetName`/`#checklistInsertSetName` from the
  response, calls `renderChecklistTable(cards)` — which builds one
  editable `<tr>` per card via `buildChecklistRow()` (Card #/Player
  Name/Notes text inputs plus a per-row delete button, each value
  escaped via this file's own narrower `escapeAttr()`, not the shared
  `escapeHtml()` in `helper.js` — see `FRONTEND.md`) — shows
  `#checklistReviewSection`, sets a status message (mentioning the
  `skippedDuplicates` count when non-zero), and closes the modal. On
  error: shows the error as inline modal feedback instead of closing
  it.
- "+ Add Row" button → `addChecklistRow()` — appends one more blank
  editable row, for a card the PDF parser missed entirely.
- Per-row delete (`×`) button → removes that `<tr>` directly from the
  DOM — no confirmation, no API call, since nothing has been saved yet
  at this point; deleting a row here is just discarding a mistaken
  parse result, not destroying real data.
- "Save to DynamoDB" button is the call that actually commits the
  reviewed checklist → `saveChecklist()` (`async`) — three sequential
  validations, each `await cmsAlert(...)` + early return: Set Name
  non-blank, `collectChecklistRows()` yields at least one row, every
  collected row has both a Card # and a Player Name. Sets the Save
  button to a "Saving..." state, then calls **Save a reviewed
  checklist**, fronted by the `saveChecklist` Lambda
  (`Lambdas/saveChecklist/`), with the Authorization header, body
  `{setName, insertSetName, cards}`. This Lambda uses full-replace
  semantics scoped to the exact group being saved (main set, or one
  specific insert set) — it deletes every existing `Checklists` item in
  that group before writing the new set, so re-uploading a corrected
  PDF for the same set cleanly replaces the old data rather than
  merging with it. It also flips `hasChecklist: true` on the matching
  `Cards` item — see `DATA_MODEL.md` — which is what makes the
  "Checklist" link appear on `waxReviews.html` for this set. On
  success: `await cmsAlert(data.message)` (which may carry a
  `Warning:` suffix if the checklist saved but its `Cards`-linking step
  failed — see `LAMBDA_FUNCTIONS.md`'s `saveChecklist` entry, meaning
  the checklist data is safely stored but won't show a link on the
  live site yet) then a full-reload redirect back to
  `cms/uploadChecklist.html` itself, ready for the next upload. On
  error: `await cmsAlert(data.error)`. A `.finally()` resets the Save
  button's label/color regardless of outcome.

## `cms/admin.html`

A growing collection of self-service, on-demand site-health checks —
distinct from every other CMS page in that nothing here runs
automatically on load; each check only runs when its own button is
clicked, since both are relatively expensive (see below) and there's
no value in running them on every page visit.

**What loads**: `auth.js` and an inline `window load` listener
(`fetchCopyrightYear()` only) in `<head>`; then `cmsBlog.js`,
`adminTools.js`, `helper.js` after `</head>`, in that order. Notably,
`admin.html` itself never calls anything in `cmsBlog.js` directly — it's
loaded because `adminTools.js` internally references the global
`BLOG_TYPE_LABELS` constant, which used to arrive for free via the old
`cms.js` and now lives in `cmsBlog.js`. A non-obvious cross-file
dependency, not a direct function call from this page.

**No automatic API calls on load** — both checks below only run when
their button is clicked.

**User interactions**:
- "Run Check" (Broken Image Check) exists to catch images that 404 on
  the live site (a deleted/moved S3 object, a typo'd filename) before a
  visitor stumbles onto one → `runBrokenImageCheck()`
  (`adminTools.js`, `async`) — disables its button, clears prior
  results, then:
  1. `collectBlogImageCandidates()` loops `ADMIN_BLOG_TYPES = [1, 3, 4,
     5, 99]` and calls **Get all blogs of a given type** once per type
     (5 calls total, same `getBlogs` Lambda `PUBLIC_PAGE_FLOWS.md`
     traces for the public blog pages) — defensively checks
     `res.ok`/`Array.isArray` per call and collects a `fetchErrors`
     message instead of throwing if one comes back malformed (e.g.
     under DynamoDB throughput exhaustion). For every blog: the `img`
     field is a candidate when `hasRealImageFilename()` says it's a
     real filename (not the literal `"none"` sentinel, and not a bare
     S3 prefix with no filename after it — see `DATA_MODEL.md`), plus
     any `<img src>` found inside `postBody` via `DOMParser`.
  2. `collectCardSetImageCandidates()` loops every `blogCat`/`pageName`/
     year combination in `categoryRanges` (`helper.js`, skipping the
     `2004|mcd` lockout-redirect combo) and calls **Get card sets by
     year** once per year (the same `getCardSetsByYear` Lambda
     `PUBLIC_PAGE_FLOWS.md` traces for `waxReviews.html`) — same
     defensive `fetchErrors` handling. For every set: `headerImg +
     headerImgName` and `footerImg + footerImgName` (when present) plus
     any inline `postBody` images are candidates.
  3. Candidates are deduplicated by URL (many sets/posts can share the
     same header image, so this avoids re-checking the same URL many
     times), then `testImageLoads()` loads each distinct URL as a real
     `new Image()` (`onload`/`onerror`, with a 15s timeout safety net
     so one stalled request can't hang the whole check) in batches of 8
     concurrent.
  4. Renders a table of broken URLs with which page/set/post referenced
     each, plus any `fetchErrors` as a separate non-fatal list.

  This single check makes by far the most total API calls of anything
  on the site — potentially dozens in one run, which is exactly why
  it's gated behind a manual button rather than running automatically.
- "Run Check" (Checklist Integrity Check) exists to catch checklists
  uploaded under a `setName` that doesn't exactly match any real
  `Cards` review — a typo at upload time silently breaks the
  `waxReviews.html` "Checklist" link with no obvious symptom otherwise
  → `runChecklistIntegrityCheck()` (`adminTools.js`, `async`) — calls
  **Search players by name** in its `audit=1` mode (the same
  `searchPlayerName` Lambda `PUBLIC_PAGE_FLOWS.md` traces for
  `playerSearch.html`, repurposed here for a data-integrity check
  rather than an actual name search), then reports `unlinkedSetNames`
  (every uploaded checklist with no matching `Cards` item) or a clean
  "all linked" message.

## `cms/smsAdmin.html`

The "Autobus Messaging Platform" — a completely separate tool from the
cardStack CMS above, for broadcasting SMS messages to a cycling club's
subscriber list via Twilio. Its flow is: compose a message (with
live character/segment stats, since SMS billing is per-segment),
optionally manage the subscriber list, then send.

**What loads**: `auth.js` in `<head>`; `helper.js` then `adminSMS.js`
in `<head>` (relocated from the end of `<body>` during the 2026-09 CMS
HTML cleanup pass — `adminSMS.js`'s own top-level code is now wrapped
in a `window load` listener specifically so this relocation didn't
break it; see `FRONTEND.md`). No TinyMCE (this tool has no rich text —
an SMS message is plain text by definition). **No `#copy` footer
element exists on this page at all** — unlike every other page on the
site, `smsAdmin.html` has no copyright footer, so nothing calls
`fetchCopyrightYear()` here either.

**On `window load`** (top-level code in `adminSMS.js`, now deferred to
this event rather than running the instant the script tag is reached):
pre-fills the message textarea with `"Autobus Cycling Club:\n"`,
attaches `sendBtn`'s click handler to `sendBroadcast`, wires
`updateSmsStats()` to the textarea's `input` event and the GSM-Safe
Mode checkbox's `change` event and calls it once immediately to
initialize the counter, and separately wires up the open/close/
drag-and-drop handlers for all three modals (bulk import, help, add
subscriber) — all of this setup work has to happen after the DOM
exists, which is exactly why it's gated behind `window load` rather
than running as bare top-level code.

**User interactions**:
- Typing in the message textarea, or toggling GSM-Safe Mode →
  `updateSmsStats()` exists because SMS billing is per-segment and the
  segment size depends on the character encoding, so an editor needs
  to see the cost implication of what they're typing in real time —
  if GSM-Safe Mode is checked, first rewrites curly quotes/em-dashes/
  ellipses to plain ASCII via `applyGsmSafeMode()` (since those
  characters force the more expensive Unicode encoding). Checks every
  character against a hardcoded `GSM_7` character set to decide GSM-7
  (160 chars/segment, 153/segment once multi-segment) vs Unicode
  (70/67) encoding, computes the segment count, and turns the counter
  red/bold once the message exceeds 160 characters as a visual warning
  that it's about to split into multiple (separately billed) segments.
  Purely client-side, no API call.
- "Send" button is the actual broadcast trigger →
  `sendBroadcast(event)` (`async`) — `mode` is `"test"` or `"live"`
  from the Test Mode checkbox. If `mode === "live"`: `await
  cmsConfirm("⚠️ LIVE MODE...")` first, aborting if cancelled — see
  `CLAUDE.md`'s "Testing safety" section for why this confirmation path
  must never be triggered outside a deliberate, human-confirmed real
  send. Validates the message is non-blank (`await cmsAlert(...)`).
  Shows the spinner overlay, then calls **Send broadcast**, fronted by
  the `sendAlertHandler` Lambda (`Lambdas/sendAlertHandler/`), with the
  Authorization header, body `{message, mode}`. Per that Lambda's own
  logic (documented on Confluence's pre-repo "AMP SMS - Platform Core"
  page): `mode: "live"` scans the real `Subscribers` table, `mode:
  "test"` scans the separate `SubscribersTest` table instead, and
  either way only records with `status = "subscribed"` are messaged —
  sends are sequential (one SMS at a time via Twilio, not parallel),
  each wrapped in its own try/catch, so one recipient's failure doesn't
  abort the rest of the broadcast. On success: renders a per-recipient
  results table (name/phone/status/error) plus a summary row
  (success/failure counts), then resets the textarea back to the
  template and re-fires `updateSmsStats()`. On network error: shows a
  single red error row instead. `finally`: hides the spinner regardless
  of outcome.
- "...bulk import" nav link → opens the bulk-import modal
  (`resetModal()`) — this exists for the once-a-year task of loading a
  fresh subscriber list from the club's sign-up data (see
  `CMS_GUIDE.md`'s bulk-import prep process).
- Selecting/dropping a `.json` file → `handleFile()` — validates the
  extension, reads it as text, `JSON.parse`s it, requires a non-empty
  array; on success enables the Upload button and shows the record
  count (inline modal feedback, not `cmsAlert`).
- "Upload" button (inside the bulk-import modal) → `await
  cmsConfirm("⚠️ This will delete ALL existing subscribers...")` first,
  since this is a full-replace operation, not an additive import. If
  confirmed, calls **Bulk import subscribers**, fronted by the
  `bulkSubscriberUpload` Lambda (`Lambdas/bulkSubscriberUpload/`),
  with the Authorization header, body = the raw parsed JSON array
  (already in DynamoDB typed-JSON format per the modal's own
  instructions). Which table it truncates and reimports into is set
  via the Lambda's `TABLE_NAME` environment variable rather than
  hardcoded in its source — worth checking the Console if it's ever
  unclear whether a bulk import will hit `Subscribers` or
  `SubscribersTest`. On success: shows `deletedCount`/`importedCount`,
  swaps the Upload/Cancel buttons for a Close button. On error: shows
  the message inline, re-enables Upload.
- "...add subscriber" nav link → opens the add-subscriber modal and
  focuses the name field — this exists for adding one person
  mid-season, without needing a full bulk-import re-run.
- "Add" button (inside that modal) → validates name and phone are both
  non-blank via **inline feedback** (`showAddSubscriberFeedback()`) —
  this is the one CMS form on the whole site whose validation uses
  neither `cmsAlert()` nor `cmsConfirm()`, since only the two genuinely
  destructive actions on this page (live send, bulk replace) were ever
  converted to `cmsConfirm()`. Calls **Add a single subscriber**,
  fronted by the `subscribeHandler` Lambda
  (`Lambdas/subscribeHandler/`), with the Authorization header, body
  `{firstName, phoneNumber}`. The Lambda normalizes several common
  phone formats (bare 10-digit, 11-digit with leading `1`,
  already-E.164, human-formatted) to E.164 server-side, so the editor
  doesn't have to type a specific format, and rejects an unparseable
  number with `400`; it also uses `ConditionExpression:
  attribute_not_exists(phoneNumber)` to reject a duplicate with `409`
  rather than silently overwriting an existing subscriber. On success:
  shows a confirmation, swaps Save/Cancel for Close. On error (e.g.
  that 409 duplicate case): shows `json.error` inline.
- "...user guide" nav link → opens the help modal — static in-page
  content, no API call.
- Every modal's Cancel/Close button, or a click on its own dark
  backdrop, closes that modal.

**Notable**: all three endpoints this page calls are the **only** three
endpoints on the entire site deployed to the API Gateway `prod` stage —
every other endpoint (22 of them) is on `dev`. See `ARCHITECTURE.md`.
