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

| Field | Type | Notes |
|---|---|---|
| `blogID` | String | Looks like the item's identifier — used as the lookup key by `getBlogByID` / `updateBlogPost` (see `API_ENDPOINTS.md`). Early sample data (`Documentation/BlogArchive.txt`) used a millisecond timestamp string as `id`, e.g. `"1640119360299"` — `blogID` is likely the same idea, possibly renamed. |
| `blogType` | Number | `1`=Tech, `2`=Hockey Cards (per the `createBlogPost.html` dropdown, though card content actually goes to the `Cards` table, not `Blogs`), `3`=Mach-E, `4`=SYNC Updates, `5`=Raspberry Pi, `99`=Home Page. See `BLOG_TYPE_LABELS` in `scripts/cms.js`. |
| `title` | String | Post title. |
| `author` | String | Free text; CMS forms currently only offer "Christian Couillard". |
| `postBody` | String | HTML content, authored via TinyMCE. |
| `img` | String | Full image URL (or `"none"`) — field is called `imgName` in the CMS form/create payload but stored/read back as `img` (see `updateBlogPost()` / `populateBlog()` in `scripts/cms.js` — this rename is a real inconsistency worth knowing about, not a mistake in this doc). |
| `imgCap` | String | Image caption, rendered under the image. |
| `time` | String (ISO 8601) | Creation timestamp, used for sort order (`getSortOrder()` in `scripts/helper.js`) and displayed via `fixDate()`. |
| `published` | Boolean | `true` = live, `false` = staged/draft. Drives the "live blogs" vs "staged blogs" split in `cms/pickBlog.html`. |

The two oldest prototype Lambdas in the repo (`Lambda Functions/getBlogs/getBlogs.js` and its sibling `getTechBlogs.js`) query this table with `KeyConditionExpression` on `blogType` alone, which only works if `blogType` is the table's partition key (with no fixed sort key, or the Lambda is relying on a GSI) — this predates the `blogID`-based lookups used everywhere else in the current CMS, so the live table's key schema may no longer match what these two files imply. Treat those two files as historical, not authoritative.

## `Cards` table

Holds every hockey card set review.

| Field | Type | Notes |
|---|---|---|
| `setID` | String | Randomly generated (`Math.random().toString(36)`) in `Lambda Functions/createCardSet/createCardPost.js`; used as the lookup key by `getCardSetByID`. A `setID-index` GSI is referenced in `Lambda Functions/getCardSets/getCardSet_FUTURE.js`. |
| `setName` | String | e.g. `"1991-92 Upper Deck Hockey"`. |
| `year` | Number | Release year, e.g. `1991`. Drives the year-picker on `waxReviews.html` (`renderSetPicker()` in `scripts/helper.js`). |
| `mfg` | String | Manufacturer — one of O-Pee-Chee, Topps, Upper Deck, Score, Pro Set, Fleer, Leaf, Pinnacle, Pacific (per the `createCardSet.html` dropdown). |
| `size` | String/Number | Set size, e.g. "660 cards". |
| `subsets` | String | Free-text description of inserts/subsets. |
| `stars` | Number (1-5) | "Hella Rating" — rendered as star emoji, sortable via `cardSetSorter()`. |
| `formats` | String | e.g. "Wax, Rack, Cello". |
| `blogCat` | String | `"reg"` (regular O-Pee-Chee/junk-wax sets), `"tims"` (Tim Hortons), `"mcd"` (McDonald's). Drives which nav/year-picker range applies (`renderSetPicker()`, `categoryRanges` in `scripts/helper.js`). |
| `blogStatus` / `status` | String | `"OK"` = live, `"staged"` = draft. Note the field is named `status` in the older prototype Lambdas (`getCardSets.js`, which queries a `status-year-index` GSI) but `blogStatus` in the current CMS create/update forms — likely the same field, renamed at some point; confirm which name the live table actually uses. |
| `postBody` | String | HTML review content, authored via TinyMCE. |
| `headerImg` / `headerImgName` | String | Header image. The create-Lambda prototype (`createCardPost.js`) only ever writes the bucket *prefix* (`.../img/cards/`) into `headerImg`/`footerImg`, while the current CMS form collects a filename into `headerImgName`/`footerImgName` and the frontend concatenates prefix + filename at render time (`displayCardSet()` in `scripts/wax.js`) — another sign the live Lambda has evolved past this prototype. |
| `footerImg` / `footerImgName` | String | Footer/"winners" image, same pattern as above. |
| `author` | String | |
| `seoPageTitle`, `seoMetaDesc`, `seoURLSlug`, `seoTags` | String | SEO metadata fields added to the create/edit forms; not currently read by any public page's `<head>` — likely intended for a future SEO pass. |
| `now` / `date` | String | Passed through as `item.now` in `wax.js`'s `renderCardSetPage()` and used as the review's displayed date. |

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
like the groundwork for an unfinished "full checklist per set" feature.

## `Subscribers` / `SubscribersTest` tables

Back the Autobus SMS Messaging Platform (`cms/smsAdmin.html`).

| Field | Type | Notes |
|---|---|---|
| `phoneNumber` | String | Partition key (per `cms/smsAdmin.html`'s bulk-import instructions: "each record must already be in DynamoDB typed JSON format with `phoneNumber` as the partition key"). E.164 format. |
| `firstName` | String | |
| `status` | String | `sendAlertHandler`'s broadcast Lambda filters on `status = "subscribed"` — other status values (e.g. unsubscribed) presumably exist but aren't visible in this codebase. |

`Subscribers` is the live/production list; `SubscribersTest` is a
parallel table used when "Test Mode" is checked in the SMS admin tool,
so test broadcasts never reach real members.

## S3 bucket: `mellowjohnny.cc.files`

Not a database, but worth documenting here since it's the other
persistent store the site depends on:

- `img/blog/` — blog post images.
- `img/cards/` — card set header/footer/middle images, keyed loosely by convention as `{year}_hero.webp`, `{setSlug}_Middle.webp`, etc.
- `img/cms/` — CMS-only UI assets (e.g. the Autobus nameplate logo).
- root — favicons (`favicon.ico`, `favicon2.ico`, etc).

Uploads happen via the browser doing a direct `PUT` to a presigned URL
obtained from a Lambda (see `API_ENDPOINTS.md` → "Get S3 upload URL").
