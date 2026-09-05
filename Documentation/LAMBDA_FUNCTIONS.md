# Lambda Functions

**25 of the 29 Lambda functions behind this site's API Gateway
endpoints have their source checked into this repo**, under
`Lambdas/` (as of 2026-08-15, one directory per function, named
exactly after its AWS Lambda function name). Most were pulled directly
from the live Console via `aws lambda get-function` using the
`amplify-readonly-cli` credential (see `CLAUDE.md` — its actual IAM
scope turned out to be broader than its name suggests: it can read
full Lambda source, though not API Gateway config, and (confirmed
2026-08-24) not DynamoDB or IAM policy introspection either). Eight
were already in the repo, hand-built here rather than pulled:
`Lambdas/sendAlertHandler/`, `Lambdas/castVoteHandler/`,
`Lambdas/deleteBlogHandler/`, `Lambdas/deleteCardSetHandler/`, and —
added later, for the checklist-upload feature and its front-end display —
`Lambdas/parseChecklistPdf/`, `Lambdas/saveChecklist/`,
`Lambdas/getChecklistBySetName/`, and — for the player-search feature —
`Lambdas/searchPlayerName/`. The remaining 4 of the 29
(`getCardIntro`, `getBlogIntro`, `fetchCardSetPreview`,
`invalidateCache`) were pulled in the same pass, confirmed dead, and
removed again the same day — see "Orphaned/dead Lambdas" below.

