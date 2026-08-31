# CMS Guide

There are two separate authoring tools under `/cms`, both gated by
Cognito login (see `AUTH.md`): **cardStack** (blog posts + card set
reviews) and the **Autobus Messaging Platform** (SMS broadcast tool,
unrelated to blog content, for a cycling club).

Both tools' pages (including `wlcms.html`'s nav menu and
`smsAdmin.html`'s two-column form/results layout) now have mobile
support via the site's shared `@media (max-width: 600px)` breakpoint —
see `FRONTEND.md`'s "Mobile / responsive design" section for the
gotchas encountered doing that pass (missing viewport meta tags, a
descendant-selector CSS trap, table display-role quirks) before
changing layout CSS on these pages.

## cardStack — blog & card set authoring

Entry point: `cms/wlcms.html` — its centered nav is grouped into three
dropdown/flyout menus (Cards, Blogs, Admin) plus a plain Exit link,
rather than one flat row of links. Each opens two ways, independently:
a small inline script scoped to `#wlcms-top-nav` toggles an `open`
class on click (this is what drives it on touch, where hover isn't
meaningful), and a `@media (hover: hover) and (pointer: fine)` CSS
rule opens it on mouse hover on desktop/trackpad. On mobile each
dropdown becomes an inline accordion instead of a floating flyout (no
room to sit beside its parent at that width). Grouped page links:

| Page | Purpose |
|---|---|
| `cms/createBlogPost.html` | Author a brand-new blog post. |
| `cms/createCardSet.html` | Author a brand-new card set review. |
| `cms/pickBlog.html` | Lists all blogs (split into "live" and "staged" columns) — click one to edit it. |
| `cms/pickCardSet.html` | Same, for card sets. |
| `cms/blogEdit.html` | Edit form for a single blog post, reached via `?blogID=&blogType=`. |
| `cms/setEdit.html` | Edit form for a single card set, reached via `?setID=`. |
| `cms/uploadChecklist.html` | Upload a card set checklist PDF, review/correct the parsed result, save to the `Checklists` table — see "Checklist upload" below. |
| `cms/admin.html` | Self-service site-health checks (broken images, checklist-to-review linkage) — see "Admin Tools" below. |

All create/edit forms use a hosted **TinyMCE** WYSIWYG editor
(`initTinyEditor()` in `scripts/cms.js`) for the body text — the
frontend never reads a plain `<textarea>` value for the post body, it
always pulls fresh HTML out of the active TinyMCE instance at submit
time.

### Draft / publish workflow

- Blog posts: `published` = `true` (live) / `false` (staging), chosen from a dropdown.
- Card sets: `blogStatus` = `"OK"` (live) / `"staged"` (draft), chosen from a dropdown.

`pickBlog.html` and `pickCardSet.html` both show live and staged items
side-by-side in two columns, grouped under headers by blog type /
card set category (`BLOG_TYPE_LABELS`, `CARDSET_CATEGORY_LABELS` in
`scripts/cms.js`). `fetchAllStagedCardSets()` also falls back to
`blogCat = "reg"` when a staged card set has a `mfg` value but no
`blogCat` — a defensive guard against records ever created directly in
DynamoDB rather than through `createCardSet.html`'s form (which always
sets `blogCat`); see `API_ENDPOINTS.md`'s "Get all staged (draft) card
sets" entry for the 2026-08-14 Lambda projection bug this was layered
on top of.

### Required-field validation

