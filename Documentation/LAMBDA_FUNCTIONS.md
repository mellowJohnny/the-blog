# Lambda Functions

Per your note: **all Lambda functions except `sendAlertHandler` live
only in the AWS Console** — their current source isn't in this repo
and wasn't reviewed here. This doc covers (1) the one Lambda that *is*
in the repo, and (2) an inventory of the prototype/legacy Lambda code
that *is* checked in under `Lambda Functions/`, which looks like early
drafts that predate the current live behavior (see the mismatches
noted below and cross-referenced from `API_ENDPOINTS.md`/`DATA_MODEL.md`).
Treat this whole document as a placeholder to fill in properly once
you're back in the AWS Console — that review is flagged as a follow-up
task, not done here.

## `sendAlertHandler/` — the one Lambda in this repo

- **File**: `sendAlertHandler/index.mjs` (ES module, Node.js).
- **Deployment**: manual — the file's own header comment is explicit about this: *"NEVER change this code in the AWS Console. ONLY change in VS Code, then redeploy by uploading the new .zip file (Console → Code tab → Update dropdown → Update from a .zip file)."* A pre-built `sendAlertHandler.zip` sits alongside it in the repo — presumably the last thing actually uploaded; keep it (or regenerate it) in sync with `index.mjs` when you change the code.
- **Dependencies** (`package.json`): `twilio` (^6.0.2), plus `@aws-sdk/client-dynamodb` used in code but not listed in `package.json` `dependencies` — likely available via the Lambda Node.js runtime's bundled AWS SDK v3 layer, but worth double-checking if a fresh `npm install` / redeploy ever fails on it.
- **What it does**: backs the "Send broadcast" button in the Autobus Messaging Platform (`cms/smsAdmin.html`). See `API_ENDPOINTS.md` for the full request/response contract. In short: reads `message` + `mode` (`"test"`/`"live"`) from the request body, scans either `SubscribersTest` or `Subscribers` for `status = "subscribed"`, sends each one an SMS via Twilio (credentials from Lambda environment variables — not in this repo), and returns a per-recipient success/failure list. CORS is hardcoded to allow only `https://www.mellowjohnny.cc`.
- **Note**: this Lambda only handles *sending*. Bulk subscriber import and single-subscriber add (the other two Autobus endpoints in `API_ENDPOINTS.md`) must be separate Lambdas — their source isn't in this repo at all.

## `Lambda Functions/` — legacy/prototype code, not confirmed current

These look like early iterations built while following
`Documentation/Creating A New Lambda.txt`. Several details don't match
how the frontend behaves today (documented per-file below and
cross-referenced from `DATA_MODEL.md`/`API_ENDPOINTS.md`) — most
likely because the real Lambdas behind the live API Gateway endpoints
have since been rewritten directly in the Console, without those
changes being ported back into this repo.

- **`getBlogs/getBlogs.js`**: scans the entire `Blogs` table (`documentClient.scan()`) and returns everything, no filtering — despite the file's own header comment claiming it "fetches blog posts filtered using type param." Also contains a second, unreachable, dead `params` block below the first `return` referencing a table called `"blogTable"` that appears nowhere else in the codebase — looks like an abandoned edit.
- **`getTechBlogs/getTechBlogs.js`**: near-identical to a variant of `getBlogs.js` but hardcodes `blogType: 1` (tech) via `query()` rather than accepting it as a parameter — i.e., not reusable for the other blog types, which the live `getBlogs` endpoint clearly now supports via a `blogType` query param (see `API_ENDPOINTS.md`).
- **`createBlogPost/createBlogPost.js`**: writes to table `Blogs` with fields `blogType, time, title, author, postBody` — notably missing `published`, `img`, `imgCap`, `blogID`, all of which the current CMS create form sends and the edit/list flows depend on (see `DATA_MODEL.md`). This file is almost certainly stale relative to whatever's deployed.
- **`createCardSet/createCardPost.js`**: writes to table `Cards` with fields `setName, setID, size, subsets, mfg, year, headerImg, footerImg, status, postBody` — missing `stars`, `formats`, `blogCat`, `author`, the SEO fields, and `blogStatus` (uses `status` instead), all of which the current CMS create form sends (see `DATA_MODEL.md`). Also generates `setID` via `Math.random().toString(36)` — fine for low collision risk at this scale, but worth knowing it's not a UUID.
- **`getCardSets/getCardSets.js`**: queries a `status-year-index` GSI on `Cards`, filtering to `status = "OK"` — matches the "live sets only" idea but the field name (`status` vs `blogStatus`) and the specific endpoint this corresponds to in `API_ENDPOINTS.md` are unconfirmed.
- **`getCardSets/getCardSets_v2.js`**: queries `Cards` by a **hardcoded** `setName`/`year` (`"1988-89 O-Pee-Chee Hockey"` / `1989`) — clearly a copy-pasted-and-half-edited debugging/scratch version, not something that could serve real traffic as-is.
- **`getCardSets/getCardSet_FUTURE.js`**: queries a `setID-index` GSI on `Cards` by a **hardcoded** `setID`. The filename suggests this was the seed for what's now the live "get card set by ID" endpoint (`API_ENDPOINTS.md`) — or possibly groundwork for the unfinished full-checklist feature described in `DATA_MODEL.md` (`cmsContent/cardSetChecklist/`).

### Recommended follow-up (not done in this pass)

When you're back in the AWS Console, worth doing a proper pass to:
1. Export/copy the real source of every Lambda listed in `API_ENDPOINTS.md` into this repo (e.g. one file per function under `Lambda Functions/`), so `git` actually tracks what's live.
2. Reconcile the field-name mismatches flagged above and in `DATA_MODEL.md` (`status` vs `blogStatus`, `img` vs `imgName`) against the real table schemas.
3. Confirm which of the two IAM/GSI patterns (`status-year-index`, `setID-index`) are still in use.