Deployment is still entirely manual for every one of them, but the
mechanics differ by function: the 23 with no real dependencies
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
- **Lambda Console timeout — hard minimum, do not reset to the default**: per the Confluence "AMP SMS - Platform Core" doc (the source of this Lambda's original write-up, predating this repo's doc workflow), the configured timeout is **1 minute 3 seconds**, and that page calls this out explicitly as a *hard minimum*, not just a comfortable buffer — Twilio's own per-message send time is what requires it. Messages are sent to subscribers **sequentially, one at a time** (not in parallel — see `1.5 Key Design Decisions` on that page: this is deliberate, both to avoid overwhelming the Twilio API and to keep per-recipient result tracking accurate), so total execution time scales with subscriber-list size, and the default Lambda Console timeout (3 seconds) is nowhere close to enough. **If this timeout ever gets reset to the Console default** (e.g. by someone recreating the function, or fat-fingering the Console's General Configuration tab), broadcasts to any list bigger than a handful of subscribers will start failing partway through with a Lambda timeout, likely showing up as `FAILED` results for whichever subscribers hadn't been reached yet when the clock ran out — worth checking this value first if a broadcast to a large list ever comes back with a suspicious cluster of failures near the end of the results list.
- **Full response shape** (per the same Confluence page, and confirmed against `index.mjs` itself): a top-level `mode` field (echoing back which table was actually used, `"live"` or `"test"`) alongside `results`, an array with one entry per subscriber in the target table with `status = "subscribed"`:
  ```json
  {
    "results": [
      {
        "phone": "+16135550123",
        "firstName": "Christian",
        "status": "SUCCESS",
        "error": ""
      },
      {
        "phone": "+16135550124",
        "firstName": "Jane",
        "status": "FAILED",
        "error": "The number is unsubscribed"
      }
    ],
    "mode": "live"
  }
  ```
  `error` is always present in each result entry — an empty string on `SUCCESS`, the caught Twilio error's `message` (or `"Unknown error"` as a fallback) on `FAILED`. An empty subscriber list (zero `status = "subscribed"` items in the target table) still returns `200` with `{ results: [], mode }`, not an error.
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
- **Frontend**: `deleteBlogPost()` in `scripts/cmsBlog.js` shows a
  `cmsConfirm()` dialog first (this is a destructive, irreversible
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
- **Frontend**: `deleteCardSet()` in `scripts/cmsCardSet.js` shows a
  `cmsConfirm()` dialog first (destructive, irreversible — no
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
  `{ setName, insertSetName, cards: [{ cardNumber, playerName, notes }], skippedDuplicates }`
  — one row per line matching `<number> <name> [NOTES]`, where a
  trailing token that's uppercase letters and/or digits (2+ characters,
  at least one letter — e.g. `"RC"`, `"UER"`, `"1000PC"`) is treated as
  a note rather than part of the name, with a space inserted at any
  digit/letter boundary before it's stored (`"500GC"` → `"500 GC"`,
  `"SN1000"` → `"SN 1000"`). The card number itself may have a leading
  prefix — either letters-only (e.g. `"R1"`, common for insert sets
  numbered separately from the base set) or digits-then-letters (e.g.
  `"3D-1"`, for a "3D" insert set) — an optional single hyphen *or
  space* between the prefix and the main number (e.g. `"PR-1"`,
  `"McD 1"`, `"3D-1"`), and/or a single trailing letter (e.g. `"165a"`)
  — or be one of two no-digit exceptions: the literal `"NNO"` ("No
  Number"), or an all-caps letters-hyphen-letters code (e.g. `"J-AM"`,
  a jersey/memorabilia insert numbered by player initials instead of a
  number). All of these are matched as specific exceptions rather than
  loosening the "at least one digit" requirement generally, which is
  what keeps the regex from matching ordinary prose lines or the set
  title line (its year always contains a hyphen, e.g. `"1997-98"` — the
  digits before that hyphen have no trailing letter, so they can't be
  absorbed as a prefix, and the line correctly fails to match). The
  letters-hyphen-letters case additionally requires the matched text be
  ALL CAPS in the source, checked in code (`isAllCapsLetterCode()`)
  rather than in the regex itself (which is case-insensitive
  throughout) — otherwise it can't be told apart from an ordinary
  Title-Case hyphenated phrase that happens to share the same shape
  (e.g. `"Self-Titled"`).
  A line that doesn't match the `<number> <name>` pattern — or does
  match but is actually a checklist card's own range reference wrapped
  onto its own line (e.g. `"PR-1 - PR-8 CL"`, continuing an `"NNO
  Parkies Checklist #1:"` card; recognized by the remainder starting
  with a bare `-` ) — is either header/title noise before the first card
  (ignored, if none has been seen yet), or, once at least one card
  exists, merged into the *previous* card: run through the same
  name/notes split as a normal line, with the name half appended to
  `playerName` and the note half appended to `notes` (covers both a
  trailing note that wrapped onto its own line, e.g. `"RDM"`/`"Long Shot
  RDM"`, and a title that wrapped mid-sentence, e.g. `"Pittsburgh Wins
  Patrick"` / `"Division"` — there's no reliable way to tell those two
  cases apart from the text alone, so this favors completing the
  name/title as the more common case).
  Duplicate cards are dropped (first occurrence kept, reported in
  `skippedDuplicates`) rather than erroring, since real checklist PDFs
  can have stray duplicate lines (e.g. a sample-card caption repeating a
  number already used in the main grid) — but the dedup key is
  `cardNumber + notes`, not `cardNumber` alone, so two cards that
  legitimately share a printed number but represent different
  parallels/variants (different serial numbering, an error/corrected
  pair) are *not* treated as duplicates and both survive into the
  result — see `saveChecklist` below for how a genuine same-number
  collision is still caught before anything gets written.
  **Never writes to DynamoDB** — returns the parsed result for
  review/correction in the browser; `saveChecklist` below is the only
  one that writes. Same parsing logic as the standalone
  `tools/checklistParser/parse.mjs` script in this repo — kept in sync
  deliberately, see that file's own comments.