Every "Submit"/"Update"/"Delete" button on these forms is
`type="button"` with an `onclick` handler that reads field `.value`s
directly and calls a `scripts/cms.js` function — none of them are
`type="submit"` inside a real form-submission flow. That means the
`required` HTML attribute on a field (and the `<sup>*</sup>` marker
next to its label, styled red/bold via the `label sup` CSS rule) is
purely **visual** — the browser's native required-field validation
never actually fires on click. Each `create*()` function in
`scripts/cms.js` re-implements that check by hand (blank/whitespace
check + `cmsAlert()` (see "CMS alert modal" below) + `.focus()` back to
the offending field, or `tinymce.activeEditor.focus()` for the
TinyMCE-backed body fields) —
if you add a new required field to a create form, you must add a
matching guard in its JS handler too, or a blank submission will sail
straight through to the Lambda (this is exactly what caused a 500 on
`createCardSet.html` before `setName` got a guard — see
`API_ENDPOINTS.md`'s "Create card set" entry).

### CMS alert modal

Every validation/success/error message across the CMS (`cms.js`,
`checklistUpload.js`, `adminSMS.js`) goes through `cmsAlert(message)`
(`scripts/helper.js` — kept there rather than its own file, in line
with the site owner's preference to grow `helper.js` for this kind of
shared utility instead of adding a new `<script>` tag every CMS page
has to remember to load) rather than the native browser `alert()` — a
styled modal matching the public checklist modal's look (masthead-blue
header, white box, box-shadow overlay), added since a native `alert()`
looks out of place against the rest of the CMS's styling.

- **Async, not blocking**: native `alert()` blocks all JS execution
  until dismissed, which every call site relied on for "show a
  message, then redirect/focus" ordering. No JS API can block like
  that outside `alert()` itself, so `cmsAlert()` instead returns a
  Promise that resolves on dismiss — every call site now does
  `await cmsAlert(...)` (making its enclosing function/callback
  `async` where it wasn't already) to get the same effective ordering:
  a redirect or `.focus()` call after the `await` only runs once the
  modal is actually dismissed, exactly like the code read before.
- **Dismiss**: clicking OK, clicking the dark backdrop, or pressing
  Escape/Enter all resolve the same way.
- **Lazily injected**: the modal's markup doesn't live in any page's
  HTML — `cmsAlert()` creates and appends it to `document.body` on its
  first call (checking `#cmsAlertOverlay` first so a second call reuses
  the same element rather than injecting a duplicate). Adding it to a
  new CMS page is just making sure `<script src="/scripts/helper.js">`
  is loaded, same as any other `helper.js` function.
- **Deliberately doesn't cover `confirm()`**: the four destructive
  delete/live-mode confirmations (see "Delete" below and the AMP SMS
  pages) still use the native browser `confirm()` dialog — restructuring
  every delete handler to await an async confirm would be a bigger
  change for a case where native browser chrome's heavier, OS-level
  framing arguably suits a "you are about to do something irreversible"
  moment better anyway.

### Delete

`blogEdit.html` and `setEdit.html` each have a red "Delete Post"/"Delete
Set" button, right-justified next to the Update button, added
2026-08-14. Both confirm with a JS `confirm()` dialog first (no
soft-delete/undo — this is a real, permanent DynamoDB `DeleteItem`),
then redirect to the corresponding picker page (`pickBlog.html`/
`pickCardSet.html`) on success. Backed by the two newest in-repo
Lambdas, `Lambdas/deleteBlogHandler/` and `Lambdas/deleteCardSetHandler/` — see
`LAMBDA_FUNCTIONS.md`.

### Redirect on success

Every create/update/delete action in `scripts/cms.js` redirects to its
content type's picker page on a confirmed success — "confirmed"
meaning `response.ok` was checked (or, for `updateCardSet()`, whose
Lambda doesn't reliably signal errors via response body shape — see
"Update card set" in `API_ENDPOINTS.md` — `response.ok` is still
checked before redirecting, independent of body-shape parsing):

- `createBlogPost()`, `updateBlogPost()`, `deleteBlogPost()` → `pickBlog.html`
- `createCardSet()`, `updateCardSet()`, `deleteCardSet()` → `pickCardSet.html`

On an error response, the form stays put with its data intact rather
than redirecting, so a failed submission can be fixed and retried
without re-typing everything. (Deletes don't have "data to keep" in
the same sense, but the same guard means a failed delete doesn't
redirect either — see "Delete" above.)

### Image picker / uploader

Both create/edit forms include a "Browse" button next to image fields
that opens a shared modal (`#imageBrowserModal`, driven entirely by
`scripts/cms.js`):

1. Lists every image currently in the S3 bucket (filtered client-side to `img/blog/` or `img/cards/` depending on which form opened it), with thumbnails, via a search box.
2. Clicking a thumbnail fills in the target form field and closes the modal.
3. Or, upload a brand-new file: pick a file → requests a presigned S3 PUT URL from a Lambda → uploads the raw file directly to S3 from the browser → refreshes the image list and auto-selects the new file.

See `API_ENDPOINTS.md` → "CMS — image management" for the exact calls.

**Card sets vs. blog posts pick different things**, and it matters if
you're touching this code: card set forms (`openImageBrowser()`) write
just the bare **filename** into `headerImgName`/`footerImgName` — the
Cards table also stores a separate `headerImg`/`footerImg` prefix
field, concatenated with the filename at render time in `wax.js`. Blog
forms (`openBlogImageBrowser()`, a separate function) write the
**complete URL** into `imgName` — Blogs has no matching prefix field,
`img` holds the whole thing on its own, and clicking a thumbnail
overwrites that field entirely rather than appending to it.
`createBlogPost.html`'s `imgName` input defaults to the literal string
`"none"` (the sentinel `displayBlog()` in `blogs.js` checks for to skip
rendering an image at all) — it used to default to the bare S3 prefix
with no filename, which any post that skipped clicking Browse would
save as-is, producing a URL that looks valid but 404s. See
`DATA_MODEL.md`'s `Blogs.img` field note.

### Preview

`setEdit.html` has a "Preview" button (`openPreview()` in
`scripts/cms.js`) that renders the card set exactly as it will appear
on the live site, using the current (possibly unsaved) form values, in
a modal — lets you check formatting before publishing. `createBlogPost.html`/`blogEdit.html` don't currently have an equivalent preview.

### Checklist upload

`cms/uploadChecklist.html` is a separate, three-step flow rather than a
create/edit form: **upload → review → save**.

1. **Upload**: an "Upload Checklist PDF..." button opens a modal that
   mirrors `smsAdmin.html`'s bulk-import modal exactly — same `.bulk-*`
   CSS classes, same drag-and-drop/click-to-browse drop zone. Clicking
   "Parse" sends the PDF (base64-encoded, no S3 step — checklist PDFs
   are small) to `parseChecklistPdf`.
2. **Review**: on a successful parse, the modal closes and an editable
   table appears on the page — a Set Name field, an optional Insert Set
   Name field (blank for the base/main set; filled in when the PDF's
   filename indicated one — see `LAMBDA_FUNCTIONS.md`), and one table
   row per card (`Card #` / `Player Name` / `Notes`), each cell a plain
   text input, with a delete button per row and an "+ Add Row" button.
   Nothing has been saved yet; this step exists because parsing
   heuristics aren't perfect (e.g. a duplicate-numbered line from a
   stray caption in the source PDF gets dropped automatically, but is
   worth a glance).
