# API Endpoints

Every endpoint below was found by grepping the frontend `scripts/*.js`
files for `fetch(...)` calls. Each one is its own API Gateway REST API
(own subdomain), fronting its own Lambda — see `ARCHITECTURE.md`. As of
2026-08-15, every one of these Lambdas' source is checked into this
repo (see `LAMBDA_FUNCTIONS.md`) — the **Lambda** field below names the
actual directory. One exception: `Lambdas/inboundSMSHandler/` is a real,
checked-in Lambda but isn't listed as an endpoint here at all, since
it's a Twilio-to-us webhook, not something this frontend calls — see
`LAMBDA_FUNCTIONS.md` for it instead.

All URLs are `https://{id}.execute-api.us-east-2.amazonaws.com/{stage}`.

## Public site — read APIs

**Throttling**: the original three endpoints in this section — the
ones reachable with no auth at all — have per-stage request throttling
set on their `dev` stage in API Gateway: rate 10 req/s, burst 20. This
is a blunt, account-level-default-is-way-too-permissive mitigation
against basic scripted abuse, not a precise traffic-shaping tool; a
real visitor loading the page normally never gets near it. A request
over the limit gets back `429 Too Many Requests`. Every other endpoint
on the site (CMS reads/writes, SMS) sits behind Cognito instead (see
`AUTH.md`), so throttling matters less there and hasn't been added.
"Get checklist by set name" and "Search players by name" (both added
later, below) are the same public, no-auth trust level as these three,
but their own throttling config hasn't been separately confirmed —
check API Gateway directly if that matters. Worth noting for "Search
players by name" specifically: its `Scan`-per-request design (see
`LAMBDA_FUNCTIONS.md`) is far more expensive per call than any other
endpoint in this section, so it's the one most worth actually confirming
has throttling if traffic ever becomes a concern.

