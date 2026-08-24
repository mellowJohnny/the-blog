# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"the hella files" (mellowjohnny.cc) — a personal site combining a blog
(tech, Mustang Mach-E, Raspberry Pi) with an extensive vintage/junk-wax
hockey card set review section, a private CMS, and a small SMS
broadcast tool for a cycling club. It also serves as the owner's AWS
playground (Lambda, DynamoDB, Amplify).

**Full architecture, data model, API inventory, and CMS docs live in
`Documentation/` — start with `Documentation/README.md`.** It was
reconstructed by reading this codebase after the original Confluence
docs were lost, and is kept up to date; treat it as the primary
reference and this file as the short orientation on top of it.

## Commands

There is no build step, package manager, linter, or test suite for the
site itself — it's plain static HTML/CSS/JS with no bundler. Edit
files directly and open them in a browser (or push to deploy — see
below). There is nothing to `npm install` or `npm run` at the repo
root.

The exception is the **Lambdas** — every AWS Lambda function behind
this site's API Gateway endpoints now has its source checked into this
repo (as of 2026-08-15), one directory per function, named exactly
after its AWS Lambda function name (e.g. `Lambdas/sendAlertHandler/`,
`Lambdas/getBlogs/`, `Lambdas/updateCardSet/`). Each has its own minimal
`package.json` — two functions have a real dependency,
`sendAlertHandler` (`twilio`) and `parseChecklistPdf` (`pdf-parse`,
deliberately pinned to its v1 major — see `Documentation/LAMBDA_FUNCTIONS.md`
for why); every other function uses only `@aws-sdk/*` packages,
which ship with the Lambda Node.js runtime, so `dependencies` is
empty. None of them is deployed via any command here — edit the code
in this repo, then redeploy manually. **How you redeploy depends on
whether the function has a real dependency**: the 21 with empty
`dependencies` just need the updated `index.mjs` pasted directly into
the Lambda Console's inline code editor (Code tab) and Deploy clicked
— no zip needed, since there's nothing to bundle. `sendAlertHandler`
and `parseChecklistPdf` need the full zip treatment instead: `npm
install` inside their directory, zip the code plus `node_modules`,
upload via Code tab → Update dropdown → "Update from a .zip file" —
pasting just the code into the inline editor would break it (`Cannot
find module` at runtime). Per the header comment most files carry:
**never edit any of them directly in the AWS Console without also
updating this repo** — this repo is the source of truth. One caveat:
most of these were pulled from the live Console on 2026-08-15 via `aws
lambda get-function`, not authored with that workflow in mind from the
start — if a function's behavior in production ever doesn't match what's
in its file here, someone edited it in the Console after that date
without syncing back; check `LastModified` via `aws lambda
get-function --function-name X` against this repo's git history for
that file.

**Deployment of the static site itself**: AWS Amplify Hosting
auto-builds and deploys on every push to `main` — there is no staging
branch or preview environment, so a push to `main` goes live as soon
as Amplify's build finishes. Amplify emails on build completion. See
`Documentation/ARCHITECTURE.md` for details.