3. **Save**: "Save to DynamoDB" reads whatever's currently in the table
   (including any hand-edits) and sends it to `saveChecklist`, which
   fully replaces that group's rows in the `Checklists` table (see
   `DATA_MODEL.md`) — the main set, or the one specific insert set named
   in the Insert Set Name field, not merging and not touching the
   table's other groups for that same base set. It also flips a
   `hasChecklist` flag on the matching `Cards` item, which is what makes
   the "Checklist" link appear on `waxReviews.html` (see
   `FRONTEND.md`) — if that particular step fails (e.g. no `Cards` item
   exists yet with that exact `setName`), the save still succeeds, but
   the success alert includes a warning saying so. A save can also fail
   outright with a `400` if two rows share the same Card # within this
   group (different parallels/variants of the same slot, e.g. two
   different serial-numbered autograph runs) — the parse/review step
   deliberately keeps both as separate rows rather than silently
   dropping one, but they need distinguishing Card # values before they
   can be saved; see `DATA_MODEL.md`'s "Sort-key collision guard". Every
   outcome — validation errors, server errors, success (with or without
   a warning) — uses `cmsAlert()` (see "CMS alert modal" below), same
   convention as `createCardSet()`/`createBlogPost()`/etc.; on success,
   the redirect back to `cms/uploadChecklist.html` itself (a fresh page
   load, ready for the next upload) only fires after the modal is
   dismissed (`await cmsAlert(...)` blocks the calling function until
   then, the same effective ordering `alert()` gave for free before).