**Caching (added 2026-08-14)**: the highest-traffic endpoints in
this section (this one, "Get card sets by year", "Get checklist by set
name", and "Search players by name") return a
`Cache-Control: public, max-age=...` header — a free, browser-only
cache with no CloudFront in front of API Gateway, so it only helps a
single visitor's repeat requests within the TTL, not cross-visitor
Lambda/DynamoDB load. Every other endpoint on the site (all CMS
reads/writes, voting, SMS) deliberately has no caching header — the
CMS picker pages in particular need to reflect fresh state immediately
after a create/update/delete redirects back to them (see
`CMS_GUIDE.md`'s "Redirect on success"), so don't add caching to those
without changing that expectation first.

### Get all blogs of a given type
- **URL**: `https://qeb63ean2e.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `blogType` (e.g. `1`, `3`, `5`, `99`)
- **Called from**: `fetchBlogs()` in `scripts/blogs.js` (used by `index.html`, `tech.html`)
- **Response**: JSON array of blog objects directly (`postBody`, `author`, `time`, `title`, `img`, `imgCap`) — *not* wrapped in `{Items: [...]}` the way raw DynamoDB `scan`/`query` results are; the Lambda uses PartiQL (`ExecuteStatementCommand`) and unmarshalls before returning. `Cache-Control: public, max-age=600` (10 min) on the success response only — added 2026-08-14, the error responses (400/500) intentionally have no caching header.
- **Lambda**: `Lambdas/getBlogs/` (source in this repo — see `LAMBDA_FUNCTIONS.md`).

### Get blog intro text by type
- **URL**: `https://0t14dphgwb.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `blogType`
- **Called from**: nothing — `fetchBlogIntroByType()`, the only caller, was dead code (never invoked) and was removed from `scripts/blogs.js` on 2026-08-12. Intro text is rendered client-side by `renderBlogIntro()`/`renderCardIntro()` instead (hardcoded copy per type).
- **Response**: `{ Items: [{ introText }] }`
- **Lambda**: `getBlogIntro` — confirmed orphaned/dead, source briefly checked into this repo on 2026-08-15 then removed once confirmed unused (see `LAMBDA_FUNCTIONS.md`). Read from a `BlogIntro` table via PartiQL — see `DATA_MODEL.md`.

### Get card sets by year
- **URL**: `https://a92dwyl3ic.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `year`, `blogCat`
- **Called from**: `fetchCardSetsByYear()` in `scripts/wax.js` (used by `waxReviews.html`)
- **Response**: JSON array directly (each item has `postBody`, `year`, `mfg`, `size`, `subsets`, `stars`, `formats`, `headerImg`, `headerImgName`, `footerImg`, `footerImgName`, `setName`, `author`, `now`). `Cache-Control: public, max-age=1800` (30 min) on the success response — the Lambda's own comment says "CloudFront cache," but no CloudFront actually sits in front of this endpoint (see the caching note above), so today this is browser-only. Bumped from an original `max-age=300` to `1800` on 2026-08-14, since a published set review essentially never changes and votes are tracked via the separate `castVoteHandler` endpoint, not this one.
- **Lambda**: `Lambdas/getCardSetsByYear/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Queries the `blogCat-year-index` GSI, filtered to `blogStatus = "OK"`.

### Cast a vote on a card set
- **URL**: `https://lo07upgip8.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ setName, year, voteType }` — `voteType` is `"up"` or `"down"`. `setName`+`year` together are the `Cards` table's actual partition/sort key.
- **Called from**: `castVote()` in `scripts/wax.js` (used by `waxReviews.html`)
- **Response**: `{ upvotes }` or `{ downvotes }` (whichever was incremented) on success; `{ error }` with a 400 (missing/invalid fields) or 404 (no matching card set) on failure.
- **Lambda**: `Lambdas/castVoteHandler/` — source *is* version-controlled in this repo (see `CLAUDE.md`), unlike most other Lambdas. Does an atomic DynamoDB `UpdateItem` with `ADD`, guarded by `ConditionExpression: attribute_exists(setName)` so a bad `setName`/`year` pair 404s instead of silently creating a garbage item.

### Get checklist by set name
- **URL**: `https://xbizlwvad5.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `setName`
- **Called from**: `openChecklistModal()` in `scripts/wax.js` (used by `waxReviews.html`'s "Checklist" link/modal — see `FRONTEND.md`)
- **Response**: raw JSON array of every `Checklists` item for that `setName` (main-set and insert-set cards together, undifferentiated) — `Cache-Control: public, max-age=1800`, same convention as "Get card sets by year" above.
- **Lambda**: `Lambdas/getChecklistBySetName/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). `Query`, not `Scan`, on `Checklists`' partition key. Public, no Cognito Authorizer — built later than the other three endpoints in this section (Step 2 of the checklist feature), but the same public trust level.

### Search players by name
- **URL**: `https://evlsyozjb0.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `q` (a player name or partial name, minimum 2 characters) **or** `audit=1` — mutually exclusive modes, see below.
- **Called from**: `scripts/playerSearch.js` (used by `playerSearch.html`)
- **Response** (`q` mode): `{ query, results: [{ setName, year, blogCat, cards: [{ cardNumberDisplay, playerName, notes, type, insertSetName }] }] }` — grouped by set, sorted alphabetically by `setName`. `year`/`blogCat` are `null` when no matching `Cards` item was found for that `setName` (the frontend shows the set name as plain text instead of a link in that case). `{ error }` with a 400 if `q` is missing or under 2 characters.
- **Response** (`audit=1` mode): `{ totalDistinctSetNames, linkedCount, unlinkedSetNames }` — a data-integrity check, not part of the search feature itself; enumerates every distinct `setName` in `Checklists` and reports which have no matching `Cards` item. See `DATA_MODEL.md`'s "setName ↔ Cards.setName 1:1 assumption" note.
- **Lambda**: `Lambdas/searchPlayerName/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Full paginated `Scan` of `Checklists` (no index on `playerName`), matched case-insensitively in code, plus a per-matched-set `Query` against `Cards`. Public, no Cognito Authorizer — same trust level as "Get checklist by set name" above; `Access-Control-Allow-Origin: "*"`.

## CMS — blog authoring

### Create blog post
- **URL**: `https://s4ge5t9w06.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ published, title, imgName, imgCap, author, postBody, blogType }`
- **Called from**: `createBlogPost()` in `scripts/cmsBlog.js` (used by `cms/createBlogPost.html`)
- **Response**: `{ message }`
- **Note**: this exact URL is the worked example in `Documentation/Creating A New Lambda.txt`, so this is likely the very first endpoint built for the site.
- **No `Authorization` header sent** — see `AUTH.md`.
- **Lambda**: `Lambdas/createBlogPost/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Generates `blogID` via `crypto.randomUUID()`; `time` (the actual DynamoDB sort key) is set server-side to `new Date().toISOString()`.

### Update blog post
- **URL**: `https://836pk40tsl.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: PUT
- **Body**: `{ blogID, title, img, imgCap, published, blogType, time, postBody }`
- **Called from**: `updateBlogPost()` in `scripts/cmsBlog.js` (used by `cms/blogEdit.html`)
- **Response**: `{ message }`
- **Lambda**: `Lambdas/updateBlogPost/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Plain `UpdateCommand` keyed on `blogType`+`time`.

### Delete blog post
- **URL**: `https://j9dhm7nwhk.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: DELETE
- **Body**: `{ blogID, blogType, time }`
- **Called from**: `deleteBlogPost()` in `scripts/cmsBlog.js` (used by `cms/blogEdit.html`, confirmed with the user via `cmsConfirm()` first — see `CMS_GUIDE.md`'s "CMS alert / confirm modals" section)
- **Response**: `{ message }` on success, `{ error }` on failure (404 if the `blogID`/`blogType`/`time` combination doesn't match an existing item, since the Lambda's `DeleteItemCommand` uses `blogType`+`time` as the key with a `ConditionExpression` requiring `blogID` to also match as a safety check)
- **Lambda**: `Lambdas/deleteBlogHandler/` (source in this repo — see `LAMBDA_FUNCTIONS.md`)

### Get all live blogs (for the edit picker)
- **URL**: `https://pqf303gfq6.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `getBlogsForUpdate()` in `scripts/cmsBlog.js` (used by `cms/pickBlog.html`)
- **Response**: `{ items: [...full blog records...] }`. **Corrected 2026-08-15**: previously documented as `{ blogs: [{ title, blogID, blogType }] }`, a narrow projection — the real Lambda (`Lambdas/listBlogsForUpdate/`) does a full unfiltered `Scan` on `Blogs` (`published = true`) with no `ProjectionExpression` at all, so every field comes back, not just `title`/`blogID`/`blogType`. The frontend just doesn't use the extra fields.
- **Lambda**: `Lambdas/listBlogsForUpdate/` (source in this repo — note the AWS function name doesn't match the frontend's `getBlogsForUpdate()` caller name; see `LAMBDA_FUNCTIONS.md`).

### Get all staged (draft) blogs
- **URL**: `https://sh8girwnxg.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `getStagedBlogsForUpdate()` in `scripts/cmsBlog.js` (used by `cms/pickBlog.html`)
- **Response**: `{ items: [...full blog records...] }`. **Corrected 2026-08-15**: same story as "Get all live blogs" above — full `Scan` (`published = false`), full records, not a narrow projection.
- **Lambda**: `Lambdas/getStagedBlogsForUpdate/` (source in this repo — see `LAMBDA_FUNCTIONS.md`).

### Get a single blog by ID
- **URL**: `https://gcd40hir88.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `blogID`, `blogType`
- **Called from**: `fetchBlogByID()` in `scripts/cmsBlog.js` (used by `cms/blogEdit.html`)
- **Response**: `{ item: { postBody, published, blogType, time, title, img, imgCap, ... } }`
- **Lambda**: `Lambdas/getBlogByID/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). `Query` on `blogType` (partition key) + `FilterExpression` on `blogID` (404 if no match).

## CMS — card set authoring

### Create card set
- **URL**: `https://05uss9ffij.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ blogStatus, seoPageTitle, seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets, stars, formats, year, postBody, mfg, headerImgName, footerImgName, blogCat }`
- **Called from**: `createCardSet()` in `scripts/cmsCardSet.js` (used by `cms/createCardSet.html`)
- **Response**: `{ message }` on success; `{ error, details }` on failure (frontend reads `response.ok` to distinguish).
- **Lambda**: `Lambdas/createCardPost/` (source in this repo — note the AWS function name doesn't match the frontend's `createCardSet()` caller name; its own header comment calls itself `createCardSet Lambda Function`, see `LAMBDA_FUNCTIONS.md`). Generates `setID` via `Math.random().toString(36)` (not a UUID). Hardcodes the S3 image URL prefix (`headerImg`/`footerImg`) server-side — worth knowing if image hosting ever moves off direct S3 URLs (a CloudFront-fronted image bucket was explored and shelved around 2026-08-15).

### Update card set
- **URL**: `https://bb8yehibjb.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: PUT
- **Body**: `{ blogStatus, seoPageTitle, seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets, stars, formats, year, postBody, headerImgName, footerImgName, mfg }`
- **Called from**: `updateCardSet()` in `scripts/cmsCardSet.js` (used by `cms/setEdit.html`)
- **Response**: accepted in several shapes — a plain string, `{ message }`, or `{ body }` (itself either a JSON string to parse or plain text). See `updateCardSet()` in `scripts/cmsCardSet.js` for the exact unwrapping logic.
- **Lambda**: `Lambdas/updateCardSet/` (source in this repo — see `LAMBDA_FUNCTIONS.md` for a real incident this Lambda caused on 2026-08-15: an unrelated CloudFront cache-invalidation side effect, sharing a try/catch with the actual DynamoDB update, started throwing 500s on every save after its target distribution was deleted — fixed by removing that side effect entirely).

### Delete card set
- **URL**: `https://8q5ly5ixej.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: DELETE
- **Body**: `{ setID, setName, year }`
- **Called from**: `deleteCardSet()` in `scripts/cmsCardSet.js` (used by `cms/setEdit.html`, confirmed with the user via `cmsConfirm()` first — see `CMS_GUIDE.md`'s "CMS alert / confirm modals" section)
- **Response**: `{ message }` on success, `{ error }` on failure (404 if the `setID`/`setName`/`year` combination doesn't match an existing item, since the Lambda's `DeleteItemCommand` uses `setName`+`year` as the key with a `ConditionExpression` requiring `setID` to also match as a safety check)
- **Lambda**: `Lambdas/deleteCardSetHandler/` (source in this repo — see `LAMBDA_FUNCTIONS.md`)

### Get all live card sets (for the edit picker)
- **URL**: `https://tx7romovbd.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `fetchAllCardSets()` in `scripts/cmsCardSet.js` (used by `cms/pickCardSet.html`)
- **Response**: tolerant of several shapes — a raw array, `{ body: "<json array>" }`, `{ body: [...] }`, or `{ Items: [...] }`.
- **Lambda**: `Lambdas/getCardSets/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Queries the `blogStatus-year-index` GSI, `blogStatus = "OK"`, no projection (full items).

### Get all staged (draft) card sets
- **URL**: `https://ecy21wzgkl.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `fetchAllStagedCardSets()` in `scripts/cmsCardSet.js` (used by `cms/pickCardSet.html`)
- **Response**: same tolerant unwrapping as above; items include `setID`, `setName`, `blogCat`, `year`. **Fixed 2026-08-14**: the `getStagedCardSets` Lambda's `ProjectionExpression` originally only requested `setName, setID` from the `blogStatus-year-index` GSI, so `blogCat`/`year` came back `undefined` on every item — this silently broke both category grouping (everything fell back to "Other") and sort order (`year` comparisons were `NaN`). Fixed by expanding the projection to `setName, setID, blogCat, #yr` with `year` aliased via `ExpressionAttributeNames` (`year` is a DynamoDB reserved word, can't appear unescaped in a `ProjectionExpression`). `fetchAllStagedCardSets()` in `scripts/cmsCardSet.js` also keeps a defensive fallback — a staged set with no `blogCat` but a `mfg` value is treated as `"reg"` — kept intentionally in case a record is ever created directly in DynamoDB without going through the CMS form.
- **Lambda**: `Lambdas/getStagedCardSets/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Same GSI as `Lambdas/getCardSets/`, filtered to `blogStatus = "staged"`.

### Get a single card set by ID
- **URL**: `https://733bwunxq6.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `setID`
- **Called from**: `fetchCardSetByID()` in `scripts/cmsCardSet.js` (used by `cms/setEdit.html`)
- **Response**: array of one item (again tolerant of `{items:[...]}` / raw array / `{body:...}` / `{Items:[...]}`), containing `blogStatus, seoPageTitle, seoMetaDesc, seoURLSlug, seoTags, author, postBody, year, mfg, size, subsets, stars, formats, setName, headerImgName, footerImgName`.
- **Lambda**: `Lambdas/getCardSetByID/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). PartiQL `SELECT * FROM Cards WHERE setID=?`.

## CMS — checklist upload

Both endpoints back `cms/uploadChecklist.html` (`scripts/checklistUpload.js`)
— upload a checklist PDF, review/correct the parsed result, then save.
See `DATA_MODEL.md`'s `Checklists` table and `LAMBDA_FUNCTIONS.md` for
the full picture, including why `parseChecklistPdf` needs the .zip
deploy treatment (a real `pdf-parse` dependency) while `saveChecklist`
doesn't.

### Parse a checklist PDF
- **URL**: `https://uurjs2v7i0.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ fileName, fileContent }` — `fileContent` is the PDF, base64-encoded client-side via `FileReader`. No S3 round-trip; checklist PDFs are small enough (a few hundred KB) to send directly in the request body.
- **Called from**: `parseChecklistPdf()` in `scripts/checklistUpload.js`
- **Response**: `{ setName, insertSetName, cards: [{ cardNumber, playerName, notes }], skippedDuplicates }` on success. `setName`/`insertSetName` are derived from the filename unless overridden (a comma splits base set name from insert set name; `insertSetName` is `""` for a main-set upload) — see `LAMBDA_FUNCTIONS.md` for the exact filename convention, including the trailing-sport-name strip. `skippedDuplicates` lists any duplicate-numbered lines the parser dropped (kept the first occurrence). Never writes to DynamoDB itself — purely parse-and-return, so a bad parse can be corrected in the browser before anything is saved.
- **Lambda**: `Lambdas/parseChecklistPdf/` (source in this repo — see `LAMBDA_FUNCTIONS.md`).

### Save a reviewed checklist
- **URL**: `https://w46hwbexed.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ setName, insertSetName, cards: [{ cardNumber, playerName, notes }] }` — the parsed result, after any hand-editing in the review table (add/delete rows, fix a name, etc). `insertSetName` is optional/empty for a main-set save.
- **Called from**: `saveChecklist()` in `scripts/checklistUpload.js`
- **Response**: `{ message }` on success (e.g. `"Replaced 0 existing card(s) with 264 new card(s) for \"...\" (main set)."`) — the message can also carry a `Warning:` suffix if the (non-fatal) Cards-table linking step failed or found no matching set, so the checklist itself still saved but won't show a checklist link on `waxReviews.html` yet. `{ error }` on a validation failure (400 — missing fields, or two cards sharing the same card number within this group; see `DATA_MODEL.md`'s "Sort-key collision guard") or a partial DynamoDB failure after retries (502).
- **Lambda**: `Lambdas/saveChecklist/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Full-replace semantics, scoped to the exact group (main set, or one specific insert set) being saved — deletes every existing item in that group before writing the new set. Also flips `hasChecklist: true` on the matching `Cards` item — see `DATA_MODEL.md`.

## CMS — image management (S3)

### Get S3 upload URL (presigned PUT)
- **URL**: `https://k95rdenpn5.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ fileName, directory, contentType }` — `directory` is `"img/cards/"` or `"img/blog/"` depending on which image picker triggered the upload.
- **Called from**: `uploadNewImage()` in `scripts/cmsImageBrowser.js` (used by both create/edit forms' "Browse" image modal)
- **Response**: `{ uploadUrl, finalUrl }` — `uploadUrl` is a presigned S3 PUT URL the browser then uploads the raw file bytes to directly (bypassing this Lambda for the actual file transfer); `finalUrl` is the resulting public S3 URL.
- **Lambda**: `Lambdas/cmsImageUploader/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). 300s presign expiry; sets `CacheControl: public, max-age=31536000, immutable` on the eventual S3 object itself (unrelated to the API response's own caching, if any).

### List images in the bucket
- **URL**: `https://y3d5n8hq61.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `fetchImageList()` / `fetchBlogImageList()` in `scripts/cmsImageBrowser.js` (powers the image-browser modal on both create/edit forms)
- **Response**: `{ files: [...] }` — full flat list of every object key in the bucket; the frontend filters client-side by prefix (`img/cards/` vs `img/blog/`).
- **Lambda**: `Lambdas/cmsImagePicker/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). `ListObjectsV2Command` on the whole bucket, no server-side prefix filter.

## Autobus Messaging Platform (SMS)

All three of these send an `Authorization` header carrying the raw
Cognito ID token from `getAuthToken()` (`scripts/auth.js`) — see
`AUTH.md`. These are also the only endpoints on the whole site that do
so.

### Send broadcast
- **URL**: `https://yzivv3xuw2.execute-api.us-east-2.amazonaws.com/prod/admin/send`
- **Method**: POST
- **Body**: `{ message, mode }` — `mode` is `"test"` or `"live"`. Per Confluence's "AMP SMS - Platform Core" page (the pre-repo doc for this Lambda), if `mode` is missing or anything other than `"live"` the Lambda defaults to `"test"` — a deliberate safeguard against an accidental live send, not just the frontend's Test Mode checkbox default.
- **Called from**: `sendBroadcast()` in `scripts/adminSMS.js` (used by `cms/smsAdmin.html`)
- **Response**: `{ results: [{ phone, firstName, status: "SUCCESS"|"FAILED", error }], mode }`
- **Lambda**: `Lambdas/sendAlertHandler/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Per the same Confluence page: `mode: "live"` scans `Subscribers`, `mode: "test"` scans `SubscribersTest`, and either way only records where `status = "subscribed"` are included. Sends are sequential (one SMS at a time, not parallel) with each send wrapped in its own try/catch, so one recipient's failure is recorded as `FAILED` in the `results` array without aborting the rest of the broadcast. The Lambda's configured timeout is 1 minute 3 seconds specifically to allow for Twilio's per-message send time across the whole batch.

### Bulk import subscribers
- **URL**: `https://05b6ofo7i1.execute-api.us-east-2.amazonaws.com/prod/subscribers/bulk-upload`
- **Method**: POST
- **Body**: a JSON array of subscriber records, already in DynamoDB typed-JSON format (`{ phoneNumber: { S: "..." }, ... }`), per the in-app help text in `cms/smsAdmin.html`.
- **Called from**: `uploadBtn` click handler in `scripts/adminSMS.js`
- **Response**: `{ deletedCount, importedCount }` on success. **Destructive**: this call deletes *all* existing subscribers before importing the new list (confirmed with the user via `cmsConfirm()` first — see `CMS_GUIDE.md`'s "CMS alert / confirm modals" section).
- **Lambda**: `Lambdas/bulkSubscriberUpload/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Which table it truncates/imports into is set via `process.env.TABLE_NAME`, not hardcoded to `Subscribers`/`SubscribersTest` in the source — check the Lambda's environment config in the Console to confirm which one it currently targets.

### Add a single subscriber
- **URL**: `https://05b6ofo7i1.execute-api.us-east-2.amazonaws.com/prod/subscribers`
- **Method**: POST
- **Body**: `{ firstName, phoneNumber }`. Per Confluence's "AMP: Subscriber Management & Inbound SMS Documentation" page, `phoneNumber` is accepted in several common formats — bare 10-digit (`9055550123`), 11-digit with leading `1` (`19055550123`), already-E.164 (`+19055550123`), or human-formatted (`(905) 555-0123`) — and normalized server-side to E.164; an unparseable number is rejected with `400`.
- **Called from**: `addSubscriberSaveBtn` click handler in `scripts/adminSMS.js`
- **Response**: 2xx on success; `{ error }` on failure (e.g. duplicate phone number, per the in-app copy). Per the same Confluence page's response-codes table, the exact shapes are: `200` → `{ ok: true, message, phoneNumber, firstName }`; `400` → `{ ok: false, error }`, either for a missing/invalid phone number or for a missing name (`error: "A name is required"`); `409` → `{ ok: false, error: "This phone number is already subscribed" }` on duplicate; `500` → `{ ok: false, error: "Internal server error" }` on unexpected failure.
- **Lambda**: `Lambdas/subscribeHandler/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). `ConditionExpression: attribute_not_exists(phoneNumber)` (409 on duplicate); sets `source: "web"` on the new record. Per Confluence, the full DynamoDB item written is `{ phoneNumber, firstName, status: "subscribed", source: "web", optInTimestamp }` — `firstName` here stores the full name as entered (the field is named `firstName` only for schema consistency with the bulk-import path, per that page's design-decisions note).

### Inbound SMS webhook (not called from this frontend)
- **URL**: not confirmed — see the note below.
- **Method**: POST (Twilio's webhook convention)
- **Called from**: nothing in this repo. This is the Twilio-to-us direction: the URL is configured directly in the Twilio Console as the phone number's inbound-message webhook, and Twilio calls it when a subscriber texts the number back. Discovered 2026-08-15 via the full Lambda inventory sync, not via the usual "grep frontend `fetch()` calls" method this whole document was built with — which is also why the URL isn't confirmed here; this codebase's AWS access covers Lambda source but not API Gateway config.
- **Body**: Twilio's standard inbound-SMS webhook form-encoded payload (`From`, `Body`, etc.), validated via `X-Twilio-Signature`.
- **Response**: TwiML XML, not JSON.
- **Lambda**: `Lambdas/inboundSMSHandler/` (source in this repo — see `LAMBDA_FUNCTIONS.md`). Handles `STOP`/`START`/`HELP` and related keywords for SMS opt-out/opt-in compliance.
