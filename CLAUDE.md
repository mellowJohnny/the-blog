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

The one exception is `sendAlertHandler/` (the single Lambda whose
source lives in this repo), which has its own `package.json`
(`twilio` dependency only; its `test` script is an unconfigured stub).
That function is **not** deployed via any command here — per the
comment at the top of `sendAlertHandler/index.mjs`, edit it in this
repo, then manually zip and upload it through the Lambda console's
"Update from a .zip file" option. Never edit it directly in the AWS
Console.

**Deployment of the static site itself**: AWS Amplify Hosting
auto-builds and deploys on every push to `main` — there is no staging
branch or preview environment, so a push to `main` goes live as soon
as Amplify's build finishes. Amplify emails on build completion. See
`Documentation/ARCHITECTURE.md` for details.

**Checking Amplify build status from the CLI**: AWS CLI v2 is
installed, and a read-only IAM user (`amplify-readonly-cli`, scoped to
`amplify:Get*`/`List*` only) is configured in `~/.aws/credentials` on
this machine — no setup needed, just run e.g.:
```
aws amplify list-jobs --app-id d20qsyoicusf3p --branch-name main --max-results 3 --region us-east-2
```
That credential is long-lived (`aws configure`-style, not SSO) and
persists across sessions/machines-state until manually rotated — see
`Documentation/ARCHITECTURE.md` for details and where to rotate it.

## Architecture, in brief

- **Frontend**: one standalone `.html` file per page at the repo root and under `/cms`, no framework. Shared logic lives in `scripts/*.js` and is wired up per-page via `<script src>` tags. Pages coordinate via URL query params (`?year=`, `?blogType=`, `?pageName=`, `?blogCat=`) rather than client-side routing. Details: `Documentation/FRONTEND.md`.
- **Backend**: "one Lambda + one API Gateway REST API per action" — there is no shared backend app/router. Every distinct operation (get blogs, create a blog post, get a card set by ID, get an S3 upload URL, send an SMS...) has its own hardcoded API Gateway URL, called directly from whichever `scripts/*.js` file needs it. Full inventory with request/response shapes: `Documentation/API_ENDPOINTS.md`.
- **Except `sendAlertHandler/`, no Lambda source is version-controlled** — every other Lambda behind those API Gateway endpoints is edited directly in the AWS Console. The prototype code checked into `Lambda Functions/` predates the current live behavior in several confirmed ways (missing fields, hardcoded test values, mismatched field names) — treat it as historical reference, not as what's actually deployed. Details: `Documentation/LAMBDA_FUNCTIONS.md`.
- **Data**: DynamoDB tables `Blogs` (all blog post types, including the hockey-card-adjacent ones, distinguished by `blogType`), `Cards` (card set reviews, distinguished by `blogCat`), and `Subscribers`/`SubscribersTest` (SMS opt-in list, real vs. test). Field-naming is inconsistent across older and newer code paths (e.g. `img` vs `imgName`, `status` vs `blogStatus`) — see `Documentation/DATA_MODEL.md` before assuming a field name.
- **Images**: served from S3 bucket `mellowjohnny.cc.files` (`img/blog/`, `img/cards/`, `img/cms/`). The CMS uploads new images via a Lambda-issued presigned URL, PUT directly from the browser to S3.
- **Auth**: Cognito Hosted UI gates page access to everything under `/cms` (`scripts/auth.js`). Note that this only gates the *page* — most CMS write APIs (create/update blog posts and card sets, image upload) are called with no `Authorization` header and accept unauthenticated requests; only the three Autobus SMS endpoints actually attach a bearer token. See `Documentation/AUTH.md`.
- **Two unrelated tools share `/cms`**: the "cardStack" content CMS (blog posts + card set reviews, TinyMCE-based) and the "Autobus Messaging Platform" (Twilio SMS broadcast tool for a cycling club, nothing to do with blog/card content). See `Documentation/CMS_GUIDE.md`.
- **Response-shape defensiveness**: frontend code that reads from several of these APIs (especially in `scripts/cms.js`) unwraps the response in multiple possible shapes (raw array, `{body: "...json..."}`, `{body: [...]}`, `{Items: [...]}`) in the same function — a sign the underlying Lambdas' contracts have shifted over time. When touching this code, check what shape the *current* Lambda actually returns rather than assuming the frontend's existing unwrap logic is exhaustive or correct.

## Legacy/orphaned files

`Old HTML/`, `example.html`, `styles/styles copy.css`, and
`cmsContent/` are not reachable from current site navigation or read
by any live code path — see `Documentation/FRONTEND.md` and
`Documentation/DATA_MODEL.md` for what each one actually is before
assuming it's dead weight to delete.
