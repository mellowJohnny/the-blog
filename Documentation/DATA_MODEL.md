# Data Model (DynamoDB)

None of this was read directly from the DynamoDB console — it's
reverse-engineered from the fields the frontend sends/reads and from
the query/scan code in `Lambda Functions/`. Field types are best
guesses. Verify against the actual table definitions when you get
console access back.

## `Blogs` table

Holds every blog post across all blog "types" (tech, Mach-E, Raspberry
Pi, SYNC updates, hockey cards, and the homepage intro/tagline
entries). One flat table for all blog content, distinguished by
`blogType`.

**Key schema (confirmed against the DynamoDB console, 2026-08-14)**:
partition key `blogType` (Number), sort key `time` (String). `blogID`
is a regular (non-key) attribute — it's the human-facing identifier
used by `getBlogByID`'s lookup, but `updateBlogPost()` and (the new)
`deleteBlogPost()` both operate on `blogType`+`time` under the hood,
which is why every blog-editing call in the CMS always carries `time`
around alongside `blogID`, even though it's just displayed read-only
in a disabled form field.

| Field | Type | Notes |
|---|---|---|
| `blogID` | String | The item's human-facing identifier — used as the lookup key by `getBlogByID` (see `API_ENDPOINTS.md`), but is *not* the DynamoDB key (see above). Early sample data (`Documentation/BlogArchive.txt`) used a millisecond timestamp string as `id`, e.g. `"1640119360299"` — `blogID` is likely the same idea, possibly renamed. |
| `blogType` | Number | Partition key. `1`=Tech, `2`=Hockey Cards (per the `createBlogPost.html` dropdown, though card content actually goes to the `Cards` table, not `Blogs`), `3`=Mach-E, `4`=SYNC Updates, `5`=Raspberry Pi, `99`=Home Page. See `BLOG_TYPE_LABELS` in `scripts/cms.js`. |
| `title` | String | Post title. |
| `author` | String | Free text; CMS forms currently only offer "Christian Couillard". |
| `postBody` | String | HTML content, authored via TinyMCE. |
| `img` | String | Full image URL (or `"none"`) — field is called `imgName` in the CMS form/create payload but stored/read back as `img` (see `updateBlogPost()` / `populateBlog()` in `scripts/cms.js` — this rename is a real inconsistency worth knowing about, not a mistake in this doc). |
| `imgCap` | String | Image caption, rendered under the image. |
| `time` | String (ISO 8601) | Sort key. Creation timestamp, used for sort order (`getSortOrder()` in `scripts/helper.js`) and displayed via `fixDate()`. |
| `published` | Boolean | `true` = live, `false` = staged/draft. Drives the "live blogs" vs "staged blogs" split in `cms/pickBlog.html`. |