- **Local regression testing**: real checklist source PDFs (the actual
  files being uploaded, one per set/insert set) now live in `checklists/`
  at the repo root — moved there from the site owner's Desktop since
  they're the source of truth for this feature. Every parsing-logic
  change in this session has been verified by invoking `handler()` (or
  the equivalent `parseChecklistText()`) directly against these real
  files and sweeping the whole directory for zero-card results or
  unexpected `skippedDuplicates`, before regenerating the zip. **Naming
  collision to be aware of**: `tools/checklistParser/parse.mjs` (below)
  also defaults to writing its JSON *output* into this same
  `checklists/` directory when run without `--out` — worth passing
  `--out` explicitly, or writing elsewhere, now that the directory holds
  real source PDFs rather than being an empty scratch/output location.
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
- **Duplicate-card-number guard**: since `parseChecklistPdf`'s dedup key
  is `cardNumber + notes` (see above), two submitted cards can share a
  `cardNumber` (different parallels/variants of the same slot) — but
  the DynamoDB sort key here is `prefix + cardNumberDisplay` alone, so
  that would collide, and `BatchWriteItem` rejects duplicate keys within
  one request outright (a raw `ValidationException` failing the whole
  batch). Before writing anything, this Lambda checks the submitted
  `cards` array for exactly that collision and returns a `400` naming
  the conflicting card number(s) if found, rather than letting the
  batch write throw — the CMS review table is where the user fixes it
  (edit the Card # field on one of the conflicting rows, e.g. `"125"` →
  `"125 SN250"`).

## `Lambdas/getChecklistBySetName/` — hand-built in this repo

- **File**: `Lambdas/getChecklistBySetName/index.mjs`. No real
  dependency — inline-paste deployable, not zipped.
- **Dependencies** (`package.json`): none listed — only uses
  `@aws-sdk/client-dynamodb`/`@aws-sdk/lib-dynamodb`, which ship with
  the Lambda Node.js runtime.
- **What it does**: backs the "Checklist" link/modal on
  `waxReviews.html` — Step 2 of connecting the `Cards` and `Checklists`
  tables on the public site (Step 1 was just the `hasChecklist` boolean
  and a plain-text row; see `DATA_MODEL.md` and `FRONTEND.md`). Public
  GET, no Cognito Authorizer — deliberately the same trust level as
  `getCardSetsByYear`/`getBlogs`, not the CMS-auth-gated checklist
  *upload* endpoints. Takes `setName` as a query param and does a plain
  `Query` (not `Scan`) against `Checklists` by its partition key,
  returning the raw `Items` array — both main-set and insert-set cards
  together, undifferentiated; the frontend groups and sorts them (see
  `FRONTEND.md`). `Access-Control-Allow-Origin: "*"` and
  `Cache-Control: public, max-age=1800`, matching
  `getCardSetsByYear`'s exact conventions (see the caching note in
  `API_ENDPOINTS.md`).
- **Why a new Lambda rather than reusing `saveChecklist`**: the site
  owner initially proposed reusing `saveChecklist` to also look up a
  matching checklist, to avoid standing up a new Lambda just for a read.
  That would have meant a write-oriented, CMS-auth-gated endpoint also
  serving public reads — the wrong shape for a page-load-time public
  fetch, and a needless mix of concerns. A small, public, read-only
  Lambda matching this site's existing "one Lambda per action" pattern
  was the better fit, and doesn't slow down the page (only fetched on
  demand when the modal is opened, not on initial page load).

## `Lambdas/searchPlayerName/` — hand-built in this repo

- **File**: `Lambdas/searchPlayerName/index.mjs`. No real dependency —
  inline-paste deployable, not zipped.
- **Dependencies** (`package.json`): none listed — only uses
  `@aws-sdk/client-dynamodb`/`@aws-sdk/lib-dynamodb`, which ship with
  the Lambda Node.js runtime.
- **What it does**: backs `playerSearch.html` — takes `?q=` (a player
  name or partial name, min 2 characters) and returns every set that
  player appears in across the whole `Checklists` table, grouped by
  `setName`, each with a working link back to that set's review (via a
  `Cards` lookup — see below).