**Checking Amplify build status from the CLI**: AWS CLI v2 is
installed, and a read-only IAM user (`amplify-readonly-cli`) is
configured in `~/.aws/credentials` on this machine — no setup needed,
just run e.g.:
```
aws amplify list-jobs --app-id d20qsyoicusf3p --branch-name main --max-results 3 --region us-east-2
```
That credential is long-lived (`aws configure`-style, not SSO) and
persists across sessions/machines-state until manually rotated — see
`Documentation/ARCHITECTURE.md` for details and where to rotate it.
**Its actual scope is broader than its name suggests**: despite being
named for Amplify, it can also read full Lambda source
(`aws lambda get-function`/`list-functions` both work — this is how
every Lambda's source got synced into this repo on 2026-08-15) — but
NOT API Gateway (`apigateway:GET` is denied). Confirm current scope
with `aws iam list-attached-user-policies --user-name
amplify-readonly-cli` before assuming either way; this is still a
read-only credential regardless of scope, no write/deploy access to
anything.

## Architecture, in brief

- **Frontend**: one standalone `.html` file per page at the repo root and under `/cms`, no framework. Shared logic lives in `scripts/*.js` and is wired up per-page via `<script src>` tags. Pages coordinate via URL query params (`?year=`, `?blogType=`, `?pageName=`, `?blogCat=`) rather than client-side routing. Details: `Documentation/FRONTEND.md`.
- **Backend**: "one Lambda + one API Gateway REST API per action" — there is no shared backend app/router. Every distinct operation (get blogs, create a blog post, get a card set by ID, get an S3 upload URL, send an SMS...) has its own hardcoded API Gateway URL, called directly from whichever `scripts/*.js` file needs it. Full inventory with request/response shapes: `Documentation/API_ENDPOINTS.md`.
- **Every live Lambda's source is version-controlled**, under `Lambdas/` — one directory per function, matching its exact AWS Lambda function name; see the `## Commands` section above for the sync/deploy workflow. Four turned out to be dead/orphaned (not called by any live frontend code) when the full inventory was pulled in on 2026-08-15, and were removed again once confirmed — see `Documentation/LAMBDA_FUNCTIONS.md` for which. A separate, older prototype directory, `Lambda Functions/` (note the space — a different thing from the no-space `Lambdas/`), no longer exists in this repo at all (deleted 2026-08-06, unrelated to the 2026-08-15 sync) — some docs still reference specific files that used to live there for historical context, even though those files are gone. Details: `Documentation/LAMBDA_FUNCTIONS.md`.
- **Data**: DynamoDB tables `Blogs` (all blog post types, including the hockey-card-adjacent ones, distinguished by `blogType`), `Cards` (card set reviews, distinguished by `blogCat`; a `hasChecklist` flag drives a "Checklist" link on `waxReviews.html` once a set has one, opening a modal that fetches and displays the full checklist via `getChecklistBySetName`), `Checklists` (full card-by-card checklists per set, one item per card, uploaded via `cms/uploadChecklist.html` — see `Documentation/CMS_GUIDE.md`), and `Subscribers`/`SubscribersTest` (SMS opt-in list, real vs. test). Field-naming is inconsistent across older and newer code paths (e.g. `img` vs `imgName`, `status` vs `blogStatus`) — see `Documentation/DATA_MODEL.md` before assuming a field name. The real source checklist PDFs (one per set/insert set — the actual files uploaded via `cms/uploadChecklist.html`) live in `checklists/` at the repo root — this is the source of truth for them, not any local Desktop folder.
- **Images**: served from S3 bucket `mellowjohnny.cc.files` (`img/blog/`, `img/cards/`, `img/cms/`). The CMS uploads new images via a Lambda-issued presigned URL, PUT directly from the browser to S3.
- **Auth**: Cognito Hosted UI gates page access to everything under `/cms` (`scripts/auth.js`). Note that this only gates the *page*. All three Autobus SMS endpoints, all 12 cardStack create/update/delete/list endpoints (blog posts, card sets — `scripts/cms.js`), and both checklist-upload endpoints (`scripts/checklistUpload.js`) attach a bearer token via `getAuthToken()`, and (confirmed 2026-08-20 for the first 15, checklist endpoints added after) genuinely enforce it server-side too, via a Cognito Authorizer on each of their API Gateway routes — not just a client-side courtesy. Image upload/list (`cmsImageUploader`, `cmsImagePicker`) are the one remaining *gap* — no token sent, no authorizer. `getChecklistBySetName` (public checklist display on `waxReviews.html`) also has no auth, but that's *by design*, not a gap — same public trust level as the other read-only public GETs (`getBlogs`, `getCardSetsByYear`), not a CMS endpoint. `robots.txt` + a `noindex, nofollow` meta tag on every `/cms` page reduce discoverability but don't affect any of the above. See `Documentation/AUTH.md`.
- **Two unrelated tools share `/cms`**: the "cardStack" content CMS (blog posts + card set reviews, TinyMCE-based, plus a separate checklist-PDF-upload page not TinyMCE-based) and the "Autobus Messaging Platform" (Twilio SMS broadcast tool for a cycling club, nothing to do with blog/card content). See `Documentation/CMS_GUIDE.md`.
- **Response-shape defensiveness**: frontend code that reads from several of these APIs (especially in `scripts/cms.js`) unwraps the response in multiple possible shapes (raw array, `{body: "...json..."}`, `{body: [...]}`, `{Items: [...]}`) in the same function — a sign the underlying Lambdas' contracts have shifted over time. When touching this code, check what shape the *current* Lambda actually returns rather than assuming the frontend's existing unwrap logic is exhaustive or correct.

## Legacy/orphaned files

`Old HTML/`, `example.html`, `styles/styles copy.css`, and
`cmsContent/` are not reachable from current site navigation or read
by any live code path — see `Documentation/FRONTEND.md` and
`Documentation/DATA_MODEL.md` for what each one actually is before
assuming it's dead weight to delete.