The two oldest prototype Lambdas in the repo (`Lambda Functions/getBlogs/getBlogs.js` and its sibling `getTechBlogs.js`) query this table with `KeyConditionExpression` on `blogType` alone — consistent with `blogType` being the confirmed partition key above (a partition-key-only query is normal; it just doesn't narrow to a single item without also supplying the sort key). Treat those two files as historical prototypes regardless — they predate the current CMS's `blogID`-based lookups.

## `Cards` table

Holds every hockey card set review.

**Confirmed key schema** (per the site owner, resolving the "confirm which
GSI pattern is live" question this doc used to raise): partition key
`setName` (String), sort key `year` (Number). `setID` below is a separate,
non-key attribute used only by the `setID-index` GSI lookup path.

| Field | Type | Notes |
|---|---|---|
| `setID` | String | Randomly generated (`Math.random().toString(36)`) in `Lambda Functions/createCardSet/createCardPost.js`; used as the lookup key by `getCardSetByID`. A `setID-index` GSI is referenced in `Lambda Functions/getCardSets/getCardSet_FUTURE.js`. |
| `upvotes` / `downvotes` | Number | Added for the thumbs up/down voting feature (`Lambdas/castVoteHandler/`). Not present on older items until the first vote is cast — DynamoDB creates the attribute on first `ADD`, no migration needed. |
| `setName` | String | e.g. `"1991-92 Upper Deck Hockey"`. |
| `year` | Number | Release year, e.g. `1991`. Drives the year-picker on `waxReviews.html` (`renderSetPicker()` in `scripts/helper.js`). |
| `mfg` | String | Manufacturer — one of O-Pee-Chee, Topps, Upper Deck, Score, Pro Set, Fleer, Leaf, Pinnacle, Pacific (per the `createCardSet.html` dropdown). |
| `size` | String/Number | Set size, e.g. "660 cards". |
| `subsets` | String | Free-text description of inserts/subsets. |
| `stars` | Number (1-5) | "Hella Rating" — rendered as star emoji, sortable via `getSortOrder()` (`scripts/helper.js`; consolidated from the formerly-separate `cardSetSorter()` on 2026-08-12). |
| `formats` | String | e.g. "Wax, Rack, Cello". |
| `blogCat` | String | `"reg"` (regular O-Pee-Chee/junk-wax sets), `"tims"` (Tim Hortons), `"mcd"` (McDonald's). Drives which nav/year-picker range applies (`renderSetPicker()`, `categoryRanges` in `scripts/helper.js`). |
| `blogStatus` / `status` | String | `"OK"` = live, `"staged"` = draft. Note the field is named `status` in the older prototype Lambdas (`getCardSets.js`, which queries a `status-year-index` GSI) but `blogStatus` in the current CMS create/update forms — likely the same field, renamed at some point; confirm which name the live table actually uses. |
| `postBody` | String | HTML review content, authored via TinyMCE. |
| `headerImg` / `headerImgName` | String | Header image. The create-Lambda prototype (`createCardPost.js`) only ever writes the bucket *prefix* (`.../img/cards/`) into `headerImg`/`footerImg`, while the current CMS form collects a filename into `headerImgName`/`footerImgName` and the frontend concatenates prefix + filename at render time (`displayCardSet()` in `scripts/wax.js`) — another sign the live Lambda has evolved past this prototype. |
| `footerImg` / `footerImgName` | String | Footer/"winners" image, same pattern as above. |
| `author` | String | |
| `seoPageTitle`, `seoMetaDesc`, `seoURLSlug`, `seoTags` | String | SEO metadata fields added to the create/edit forms; not currently read by any public page's `<head>` — likely intended for a future SEO pass. |
| `now` / `date` | String | Passed through as `item.now` in `wax.js`'s `renderCardSetPage()` and used as the review's displayed date. |
| `hasChecklist` | Boolean | Set by `saveChecklist` (see the `Checklists` table below) the first time a checklist is successfully uploaded for this set's exact `setName` — not present at all until then. Drives the "Checklist" link on `waxReviews.html` (`displayCardSet()` in `scripts/wax.js`), which opens a modal fetching and displaying the full checklist — see `FRONTEND.md`. Not written by any CMS create/update form directly. |

### `cmsContent/` directory

`cmsContent/*.html` files (e.g. `93_94_Proset.html`) look like a static,
file-based archive of card set review bodies — plain HTML snippets, no
script anywhere in the repo reads them at runtime. Likely a backup/seed
of what's now stored as `postBody` in DynamoDB, or leftover from before
the CMS existed.

`cmsContent/cardSetChecklist/*.json` (e.g. `1990-91_OPC_Prem.json`) is a
different, more granular format — full card-by-card checklists (`set` +
repeated `card` objects with `number`, `playerName`, `team`,
`isRookie`, `isShortPrint`, `subset`). No page or script currently
reads this either. Combined with `Lambda Functions/getCardSets/getCardSet_FUTURE.js`
(a stub Lambda with a hardcoded single set/year lookup), this looks
like the groundwork for an unfinished "full checklist per set" feature —
since actually built, independently and differently (PDF upload rather
than this JSON format), as the live `Checklists` table below. This
directory itself is still unused.

## `Checklists` table

Full card-by-card checklists per set — one item per card, not one item
per set. Populated via `cms/uploadChecklist.html`, which parses an
uploaded checklist PDF and lets the result be reviewed/corrected before
anything is written (see `CMS_GUIDE.md` and `LAMBDA_FUNCTIONS.md`).

Partition key `setName` (String — always the *base* set name, e.g.
`"1986-87 O-Pee-Chee"`, whether the item is a main-set card or belongs
to one of that set's insert sets; a checklist source's title commonly
adds the sport name on the end (e.g. "...O-Pee-Chee Hockey"), which
`parseChecklistPdf` strips so this matches the `Cards` table's
`setName` exactly — see `LAMBDA_FUNCTIONS.md`), sort key `cardNumber`
(String).

| Field | Type | Notes |
|---|---|---|
| `setName` | String | Partition key. Matches the `Cards` table's `setName` exactly — not an enforced foreign key, just a matching string convention that `saveChecklist`'s `hasChecklist` linkage (see `Cards` above) depends on. |
| `cardNumber` | String | Sort key. **Not the human-readable card number** — see `cardNumberDisplay` below. Prefixed by group for uniqueness/safe scoped-replace: `MAIN#<cardNumber>` for a main-set card, `INSERT#<insertSetName>#<cardNumber>` for an insert-set card (main and insert cards can otherwise collide, e.g. both numbered starting at "1"/"R1"). Never shown to a user. |
| `cardNumberDisplay` | String | The actual printed card number/designation, e.g. `"76"`, `"R1"`/`"PR-1"` (insert sets are commonly numbered with a letter prefix, sometimes hyphenated), `"165a"`, or `"NNO"` ("No Number" — a standard checklist designation for unnumbered cards; a set can have several distinct `NNO` cards, so this value alone is never treated as unique — see `saveChecklist` below). String rather than Number since these are often alphanumeric. **Not guaranteed unique within a group on its own** — see the sort-key collision note below. |
| `playerName` | String | |
| `notes` | String | Trailing markers from the source checklist (e.g. `"RC"`, `"UER"`, `"RC, UER"`, alphanumeric parallels like `"1000 PC"`/`"SN 250"` — `parseChecklistPdf` inserts a space at the digit/letter boundary of these even when the source has none), plus anything from a note that wrapped onto its own line in the source PDF instead of staying on the card's line (e.g. `"RDM"`, `"Long Shot RDM"`, or a checklist card's own range reference like `"PR-1 - PR-8 CL"` — `parseChecklistPdf` reattaches a non-matching line to the card immediately before it; see `LAMBDA_FUNCTIONS.md` for the full parsing-logic history). Empty string, not omitted, when there are none. |
| `type` | String | `"main"` or `"insertSet"` — derived from whether the upload had an insert set name (see `insertSetName` below), not stored independently. What a future checklist-display feature should group by. |
| `insertSetName` | String | The insert set's name (e.g. `"Predictors (Retail)"`), derived from the checklist PDF's filename — a comma splits it into base set name + insert set name (e.g. `"1994-95 Upper Deck,Predictors (Retail).pdf"`). Empty string for main-set cards. |
| `sortIndex` | Number | This card's position (0-based) in the reviewed table at save time, within its own group (main, or this one insert set) — the review table preserves the PDF's printed order, and rows can be freely reordered/added/deleted there before saving. Deliberately separate from the `cardNumber` sort key above, which doesn't sort numerically or group main-before-insert on its own (plain string comparison — `"INSERT#"` sorts before `"MAIN#"`, and `"10"` sorts before `"2"`). A future checklist-display feature should group by `type`/`insertSetName` then order by this. |

**Full-replace on every save, scoped to the group**: `saveChecklist`
queries and deletes every existing item matching that exact `setName` +
group (main, or this one insert set — via a `begins_with` condition on
the prefixed sort key) before writing the new set, rather than merging.
This is scoped deliberately to just that group, not the whole `setName`
partition — uploading/replacing one insert set never touches the main
set's rows, or a different insert set's rows, even though they all
share the same `setName`.

**Billing mode**: switched from Provisioned to On-Demand on 2026-08-24
— see `ARCHITECTURE.md` for why (a full-table `Scan`-per-search design
in `searchPlayerName` — see `LAMBDA_FUNCTIONS.md` — exhausted the
provisioned RCU ceiling almost immediately under light testing).

**The `setName` ↔ `Cards.setName` 1:1 assumption, and how to verify
it**: every `Checklists` item's `setName` is expected to match exactly
one `Cards` item's `setName` (see `saveChecklist`'s `hasChecklist`
linking above, and `searchPlayerName`'s per-set `Cards` lookup - see
`LAMBDA_FUNCTIONS.md`) - but nothing *enforces* this; it's a
string-matching convention, and a typo'd or pre-fix (missing the
trailing-"Hockey" strip) filename at upload time can silently produce a
`Checklists` partition with no matching `Cards` item. `searchPlayerName`'s
`?audit=1` mode is the tool for checking this across every uploaded
checklist at once - it enumerates every distinct `setName` in
`Checklists` and reports any with zero matching `Cards` items. Two such
mismatches were found and fixed this way on 2026-08-24 (a hyphenation
difference and a double-space filename typo, both requiring every item
under that stale `setName` partition to be deleted, not just one row -
`Checklists` is one item *per card*, not one item per set, so a
"delete the bad set" cleanup means deleting every card row sharing that
`setName`).

