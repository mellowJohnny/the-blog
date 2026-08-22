# Lambda Functions

**23 of the 27 Lambda functions behind this site's API Gateway
endpoints have their source checked into this repo**, under
`Lambdas/` (as of 2026-08-15, one directory per function, named
exactly after its AWS Lambda function name). Most were pulled directly
from the live Console via `aws lambda get-function` using the
`amplify-readonly-cli` credential (see `CLAUDE.md` — its actual IAM
scope turned out to be broader than its name suggests: it can read
full Lambda source, though not API Gateway config). Six were already
in the repo, hand-built here rather than pulled:
`Lambdas/sendAlertHandler/`, `Lambdas/castVoteHandler/`,
`Lambdas/deleteBlogHandler/`, `Lambdas/deleteCardSetHandler/`, and —
added later, for the checklist-upload feature —
`Lambdas/parseChecklistPdf/` and `Lambdas/saveChecklist/`. The
remaining 4 of the 27 (`getCardIntro`, `getBlogIntro`,
`fetchCardSetPreview`, `invalidateCache`) were pulled in the same pass,
confirmed dead, and removed again the same day — see "Orphaned/dead
Lambdas" below.

Deployment is still entirely manual for every one of them, but the
mechanics differ by function: the 21 with no real dependencies
(`dependencies: {}` in `package.json`) just need the updated
`index.mjs` pasted into the Lambda Console's inline code editor and
Deploy clicked — no zip needed. Two need a full `npm install` + zip
(code + `node_modules`) + "Update from a .zip file" upload instead:
`sendAlertHandler` (has `twilio`) and `parseChecklistPdf` (has
`pdf-parse`, pinned to its v1 major — see that section below for why)
— see their sections for specifics. Per the header comment most files
carry: **never edit any of them directly in the Console without also
updating this repo** — this repo is now the source of truth, and a
Console-only edit made after 2026-08-15 would silently drift out of
sync with what's checked in here.