- **Cards within a set are ordered main-before-insert, then by
  `sortIndex`** — the same field/convention `getChecklistBySetName`'s
  items carry (see `DATA_MODEL.md`'s Checklists table), not raw `Scan`
  order and not a sort on `cardNumberDisplay` itself, which is a display
  string ("T-20", "NNO") that doesn't sort numerically. An earlier
  version omitted `sortIndex` from the trimmed per-card object returned
  here, which left results in whatever order the `Scan` happened to
  return them in — visibly out of numeric order for any set with more
  than ~9 cards (e.g. "22" sorting after "203" as a string). Caught via
  a real Wayne Gretzky search — his large card count made the
  out-of-order results immediately obvious in a screenshot. Fixed by
  carrying `sortIndex` through and sorting each set's `cards` array
  before returning.
- **Full-table `Scan`, matched case-insensitively in code**: `Checklists`
  has no index on `playerName` (its only key is `setName`+`cardNumber`),
  so there's no way to `Query` it by player name — this does a full
  paginated `Scan`, checking `item.playerName.toLowerCase().includes(...)`
  in code rather than a DynamoDB `FilterExpression`, since `contains()`
  is case-sensitive and would give poor search UX. **This is genuinely
  expensive**: cost/latency scale with total `Checklists` table size on
  *every* search, not with the number of matches. It exhausted the
  table's provisioned RCU ceiling under light manual testing the day
  this was built — see `ARCHITECTURE.md`/`DATA_MODEL.md`'s billing-mode
  note; `Checklists` is now On-Demand specifically because of this. A
  GSI (or a stored lowercase mirror field) would be the real fix if this
  table grows much larger; not built yet, since it'd also mean
  backfilling every already-uploaded checklist.
- **`Cards` cross-reference for the review link**: for each distinct
  matching `setName`, a second, cheap `Query` (partition key, not a
  scan) against `Cards` gets `year`/`blogCat`, so the frontend can build
  a working `waxReviews.html` link. `pageName` (the third param that URL
  needs) isn't looked up here — it's a pure UI/nav concept derived from
  `blogCat`+`year`, computed client-side via `getPageNameForYear()` in
  `scripts/helper.js` instead of duplicating that mapping server-side
  too (see `FRONTEND.md`). A `setName` with zero matching `Cards` items
  still shows up in results, just without a link — see the `?audit=1`
  mode below for finding these before a user does.
- **`?audit=1` mode**: a data-integrity check, not part of the search
  feature itself — reuses the same full-`Scan` machinery to enumerate
  every distinct `setName` in `Checklists` and report which ones have no
  matching `Cards` item at all (`{ totalDistinctSetNames, linkedCount,
  unlinkedSetNames }`). Added 2026-08-24 specifically to verify the
  assumed 1:1 `Checklists`↔`Cards` relationship holds across every
  already-uploaded checklist, not just whichever ones a given search
  happens to touch — see `DATA_MODEL.md` for what it found and how the
  fix works (deleting every card row under the stale `setName`, not just
  one). No auth on this mode either — same public trust level as the
  rest of this endpoint, so it's not a secret admin flag, just an
  unlinked one.
- **CORS**: `Access-Control-Allow-Origin: "*"` (not restricted to
  `https://www.mellowjohnny.cc`) — deliberately matches
  `getChecklistBySetName`/`getCardSetsByYear`/`getBlogs`, the site's
  other fully-public, read-only, no-auth GET endpoints. Fine here for
  the same reasons: no cookies/auth in play (no CSRF/session risk), and
  it returns data that's already public elsewhere.

## `Lambdas/updateCardSet/` — pre-existing, with a real incident behind it

- **File**: `Lambdas/updateCardSet/index.mjs`. This is the "Update card set"
  Lambda (see `API_ENDPOINTS.md`) — backs `updateCardSet()` in
  `scripts/cmsCardSet.js`, used by `cms/setEdit.html`.
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
  (`updateCardSet()` in `cmsCardSet.js`) also had its own bug that masked
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

## `Lambdas/subscribeHandler/` — real, live, backs the CMS "Add Subscriber" modal

- **File**: `Lambdas/subscribeHandler/index.mjs`. No real dependency —
  only `@aws-sdk/client-dynamodb`, which ships with the Lambda Node.js
  runtime — so it's inline-paste deployable via the Console's code
  editor, not zipped, same as most of the other hand-built functions
  (see the intro above). Confirmed the file/directory naming here
  already matches the real deployed function exactly (`index.mjs`,
  directory named `subscribeHandler`) — worth calling out because the
  Confluence page this section's detail was backported from
  (2026-05-30, "AMP: Subscriber Management & Inbound SMS
  Documentation," predates this repo's doc workflow) uses stale labels
  in a couple of places — `subscribeHandler.mjs` as the filename, and
  `bulkUploadSubscribers.mjs` for what's actually
  `Lambdas/bulkSubscriberUpload/` in this repo — neither of which
  reflects the real checked-in source.
- **What it does**: backs the "Add Subscriber" modal on
  `cms/smsAdmin.html` (nav link `add subscriber...`) — adds one new
  subscriber directly, as opposed to `bulkSubscriberUpload`'s full
  truncate-and-reimport flow. Takes `{ phoneNumber, firstName }`,
  requires both fields non-empty (`firstName` missing/empty → 400 `"A
  name is required"`; `phoneNumber` missing → 400 `"A phone number is
  required"`), normalizes the phone number (see below; normalization
  failure → 400 `"Invalid phone number format"`), then writes a new
  item to the live `Subscribers` table (this Lambda always targets
  `Subscribers`, never `SubscribersTest` — there's no test-mode
  concept here the way `sendAlertHandler` has one) via `PutItemCommand`.
  A successful write returns `200` with
  `{ ok: true, message: "Subscription successful", phoneNumber, firstName }`.
  Despite the field being named `firstName` (kept for schema
  consistency with the bulk-import shape), it stores whatever full
  name string the admin typed into the modal's Name field — there's no
  separate last-name field anywhere in this flow.
- **Phone-number normalization** (`normalizePhoneNumber()` in the
  source, confirmed 2026-09-02 against `index.mjs`): strips spaces,
  hyphens, and parentheses first, then tries three patterns in order —
  (1) already 11 digits starting with `1` → prefix with `+` as-is
  (`19055550123` → `+19055550123`); (2) already `+` followed by 10–15
  digits → passed through unchanged (`+19055550123` → `+19055550123`);
  (3) exactly 10 digits → assumed US/Canada, prefixed with `+1`
  (`9055550123` → `+19055550123`, and a formatted input like
  `(905) 555-0123` normalizes the same way once punctuation is
  stripped). Anything that doesn't match any of the three returns
  `null` from the helper, which the handler turns into the 400
  `"Invalid phone number format"` response — e.g. a too-short number
  like `12345`. This is the exact same `normalizePhoneNumber()` logic
  (byte-for-byte, per the source read 2026-09-02) as
  `Lambdas/inboundSMSHandler/` uses on the `From` number of an inbound
  Twilio webhook — see that section below.
- **Duplicate-phone dedup / the 409**: the `PutItemCommand` carries
  `ConditionExpression: "attribute_not_exists(phoneNumber)"` — since
  `phoneNumber` (the normalized E.164 string) is the table's partition
  key, this makes the write atomically fail rather than silently
  overwrite an existing subscriber's record if the (normalized) number
  is already present. The handler catches specifically
  `err.name === "ConditionalCheckFailedException"` from that call and
  turns it into a `409` with
  `{ ok: false, error: "This phone number is already subscribed" }` —
  any other DynamoDB error falls through to the outer catch and a
  generic `500`. This 409 is exactly what the CMS's Add Subscriber
  modal frontend surfaces to the admin as *"This phone number is
  already subscribed"* — see `API_ENDPOINTS.md`'s "Add a single
  subscriber" entry, which documents the same contract from the
  frontend/caller side; that entry and this one should stay in sync if
  either changes.
- **DynamoDB record written** (full shape, all fields sent as typed
  DynamoDB attribute values since this uses `@aws-sdk/client-dynamodb`
  directly rather than the `lib-dynamodb` document client):
  ```json
  {
    "phoneNumber":    { "S": "+19055550123" },
    "firstName":      { "S": "Christian Reid" },
    "status":         { "S": "subscribed" },
    "source":         { "S": "web" },
    "optInTimestamp": { "N": "1234567890000" }
  }
  ```
  `source: "web"` is hardcoded — every subscriber added through this
  Lambda (i.e. through the CMS admin UI) is, by definition,
  web-initiated. This is the same `source` field `inboundSMSHandler`
  sets to `"mobile"` on a START-triggered resubscribe (see below) — the
  two values together give a simple opt-in audit trail (`web` = added
  by an admin via the CMS; `mobile` = subscriber self-managed via SMS
  reply) directly in the DynamoDB record, with no separate logging
  infrastructure needed.
- **Auth**: Cognito Authorizer required (`POST /subscribers`), same as
  every other cardStack/Autobus write endpoint — see `AUTH.md`.
- **CORS**: `Access-Control-Allow-Origin: https://www.mellowjohnny.cc`,
  same restricted-origin convention as `sendAlertHandler` and the other
  CMS-auth-gated POST endpoints.

## `Lambdas/inboundSMSHandler/` — real, live, previously completely undocumented

- **File**: `Lambdas/inboundSMSHandler/index.mjs`. Discovered 2026-08-15 while
  pulling in the full Lambda inventory — this was not referenced
  anywhere in `API_ENDPOINTS.md` before now, and isn't called from any
  frontend code in this repo (it can't be — see below). Confirmed
  2026-09-02 that this repo's directory/file naming (`inboundSMSHandler/index.mjs`
  — capital `SMS`, `.mjs` extension) matches the real deployed function;
  the Confluence page this section's detail was backported from (2026-05-30,
  "AMP: Subscriber Management & Inbound SMS Documentation") calls it
  `inboundSmsHandler.js` throughout (lowercase `Sms`, `.js` extension) —
  that's a stale/informal label from before the 2026-08-15 sync, not the
  real filename; don't go looking for a `.js` file.
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
- **Phone-number normalization**: uses the exact same
  `normalizePhoneNumber()` logic as `Lambdas/subscribeHandler/` (see
  above) on the inbound webhook's `From` field, before doing any
  DynamoDB lookup/update — so a reply from a number Twilio delivers in
  a slightly different format than what's stored still resolves to the
  same E.164 key. If normalization fails (returns `null`), the handler
  short-circuits with a `400` and TwiML body `"Invalid phone number"`
  before touching DynamoDB at all.
- **Exact TwiML reply text per keyword/case** (confirmed 2026-09-02 against
  `index.mjs`, matches the Confluence source doc exactly): the keyword is
  matched case-insensitively (the inbound `Body` is trimmed and
  uppercased before comparison).
  | Keyword(s) | Condition | DynamoDB update | Exact reply text |
  |---|---|---|---|
  | `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` | — | `#s` → `"unsubscribed"`, `unsubTimestamp` set, `#src` → `"mobile"` | `"You have been unsubscribed. Reply START to resubscribe."` |
  | `START`, `YES`, `UNSTOP` | phone number **found** in `Subscribers` | `#s` → `"subscribed"`, `optInTimestamp` set, `#src` → `"mobile"` | `"You are now subscribed again."` |
  | `START`, `YES`, `UNSTOP` | phone number **not found** in `Subscribers` (a stranger texting in) | none — no write at all | `"This is a private communication channel for Autobus Cycling Club members only. If you are a member please contact a Ride Leader to be added."` |
  | `HELP` | — | none | `"Reply START to subscribe, STOP to unsubscribe."` |
  | anything else (unrecognized text) | — | none | `"Command not recognized. Reply HELP for options."` |
  | (signature validation failure) | — | none — rejected before any DynamoDB access | `403`, plain (non-TwiML-templated) body `"Forbidden"` |
  Every TwiML body (other than the 403 case) is wrapped via a small
  `twiml()` helper in the source that renders
  `<Response><Message>...</Message></Response>` — a `200` with
  `Content-Type: application/xml`, not JSON, in every case including
  the "reject unknown START" and "unrecognized keyword" branches (i.e.
  those aren't error responses from Twilio's perspective — Twilio just
  gets told what to text back to the subscriber).
- **DynamoDB reserved-word aliasing**: both `status` and `source` are
  DynamoDB reserved words and can't be used as bare attribute names in
  an `UpdateExpression`, so the code aliases them via
  `ExpressionAttributeNames`: `status` → `#s`, `source` → `#src`. Both
  the STOP branch and the (existing-subscriber) START branch use the
  same `UpdateExpression` shape: `"SET #s = :<value>, <timestampField> = :ts, #src = :source"`
  — `unsubTimestamp` on the STOP path, `optInTimestamp` on the START
  path — with `#s`/`#src` resolved via the aliases and the actual
  values passed through `ExpressionAttributeValues`.
- **Security**: validates the inbound request's `X-Twilio-Signature`
  header via HMAC-SHA1 against `process.env.TWILIO_AUTH_TOKEN` (env
  var, not hardcoded — no secret in the source) using
  `crypto.timingSafeEqual`, correctly avoiding a timing side-channel.
  Requests that fail validation get a 403 before any DynamoDB access.
- **Twilio's own STOP/START handling can't be fully disabled — expect
  occasional double replies**: per the Confluence source doc (section
  "2.6 Twilio Duplicate Reply Note"), Twilio's platform has its own
  built-in keyword handling for STOP/START baked in ahead of this
  webhook, and that behavior cannot be fully turned off account-side.
  The practical effect: some phone numbers occasionally get **two**
  reply messages for the same STOP/START text — one auto-generated by
  Twilio itself, and a second one from this Lambda's own TwiML
  response. This is a known, accepted limitation (most visible on the
  "unknown number texts START" edge case) rather than a bug to chase
  down in this codebase — there's no code-side fix available for it,
  since the duplicate originates from Twilio's own platform-level
  keyword interception, upstream of this Lambda ever being invoked.
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
  `scripts/cmsCardSet.js`, documented in `CMS_GUIDE.md`) is purely
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
| `Lambdas/getBlogs/` | Get all blogs of a given type | Converted from PartiQL (`ExecuteStatementCommand`) to a plain `QueryCommand` on `blogType` (partition key) + `FilterExpression` on `published` on 2026-09-04 — matching the pattern every other blog/card-set Lambda already used, and sidestepping a documented AWS bug where PartiQL can fail to evaluate a **numeric** partition key correctly (see `listBlogsForUpdate`'s own header comment). |
| `Lambdas/getBlogByID/` | Get a single blog by ID | Converted 2026-09-04 from `Query` on `blogType` (partition key) + `FilterExpression` on `blogID` (which read every post of that type before filtering) to a direct `Query` against the `blogID-index` GSI — a real efficiency win, same category as `getCardSetByID`'s conversion. `blogType` is no longer sent by the frontend or required by the Lambda at all, since the lookup only ever needed `blogID`. See `DATA_MODEL.md`'s `Blogs` table. |
| `Lambdas/createBlogPost/` | Create blog post | Generates `blogID` via `crypto.randomUUID()`; `time` = `new Date().toISOString()` (the actual sort key). |
| `Lambdas/updateBlogPost/` | Update blog post | Plain `UpdateCommand` keyed on `blogType`+`time`. |
| `Lambdas/listBlogsForUpdate/` | Get all live blogs (for the edit picker) | **Note**: despite the doc's previous description, this does a full unfiltered `Scan` (`published = :p` where `:p = true`) with no `ProjectionExpression` — the response is full blog records under `{items: [...]}`, not just `{title, blogID, blogType}`. `API_ENDPOINTS.md` corrected 2026-08-15. |
| `Lambdas/getStagedBlogsForUpdate/` | Get all staged (draft) blogs | Same correction as above, mirrored: full `Scan` on `published = false`, full records returned, not a narrow projection. |
| `Lambdas/createCardPost/` | Create card set | Despite the AWS function name, this is the "create card set" Lambda (its own header comment calls itself `createCardSet Lambda Function`). Generates `setID` via `Math.random().toString(36)` (not a UUID). Hardcodes the S3 image URL prefix (`headerImg`/`footerImg`) server-side — see the CloudFront-migration discussion this repo's git history has around 2026-08-15 for why that matters if image hosting ever moves off direct S3 URLs. |
| `Lambdas/getCardSets/` | Get all live card sets (for the edit picker) | Queries the `blogStatus-year-index` GSI, `blogStatus = "OK"`. File has old commented-out `ProjectionExpression` variants left in as history of the 2026-08-14 `getStagedCardSets` projection bug fix (see below) — this one already returns full items. |
| `Lambdas/getStagedCardSets/` | Get all staged (draft) card sets | Same GSI, `blogStatus = "staged"`. This is the Lambda whose `ProjectionExpression` bug (only requesting `setName, setID`, silently dropping `blogCat`/`year`) was found and fixed on 2026-08-14 — see `API_ENDPOINTS.md` for the full story. The fixed projection requests `setName, setID, blogCat, year`; `year` is aliased in the expression (e.g. `#y`) since it's a DynamoDB reserved word. |
| `Lambdas/getCardSetByID/` | Get a single card set by ID | Converted from PartiQL (`SELECT * FROM Cards WHERE setID=?`, which forced a full-table Scan since `setID` isn't the table's key) to a `QueryCommand` against the `setID-index` GSI on 2026-09-04 — a genuine performance win, not just a style change; see `DATA_MODEL.md`'s `Cards` GSI table. |
| `Lambdas/getCardSetsByYear/` | Get card sets by year | Queries the `blogCat-year-index` GSI. Returns `Cache-Control: public, max-age=1800`; its own comment says "CloudFront cache" but no CloudFront actually sits in front of it (see `API_ENDPOINTS.md`'s caching note) — today this header is browser-only. |
| `Lambdas/cmsImageUploader/` | Get S3 upload URL (presigned PUT) | `getSignedUrl()` for a `PutObjectCommand`, 300s expiry, sets `CacheControl: public, max-age=31536000, immutable` on the eventual S3 object. |
| `Lambdas/cmsImagePicker/` | List images in the bucket | `ListObjectsV2Command` on the whole bucket, no prefix filter server-side (filtering happens client-side in `cmsImageBrowser.js`). |
| `Lambdas/bulkSubscriberUpload/` | Bulk import subscribers | Truncates the target table (`process.env.TABLE_NAME` — not hardcoded to `Subscribers`/`SubscribersTest`, so which one it hits depends on this Lambda's environment config) via paginated `Scan` + chunked `BatchWriteItem` deletes, then bulk-imports the new list the same way, with exponential-backoff retry on unprocessed items. |

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
- **`Lambda Functions/getCardSets/getCardSet_FUTURE.js`**: queries a `setID-index` GSI on `Cards` by a **hardcoded** `setID` — this prototype had the right idea. **Resolved 2026-09-04**: the `setID-index` GSI is real and live (confirmed via the AWS Console), and the deployed `Lambdas/getCardSetByID/index.mjs` — which had been using PartiQL instead, not querying the GSI at all — was rewritten to query it directly. See `DATA_MODEL.md`'s `Cards` GSI table.