**Sort-key collision guard**: `parseChecklistPdf` intentionally keeps
two entries with the same printed card number as separate cards when
their `notes` differ — real checklists sometimes reuse a card number
across distinct parallels/variants sharing the same base slot (e.g. two
different serial-numbered autograph runs, or an error/corrected pair —
see `LAMBDA_FUNCTIONS.md`). But the DynamoDB sort key here is
`prefix + cardNumberDisplay` alone, with no room for that distinction —
so two cards sharing a `cardNumberDisplay` within the same group would
otherwise collide, and `BatchWriteItem` rejects duplicate keys within
one request outright. `saveChecklist` checks for this before writing
and returns a `400` naming the conflicting card number(s) if found —
the fix is editing the Card # field for one of the conflicting rows in
the CMS review table (e.g. `"125"` → `"125 SN250"`) before saving.

## `Subscribers` / `SubscribersTest` tables

Back the Autobus SMS Messaging Platform (`cms/smsAdmin.html`).

| Field | Type | Notes |
|---|---|---|
| `phoneNumber` | String | Partition key (per `cms/smsAdmin.html`'s bulk-import instructions: "each record must already be in DynamoDB typed JSON format with `phoneNumber` as the partition key"). E.164 format. |
| `firstName` | String | |
| `status` | String | `sendAlertHandler`'s broadcast Lambda filters on `status = "subscribed"`. **Confirmed 2026-08-15** (via `Lambdas/inboundSMSHandler/`, the Twilio inbound-reply webhook — see `LAMBDA_FUNCTIONS.md`): the other value is `"unsubscribed"`, set when a subscriber texts STOP (also stamps `unsubTimestamp`); resubscribing via START sets it back to `"subscribed"` and stamps `optInTimestamp`. Both keyword-triggered writes set `source: "mobile"`; `Lambdas/subscribeHandler/`'s single-add endpoint instead sets `source: "web"` when a subscriber signs up through the site. |

`Subscribers` is the live/production list; `SubscribersTest` is a
parallel table used when "Test Mode" is checked in the SMS admin tool,
so test broadcasts never reach real members.

## `BlogIntro` / `CardIntro` tables — dead, backing orphaned Lambdas

Discovered 2026-08-15 while briefly pulling the full Lambda inventory
into the repo (see `LAMBDA_FUNCTIONS.md`). Both are simple lookup
tables (`pageName`/`blogType` → `introText`) that predate the current
approach of hardcoding intro copy client-side in `renderBlogIntro()`
(`scripts/blogs.js`) and `renderCardIntro()` (`scripts/wax.js`). Their
backing Lambdas (`getBlogIntro`, `getCardIntro`) were confirmed dead —
nothing in this repo's frontend called either one — and were removed
from the repo the same day (still live in AWS unless separately
deleted there too). The two DynamoDB tables themselves weren't
touched. Not otherwise documented here since nothing reads from them.

## S3 bucket: `mellowjohnny.cc.files`

Not a database, but worth documenting here since it's the other
persistent store the site depends on:

- `img/blog/` — blog post images.
- `img/cards/` — card set header/footer/middle images, keyed loosely by convention as `{year}_hero.webp`, `{setSlug}_Middle.webp`, etc.
- `img/cms/` — CMS-only UI assets (e.g. the Autobus nameplate logo).
- root — favicons (`favicon.ico`, `favicon2.ico`, etc).

Uploads happen via the browser doing a direct `PUT` to a presigned URL
obtained from a Lambda (see `API_ENDPOINTS.md` → "Get S3 upload URL").