See `API_ENDPOINTS.md` → "CMS — checklist upload" for the two Lambdas'
exact request/response shapes, and `tools/checklistParser/` for the
standalone CLI version of the same parsing logic (used for the first
set, before this page existed) — note that its default output location
(`checklists/` at the repo root, unless `--out` is passed) is the same
directory that now holds the real source PDFs (see
`LAMBDA_FUNCTIONS.md`), so pass `--out` explicitly when using it now.

Once a checklist is uploaded and linked, `waxReviews.html` displays it
in a print-friendly modal — see `FRONTEND.md`'s "Checklist display"
section for that half of the feature.

### Admin Tools

`cms/admin.html` is a growing collection of self-service site-health
checks, run entirely client-side by `scripts/adminTools.js` against the
site's existing public read APIs — no new backend endpoints, no auth
needed for the checks themselves (they're just page-gated like every
other `/cms` page). Each check is its own card on the page: a short
description, a "Run Check" button, a status line, and a results area.
Adding a new one means adding a function to `adminTools.js` and a
matching card here — not growing this into one do-everything script.

Two checks exist today:

- **Broken Image Check**: loads every image the *live* public site
  references — blog post `img` fields, card set `headerImgName`/
  `footerImgName`, and any `<img>` tags embedded in a review or post's
  `postBody` rich text — and test-loads each one client-side the same
  way a visitor's browser does (an `onload`/`onerror` check, not just an
  HTTP status check, so it also catches responses a browser would
  reject outright, e.g. an S3 error body served for a missing object).
  Only covers published/live content, not staged drafts. A blog's `img`
  field is skipped as a candidate (not flagged) when it's the `"none"`
  sentinel *or* a bare S3 prefix with no filename — see `DATA_MODEL.md`'s
  `Blogs.img` note for why the second form exists. Takes a minute or
  two; results include which page/set/post each broken image belongs
  to, and any individual page fetch that failed outright (e.g. from
  DynamoDB throughput exhaustion — see `ARCHITECTURE.md`'s billing-mode
  note) is reported separately rather than aborting the whole check.
- **Checklist Integrity Check**: a thin UI wrapper around
  `searchPlayerName`'s `?audit=1` mode (see `LAMBDA_FUNCTIONS.md`) —
  reports any uploaded checklist with no matching `Cards` review.

## Autobus Messaging Platform — `cms/smsAdmin.html`

A separate, unrelated tool bolted onto the same `/cms` area and
Cognito login, for sending SMS broadcasts to a cycling club's member
list via Twilio. Logic lives in `scripts/adminSMS.js`; the send itself
is handled by `Lambdas/sendAlertHandler/` (see `LAMBDA_FUNCTIONS.md`).

The in-app "user guide" link (`#helpLink`) opens a modal with the
fullest first-party explanation of this tool, summarized here:

- **Message box**: always starts pre-filled with `"Autobus Cycling Club:\n"` — you add the ride details after it.
- **Live character/segment counter**: detects whether the message fits the **GSM-7** SMS character set (160 chars/segment) or has to fall back to **Unicode** (70 chars/segment, e.g. because of curly quotes or emoji) — messages over one segment's worth of characters get split (and billed) as multiple SMS segments by Twilio.
- **GSM-Safe Mode** checkbox: auto-replaces smart-quotes/em-dashes/ellipses with plain-ASCII equivalents to keep the message in the cheaper GSM-7 encoding.
- **Test Mode** checkbox (checked by default): sends only to the `SubscribersTest` table instead of the real `Subscribers` list — use this to sanity-check a message before going live. Unchecking it requires confirming a "LIVE MODE" browser dialog before anything sends.
- **Results panel**: per-recipient success/failure table plus a summary count, after a send.
- **Bulk import** (nav link): replaces the *entire* subscriber list from an uploaded pre-processed JSON file (already in DynamoDB typed-JSON format). This is destructive — it deletes all existing subscribers first — and is described in-app as something "prepared separately once a year from the club sign-up data," i.e. an external, out-of-band process not represented anywhere in this repo.
- **Add subscriber** (nav link): a small modal to add one subscriber by name + mobile number without doing a full bulk re-import.