This doc covers (1) the Lambdas with enough of a story to be worth
prose — either because they're hand-built/heavily modified in this
session, or because pulling in their source revealed something
notable — (2) a compact table of the remaining "plain CRUD" functions,
and (3) the four dead ones, removed again after being briefly checked
in. There's also a separate, older `Lambda Functions/` prototype
directory (note the space in the name) referenced further down — it no
longer exists in this repo (deleted 2026-08-06, unrelated to this
session's work) but is still referenced by name in a few places below
since that history predates this doc being kept current.

## `Lambdas/sendAlertHandler/` — hand-built in this repo

- **File**: `Lambdas/sendAlertHandler/index.mjs` (ES module, Node.js).
- **Deployment**: manual — the file's own header comment is explicit about this: *"NEVER change this code in the AWS Console. ONLY change in VS Code, then redeploy by uploading the new .zip file (Console → Code tab → Update dropdown → Update from a .zip file)."* A pre-built `sendAlertHandler.zip` sits alongside it in the repo — presumably the last thing actually uploaded; keep it (or regenerate it) in sync with `index.mjs` when you change the code.
- **Dependencies** (`package.json`): `twilio` (^6.0.2), plus `@aws-sdk/client-dynamodb` used in code but not listed in `package.json` `dependencies` — likely available via the Lambda Node.js runtime's bundled AWS SDK v3 layer, but worth double-checking if a fresh `npm install` / redeploy ever fails on it.
- **What it does**: backs the "Send broadcast" button in the Autobus Messaging Platform (`cms/smsAdmin.html`). See `API_ENDPOINTS.md` for the full request/response contract. In short: reads `message` + `mode` (`"test"`/`"live"`) from the request body, scans either `SubscribersTest` or `Subscribers` for `status = "subscribed"`, sends each one an SMS via Twilio (credentials from Lambda environment variables — not in this repo), and returns a per-recipient success/failure list. CORS is hardcoded to allow only `https://www.mellowjohnny.cc`.
- **Related**: bulk subscriber import (`Lambdas/bulkSubscriberUpload/`) and single-subscriber add (`Lambdas/subscribeHandler/`) are separate Lambdas — see the table below. Inbound SMS replies (STOP/START/HELP) are handled by a completely different, previously-undocumented Lambda — see `Lambdas/inboundSMSHandler/` below.

## `Lambdas/castVoteHandler/` — hand-built in this repo

- **File**: `Lambdas/castVoteHandler/index.mjs` (ES module, Node.js). Same
  manual-deploy convention as `Lambdas/sendAlertHandler/` (header comment
  says never edit in the Console without also updating this repo) —
  but unlike `sendAlertHandler`, no zip needed: paste the updated
  `index.mjs` straight into the Lambda Console's inline code editor
  and Deploy.
- **Dependencies** (`package.json`): none listed — only uses
  `@aws-sdk/client-dynamodb`, which ships with the Lambda Node.js
  runtime, so there's nothing to `npm install` or bundle.
- **What it does**: backs the thumbs up/down voting feature on
  `waxReviews.html` card set reviews. Takes `{ setName, year,
  voteType }` (`voteType` is `"up"` or `"down"`) and does an atomic
  DynamoDB `UpdateItem` with `ADD upvotes :inc` / `ADD downvotes
  :inc` on the `Cards` table, keyed on `setName` (partition key) +
  `year` (sort key) — see `DATA_MODEL.md`. A `ConditionExpression:
  attribute_exists(setName)` guard returns a 404 instead of silently
  creating a garbage item for a bad/mistyped `setName`+`year` pair.
  Full request/response contract: `API_ENDPOINTS.md`. CORS is
  hardcoded to allow only `https://www.mellowjohnny.cc`, same as
  `Lambdas/sendAlertHandler/`.
- **Frontend**: `castVote()` in `scripts/wax.js` calls it optimistically
  (UI updates immediately on click, rolls back if the request fails)
  and tracks which sets a browser has already voted on via
  `localStorage` (no auth on public pages, so this is a lightweight
  deterrent against repeat votes, not tamper-proof).

## `Lambdas/deleteBlogHandler/` — hand-built in this repo

- **File**: `Lambdas/deleteBlogHandler/index.mjs` (ES module, Node.js). Same
  manual-deploy convention as the other hand-built ones — no zip
  needed, paste `index.mjs` into the Lambda Console's inline code
  editor and Deploy. Deployed 2026-08-14 alongside
  the "Delete Post" button on `cms/blogEdit.html`.
- **Dependencies** (`package.json`): none listed — only uses
  `@aws-sdk/client-dynamodb`, which ships with the Lambda Node.js
  runtime, so there's nothing to `npm install` or bundle.
- **What it does**: backs the "Delete Post" button on
  `cms/blogEdit.html`. Takes `{ blogID, blogType, time }` and does a
  DynamoDB `DeleteItem` on the `Blogs` table, keyed on `blogType`
  (partition key, Number) + `time` (sort key, String) — this is the
  first place that key schema was confirmed directly against the
  Console rather than inferred (see `DATA_MODEL.md`). A
  `ConditionExpression: blogID = :blogID` guard requires the `blogID`
  to also match before deleting (returns 404 otherwise), as a safety
  check against a stale or mismatched `blogType`+`time` pair silently
  deleting the wrong post. CORS is hardcoded to allow only
  `https://www.mellowjohnny.cc`, same as the other two.
- **Frontend**: `deleteBlogPost()` in `scripts/cms.js` shows a JS
  `confirm()` dialog first (this is a destructive, irreversible
  action — no soft-delete/undo), then calls the Lambda and redirects
  to `cms/pickBlog.html` on success.

## `Lambdas/deleteCardSetHandler/` — hand-built in this repo

- **File**: `Lambdas/deleteCardSetHandler/index.mjs` (ES module, Node.js). Same
  manual-deploy convention as the other three — no zip needed, paste
  `index.mjs` into the Lambda Console's inline code editor and Deploy.
  Deployed 2026-08-14 alongside the "Delete Set" button
  on `cms/setEdit.html`.
- **Dependencies** (`package.json`): none listed — only uses
  `@aws-sdk/client-dynamodb`, which ships with the Lambda Node.js
  runtime, so there's nothing to `npm install` or bundle.
- **What it does**: backs the "Delete Set" button on `cms/setEdit.html`.
  Takes `{ setID, setName, year }` and does a DynamoDB `DeleteItem` on
  the `Cards` table, keyed on `setName` (partition key, String) +
  `year` (sort key, Number) — see `DATA_MODEL.md`. A
  `ConditionExpression: setID = :setID` guard requires the `setID` to
  also match before deleting (returns 404 otherwise), as a safety
  check against a stale or mismatched `setName`+`year` pair silently
  deleting the wrong set. CORS is hardcoded to allow only
  `https://www.mellowjohnny.cc`, same as the others.
- **Frontend**: `deleteCardSet()` in `scripts/cms.js` shows a JS
  `confirm()` dialog first (destructive, irreversible — no
  soft-delete/undo), then calls the Lambda and redirects to
  `cms/pickCardSet.html` on success.

## `Lambdas/parseChecklistPdf/` — hand-built in this repo

- **File**: `Lambdas/parseChecklistPdf/index.mjs`. Same "never edit in
  Console" convention as the others, but deployed via the **.zip**
  path (Console → Code tab → Update dropdown → Update from a .zip
  file) — see the intro above for why.
- **Dependencies** (`package.json`): `pdf-parse`, deliberately pinned to
  its **v1** major rather than the current v2. v2 needs a native
  `@napi-rs/canvas` binary even for plain text extraction, and `npm
  install` on a Mac pulls the macOS binary — wrong for Lambda's Linux
  runtime, and there's no simple way to force the right platform
  binary without a Linux-matching install step. v1 is pure JS, no
  native deps, so a zip built on a Mac just works on Lambda. The code
  also imports `pdf-parse/lib/pdf-parse.js` directly rather than the
  package root — v1's top-level `index.js` has a long-standing bug
  (`isDebugMode = !module.parent`) that misfires under ESM/dynamic
  import (reportedly including AWS Lambda's own module loader) and
  tries to read a nonexistent test fixture file, crashing on load;
  `lib/pdf-parse.js` is the real implementation without that wrapper.
- **What it does**: backs `cms/uploadChecklist.html`'s upload step.
  Takes a base64-encoded PDF, extracts its text, and parses it into
  `{ setName, insertSetName, cards: [{ cardNumber, playerName, notes }] }`
  — one row per line matching `<number> <name> [NOTES]`, where a
  trailing all-caps token (or several, e.g. `"RC, UER"`) is treated as a
  note rather than part of the name. The card number itself may have a
  leading letter prefix (e.g. `"R1"`, common for insert sets numbered
  separately from the base set) and/or a single trailing letter (e.g.
  `"165a"`). A line that doesn't match the `<number> <name>` pattern at
  all is either header/title noise before the first card (ignored), or
  — once at least one card has been seen — treated as a note that
  wrapped onto its own line in the source PDF and gets appended to the
  *previous* card's `notes` (e.g. `"RDM"`/`"Long Shot RDM"` trailing
  some insert-set cards). Duplicate card numbers are dropped (first
  occurrence kept) rather than erroring, since real checklist PDFs can
  have stray duplicate lines (e.g. a sample-card caption repeating a
  number already used in the main grid). **Never writes to DynamoDB** —
  returns the parsed result for review/correction in the browser;
  `saveChecklist` below is the only one that writes. Same parsing logic
  as the standalone `tools/checklistParser/parse.mjs` script in this
  repo — kept in sync deliberately, see that file's own comments.
- **`setName`/`insertSetName` derivation**: both come from the
  filename, not PDF content. A comma splits it into the base set name
  and the insert set name (e.g. `"1994-95 Upper Deck,Predictors
  (Retail)).pdf"` → `setName: "1994-95 Upper Deck"`, `insertSetName:
  "Predictors (Retail)"`); no comma means `insertSetName: ""` — a
  main-set upload. The result also has a trailing sport name stripped
  from `setName` (e.g. `"...O-Pee-Chee Hockey"` → `"...O-Pee-Chee"`) —
  checklist source titles often include it, but this site's own
  `Cards.setName` convention doesn't, and `saveChecklist`'s `Cards`
  lookup (see below) depends on an exact match.
- **Memory/timeout**: needed bumping up from Lambda's defaults
  (128MB/3s) to get reliable runs — `pdf-parse`/`pdfjs-dist` isn't
  lightweight, and the defaults caused intermittent 502s (crash/OOM)
  or timeouts on real checklist PDFs even though everything worked
  fine testing the code directly outside Lambda.

## `Lambdas/saveChecklist/` — hand-built in this repo

- **File**: `Lambdas/saveChecklist/index.mjs`. No real dependency —
  inline-paste deployable like most of the others, not zipped.
- **Dependencies** (`package.json`): none listed — only uses
  `@aws-sdk/client-dynamodb`/`@aws-sdk/lib-dynamodb`, which ship with
  the Lambda Node.js runtime.
- **What it does**: backs `cms/uploadChecklist.html`'s save step, after
  the parsed result has been reviewed/corrected in the browser. Takes
  `{ setName, insertSetName, cards }` and writes it to the `Checklists`
  table (see `DATA_MODEL.md`) — but as a **full replace, scoped to the
  exact group** (main set, or this one specific insert set), not a
  merge and not the whole `setName` partition: it first `Query`s
  (partition key `setName` + a `begins_with` condition on the group's
  sort-key prefix, not a `Scan`) every existing item in that group,
  deletes them all, and only then writes the new set — same overall
  pattern as `bulkSubscriberUpload`'s delete-all-then-import, but
  scoped down to one group's rows rather than the whole table, since
  main-set and insert-set cards for the same `setName` share the table
  (and can otherwise collide — see `DATA_MODEL.md`'s prefixed-sort-key
  explanation). If the delete step doesn't fully succeed after retries,
  the function aborts before writing anything new, rather than risking
  a mix of old and new rows. `BatchWriteItem`'s `UnprocessedItems`
  (from throttling) are retried a few times with backoff on both the
  delete and write passes. Each written item also gets `type`,
  `insertSetName`, `cardNumberDisplay`, and `sortIndex` — see
  `DATA_MODEL.md` for what each is for.
- **`hasChecklist` linking (non-critical, but surfaced)**: after a
  successful save, it `Query`s the `Cards` table by the same `setName`
  (Cards' own partition key) and sets `hasChecklist: true` on the
  matching item(s) — this is what `waxReviews.html` checks to show a
  "Full Checklist" row (see `FRONTEND.md`). This step has its own
  try/catch, same design principle as `updateCardSet`'s TinyMCE cleanup
  pass below — its failure never fails the checklist save itself, which
  already fully succeeded by this point. It's not silent, though: if
  this step throws, or finds zero matching `Cards` items (e.g. a
  `setName` mismatch — this happened for real with the trailing
  "Hockey" case above, before that strip was added), the success
  message gets a `Warning: ...` suffix explaining it, so a broken link
  shows up in the CMS instead of just quietly never happening.
- **Execution role**: needs `dynamodb:Query` and `dynamodb:BatchWriteItem`
  on `Checklists`, **plus** `dynamodb:Query` and `dynamodb:UpdateItem`
  on `Cards` for the linking step above — easy to accidentally grant
  the `Checklists` permissions to `parseChecklistPdf` instead by
  mistake (it doesn't need any DynamoDB access, since it never touches
  the database).

## `Lambdas/updateCardSet/` — pre-existing, with a real incident behind it

- **File**: `Lambdas/updateCardSet/index.mjs`. This is the "Update card set"
  Lambda (see `API_ENDPOINTS.md`) — backs `updateCardSet()` in
  `scripts/cms.js`, used by `cms/setEdit.html`.
- **What it does**: a straightforward DynamoDB `UpdateCommand` on
  `Cards`, keyed on `setName`+`year`, setting every editable field.
  Also runs a TinyMCE cleanup pass on `postBody` before saving (strips
  empty `<p>&nbsp;</p>`-style junk TinyMCE tends to leave behind).
- **2026-08-15 incident, fixed**: this Lambda used to *also* fire a
  `CreateInvalidationCommand` against a CloudFront distribution
  (`E1ITD1S1KYPTFG`) after every successful save, inside the *same*
  `try`/`catch` as the DynamoDB update. When the site owner deleted
  that (unrelated, apparently-unused) distribution, every subsequent
  card set update started returning a 500 — even though the actual
  DynamoDB write was succeeding every time. The frontend
  (`updateCardSet()` in `cms.js`) also had its own bug that masked
  this for a while: it defaulted to displaying `"Update complete."`
  for any response shape it didn't recognize, so the alert looked like
  success even on a genuine failure. Both were fixed together: the
  invalidation code was removed entirely (dead weight now that the
  distribution is gone — see the `## Orphaned cache-related Lambdas`
  section below for two *other* half-finished invalidation attempts
  discovered nearby), and `updateCardSet()` on the frontend now checks
  `data.error` and only defaults to a positive message when
  `response.ok` is actually true.
- **Lesson worth remembering if you add side effects to a Lambda
  later**: a non-critical side effect (cache busting, notifications,
  analytics, etc.) should get its own `try`/`catch` so its failure
  can't fail the primary operation. `deleteBlogHandler`/
  `deleteCardSetHandler` don't have this problem since they don't have
  side effects beyond the delete itself — but if either ever grows one
  (e.g. cleaning up an S3 image on delete), apply the same lesson.

## `Lambdas/inboundSMSHandler/` — real, live, previously completely undocumented

- **File**: `Lambdas/inboundSMSHandler/index.mjs`. Discovered 2026-08-15 while
  pulling in the full Lambda inventory — this was not referenced
  anywhere in `API_ENDPOINTS.md` before now, and isn't called from any
  frontend code in this repo (it can't be — see below).
- **What it does**: this is the Twilio *inbound* webhook — the URL
  configured directly in the Twilio Console as the phone number's
  "a message comes in" handler, called by Twilio itself when a
  subscriber texts back, not called from `mellowjohnny.cc` at all.
  Handles the SMS keywords that TCPA/carrier compliance requires:
  `STOP`/`STOPALL`/`UNSUBSCRIBE`/`CANCEL`/`END`/`QUIT` (sets
  `Subscribers.status = "unsubscribed"`), `START`/`YES`/`UNSTOP`
  (resubscribes an *existing* subscriber only — a stranger texting
  START to the number gets a "private channel, contact a Ride Leader"
  message rather than being silently added), and `HELP`. Responds with
  Twilio's expected TwiML XML, not JSON.
- **Security**: validates the inbound request's `X-Twilio-Signature`
  header via HMAC-SHA1 against `process.env.TWILIO_AUTH_TOKEN` (env
  var, not hardcoded — no secret in the source) using
  `crypto.timingSafeEqual`, correctly avoiding a timing side-channel.
  Requests that fail validation get a 403 before any DynamoDB access.
- **API Gateway URL**: not confirmed — this codebase's read access
  covers Lambda source but not API Gateway (`apigateway:GET` is
  denied for the `amplify-readonly-cli` credential), and this endpoint
  was found via `aws lambda list-functions`, not by grepping frontend
  `fetch()` calls like every other entry in `API_ENDPOINTS.md`. Worth
  adding the real URL to `API_ENDPOINTS.md` next time you're in the
  API Gateway console.

## Orphaned/dead Lambdas — removed from this repo

Four functions turned out to be unreachable from any live frontend
code, discovered while briefly pulling in the full inventory on
2026-08-15, then removed from the repo the same day once confirmed
dead (they may still exist in AWS — deleting them there, if wanted, is
a separate manual step; see `README.md`'s "Known gaps"). Documented
here for history even though the source itself is gone:

- **`getCardIntro`** — read `introText` from a DynamoDB table called
  `CardIntro` (not previously documented — see `DATA_MODEL.md`),
  keyed by `pageName`. Superseded by `renderCardIntro()` in
  `scripts/wax.js`, which has hardcoded the same copy client-side
  since before this session — its own comment says "moved to a static
  design because it's faster than calling an API for such a small
  piece of content which never changes."
- **`getBlogIntro`** — the blog equivalent of the above, read from a
  `BlogIntro` table via PartiQL. Already known-dead before the
  Lambda-inventory pull: this is the Lambda behind "Get blog intro
  text by type" in `API_ENDPOINTS.md`, whose only frontend caller
  (`fetchBlogIntroByType()`) was removed as dead code on 2026-08-12 in
  favor of the equivalent static `renderBlogIntro()`.
- **`fetchCardSetPreview`** — looked like an earlier, server-side
  attempt at the CMS "Preview" feature: queried staged card sets by
  `year`+`blogCat`. The *current* Preview button (`openPreview()` in
  `scripts/cms.js`, documented in `CMS_GUIDE.md`) is purely
  client-side, rendering from the current unsaved form values with no
  API call at all — this Lambda predated that and was never removed
  from AWS.
- **`invalidateCache`** — a second, independent cache-busting attempt
  (separate from the one removed from `Lambdas/updateCardSet/`, see
  above). Took `{ year, pageName }` or `{ blogType }` and just
  re-fetched the corresponding public GET endpoint (`getCardSetsByYear`
  or `getBlogs`) with a `Cache-Control: max-age=0` *request* header.
  That header has no effect here — there's no CDN/shared cache sitting
  in front of either API Gateway endpoint (see the caching note in
  `API_ENDPOINTS.md`), so this call was functionally a no-op GET
  request. Never wired to a frontend caller as far as this repo showed.

None of these four were called from anywhere in this repo's frontend
code, which is why they were removed here rather than kept alongside
the real ones.

## Plain CRUD Lambdas

The remaining functions are straightforward single-purpose DynamoDB/S3
operations with no notable history — full request/response contracts
live in `API_ENDPOINTS.md`, linked here by their `API_ENDPOINTS.md`
section title:

| Function | `API_ENDPOINTS.md` entry | Notes |
|---|---|---|
| `Lambdas/getBlogs/` | Get all blogs of a given type | Uses PartiQL (`ExecuteStatementCommand`), filters `published = true` server-side. |
| `Lambdas/getBlogByID/` | Get a single blog by ID | `Query` on `blogType` (partition key) + `FilterExpression` on `blogID`. |
| `Lambdas/createBlogPost/` | Create blog post | Generates `blogID` via `crypto.randomUUID()`; `time` = `new Date().toISOString()` (the actual sort key). |
| `Lambdas/updateBlogPost/` | Update blog post | Plain `UpdateCommand` keyed on `blogType`+`time`. |
| `Lambdas/listBlogsForUpdate/` | Get all live blogs (for the edit picker) | **Note**: despite the doc's previous description, this does a full unfiltered `Scan` (`published = :p` where `:p = true`) with no `ProjectionExpression` — the response is full blog records under `{items: [...]}`, not just `{title, blogID, blogType}`. `API_ENDPOINTS.md` corrected 2026-08-15. |
| `Lambdas/getStagedBlogsForUpdate/` | Get all staged (draft) blogs | Same correction as above, mirrored: full `Scan` on `published = false`, full records returned, not a narrow projection. |
| `Lambdas/createCardPost/` | Create card set | Despite the AWS function name, this is the "create card set" Lambda (its own header comment calls itself `createCardSet Lambda Function`). Generates `setID` via `Math.random().toString(36)` (not a UUID). Hardcodes the S3 image URL prefix (`headerImg`/`footerImg`) server-side — see the CloudFront-migration discussion this repo's git history has around 2026-08-15 for why that matters if image hosting ever moves off direct S3 URLs. |
| `Lambdas/getCardSets/` | Get all live card sets (for the edit picker) | Queries the `blogStatus-year-index` GSI, `blogStatus = "OK"`. File has old commented-out `ProjectionExpression` variants left in as history of the 2026-08-14 `getStagedCardSets` projection bug fix (see below) — this one already returns full items. |
| `Lambdas/getStagedCardSets/` | Get all staged (draft) card sets | Same GSI, `blogStatus = "staged"`. This is the Lambda whose `ProjectionExpression` bug (only requesting `setName, setID`, silently dropping `blogCat`/`year`) was found and fixed on 2026-08-14 — see `API_ENDPOINTS.md` for the full story. |
| `Lambdas/getCardSetByID/` | Get a single card set by ID | PartiQL `SELECT * FROM Cards WHERE setID=?`. |
| `Lambdas/getCardSetsByYear/` | Get card sets by year | Queries the `blogCat-year-index` GSI. Returns `Cache-Control: public, max-age=1800`; its own comment says "CloudFront cache" but no CloudFront actually sits in front of it (see `API_ENDPOINTS.md`'s caching note) — today this header is browser-only. |
| `Lambdas/cmsImageUploader/` | Get S3 upload URL (presigned PUT) | `getSignedUrl()` for a `PutObjectCommand`, 300s expiry, sets `CacheControl: public, max-age=31536000, immutable` on the eventual S3 object. |
| `Lambdas/cmsImagePicker/` | List images in the bucket | `ListObjectsV2Command` on the whole bucket, no prefix filter server-side (filtering happens client-side in `cms.js`). |
| `Lambdas/bulkSubscriberUpload/` | Bulk import subscribers | Truncates the target table (`process.env.TABLE_NAME` — not hardcoded to `Subscribers`/`SubscribersTest`, so which one it hits depends on this Lambda's environment config) via paginated `Scan` + chunked `BatchWriteItem` deletes, then bulk-imports the new list the same way, with exponential-backoff retry on unprocessed items. |
| `Lambdas/subscribeHandler/` | Add a single subscriber | Single `PutItemCommand` with `ConditionExpression: attribute_not_exists(phoneNumber)` (409 on duplicate). Sets `source: "web"` — compare to `Lambdas/inboundSMSHandler/`'s `source: "mobile"` on a START-triggered resubscribe. |

## `Lambda Functions/` — separate legacy/prototype code, still not confirmed current

These look like early iterations built while following
`Documentation/Creating A New Lambda.txt`, checked into a differently-
named directory (`Lambda Functions/`, with a space) before the
2026-08-15 sync above. **Now that the real, currently-deployed source
for every live Lambda is checked in elsewhere in this repo (see
above), this section is much less urgent to reconcile** — but the
files themselves haven't been re-verified against the real ones, so
the mismatches below are left as originally documented:

- **`Lambda Functions/getBlogs/getBlogs.js`**: scans the entire `Blogs` table (`documentClient.scan()`) and returns everything, no filtering — despite the file's own header comment claiming it "fetches blog posts filtered using type param." Also contains a second, unreachable, dead `params` block below the first `return` referencing a table called `"blogTable"` that appears nowhere else in the codebase — looks like an abandoned edit.
- **`getTechBlogs/getTechBlogs.js`**: near-identical to a variant of `getBlogs.js` but hardcodes `blogType: 1` (tech) via `query()` rather than accepting it as a parameter — i.e., not reusable for the other blog types, which the live `getBlogs` endpoint clearly now supports via a `blogType` query param (see `API_ENDPOINTS.md`).
- **`Lambda Functions/createBlogPost/createBlogPost.js`**: writes to table `Blogs` with fields `blogType, time, title, author, postBody` — notably missing `published`, `img`, `imgCap`, `blogID`, all of which the current CMS create form sends and the edit/list flows depend on (see `DATA_MODEL.md`). This file is almost certainly stale relative to the real `Lambdas/createBlogPost/index.mjs` now checked in.
- **`Lambda Functions/createCardSet/createCardPost.js`**: writes to table `Cards` with fields `setName, setID, size, subsets, mfg, year, headerImg, footerImg, status, postBody` — missing `stars`, `formats`, `blogCat`, `author`, the SEO fields, and `blogStatus` (uses `status` instead), all of which the current CMS create form sends (see `DATA_MODEL.md`). Also generates `setID` via `Math.random().toString(36)` — fine for low collision risk at this scale, but worth knowing it's not a UUID. (The real, currently-deployed version of this Lambda is `Lambdas/createCardPost/index.mjs`, checked in above — also generates `setID` the same way, so that detail at least held up.)
- **`Lambda Functions/getCardSets/getCardSets.js`**: queries a `status-year-index` GSI on `Cards`, filtering to `status = "OK"` — the real deployed `Lambdas/getCardSets/index.mjs` uses `blogStatus-year-index` and `blogStatus = "OK"` instead, confirming this prototype's field/index names are stale.
- **`Lambda Functions/getCardSets/getCardSets_v2.js`**: queries `Cards` by a **hardcoded** `setName`/`year` (`"1988-89 O-Pee-Chee Hockey"` / `1989`) — clearly a copy-pasted-and-half-edited debugging/scratch version, not something that could serve real traffic as-is.
- **`Lambda Functions/getCardSets/getCardSet_FUTURE.js`**: queries a `setID-index` GSI on `Cards` by a **hardcoded** `setID`. The real deployed `Lambdas/getCardSetByID/index.mjs` (checked in above) uses PartiQL instead and doesn't reference a `setID-index` GSI at all — so either that GSI was never actually built, or the live Lambda was rewritten to avoid it.
