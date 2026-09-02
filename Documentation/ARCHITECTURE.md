# Architecture

## Overview

The site is a static frontend (plain HTML/CSS/JS, no build step, no
framework) that talks directly to a set of individual AWS Lambda
functions, each exposed through its own API Gateway REST API. There is
no single backend app or router — every distinct action (get blogs,
create a blog, get a card set by ID, upload an image, send an SMS...)
is its own Lambda + its own API Gateway deployment + its own URL
hardcoded into the relevant frontend script. This is very much a
"one Lambda per verb" architecture, grown organically (see
`Documentation/Creating A New Lambda.txt` for the manual, step-by-step
process used to add each new one).

```
Browser (static HTML/CSS/JS, no framework)
   |
   |-- fetch() -----------> API Gateway (many separate REST APIs, "dev"/"prod" stages)
   |                              |
   |                              v
   |                        AWS Lambda (one function per endpoint)
   |                              |
   |                              v
   |                        DynamoDB (Blogs, Cards, Checklists, Subscribers, SubscribersTest)
   |
   |-- <img src>/S3 -----> S3 bucket "mellowjohnny.cc.files" (images, favicons, S3 presigned uploads)
   |
   |-- redirect ---------> Cognito Hosted UI (login, only for /cms/*)
   |
   '-- fetch() -----------> api.openweathermap.org (homepage weather widget, client-side API key)
```

## Hosting & deployment

Confirmed: the static site is deployed via **AWS Amplify Hosting**,
connected directly to this repo's git history — no `amplify.yml` or
other build config is checked in here, so Amplify is presumably using
its default/zero-config static-site build settings (there's no build
step to run anyway; it's plain HTML/CSS/JS with no bundler).

- **Trigger**: any push to the tracked branch (this repo shows `main` as that branch).
- **Process**: Amplify picks up the commit, runs its build (a no-op / asset-copy step given there's no framework here), and deploys straight to production — there's no staging environment or manual promotion step described anywhere in this repo.
- **Notification**: Amplify emails on build completion (success or failure) — this is currently the only build/deploy signal; there's no CI status check, PR gate, or Slack/webhook integration in play.
- **Practical implication**: pushing to `main` ships to the live site. There's no separate preview/staging branch — the `published`/`blogStatus` draft flags in DynamoDB (see `DATA_MODEL.md`) are what stand in for a staging environment at the *content* level, but not at the *code* level. A broken commit to `main` goes live as soon as Amplify's build finishes.

This is separate from Lambda deployment, which is manual per-function
(see `LAMBDA_FUNCTIONS.md` — `sendAlertHandler` is redeployed by
uploading a `.zip` through the Lambda console, and the other Lambdas
are edited directly in the Console with no source control at all).

### Cost/abuse backstop: AWS Budgets

A $5/month AWS Budget alerts by email if account spend approaches that
threshold — a cheap early-warning signal for runaway costs (e.g. from
API abuse — see `API_ENDPOINTS.md`'s throttling note) that doesn't
depend on actively watching anything. Configured in Billing and Cost
Management → Budgets, not tied to any specific service or region.

### Verifying a deploy from the CLI

As of 2026-07-16, AWS CLI v2 is installed on the primary dev machine,
authenticated as a dedicated IAM user, `amplify-readonly-cli`
(account `339740904141`), scoped to a custom read-only policy
(`AmplifyReadOnly` — nominally `amplify:Get*`/`List*` actions only, no
write access to anything). Its actual scope turned out to be broader
than the name suggests: it can also read full Lambda source
(`aws lambda get-function`/`list-functions`, confirmed 2026-08-15 —
see `LAMBDA_FUNCTIONS.md`), but not API Gateway (`apigateway:GET`
denied) and, as of 2026-08-24, not DynamoDB or IAM policy
introspection either. Still read-only regardless of exact scope — no
write/deploy access to anything; confirm current scope with
`aws iam list-attached-user-policies --user-name amplify-readonly-cli`
before assuming either way. This lets a build be checked without
opening the Amplify console:

```bash
aws sts get-caller-identity                          # confirm auth
aws amplify list-apps --region us-east-2              # find the app ID (currently d20qsyoicusf3p, "the-blog")
aws amplify list-jobs --app-id d20qsyoicusf3p --branch-name main --max-results 3 --region us-east-2
```

Each job entry includes `commitId`, `commitMessage`, and `status`
(`SUCCEED`/`FAILED`/`RUNNING`/etc), so a specific push can be matched
to its build result directly.

**Credential lifecycle**: this was set up via `aws configure` (static
access key + secret in `~/.aws/credentials`), not AWS SSO — see
`AUTH.md`'s discussion of the tradeoff if this pattern gets reused
elsewhere. Practically, that means:
- The credential does **not** expire on its own and does **not** need to be re-entered per session — it persists on disk until manually rotated or deleted.
- To rotate/revoke it: IAM console → Users → `amplify-readonly-cli` → Security credentials → deactivate or delete the access key (and issue a new one via `aws configure` if still needed).
- Being read-only limits the blast radius if the key were ever exposed, but it's still a standing credential sitting on disk indefinitely — worth keeping in mind if the dev machine's disk/backups are ever shared or exposed.

## Frontend

Plain multi-page HTML site, no bundler/framework:

- Every page is a standalone `.html` file at the repo root (`index.html`, `tech.html`, `waxReviews.html`, `playerSearch.html`, `lockout.html`) or under `/cms`. `cards.html` and `cardChecker.html` were both archived to `Old HTML Pages/` on 2026-08-15 — no longer live pages, see `FRONTEND.md`.
- Shared behaviour lives in `/scripts/*.js`, included per-page via `<script src>` tags — see `FRONTEND.md` for which script does what.
- Styling is a single `styles/styles.css`.
- Pages read query-string parameters (`?year=`, `?blogType=`, `?pageName=`, `?blogCat=`) to decide what content to fetch and how to render the nav — see `FRONTEND.md`.

## Backend

- **API Gateway**: many independent REST APIs (each with its own random subdomain, e.g. `https://qeb63ean2e.execute-api.us-east-2.amazonaws.com/dev`), each fronting exactly one Lambda. Full inventory in `API_ENDPOINTS.md`. 22 of the 25 total endpoints are deployed to a stage named `dev`; only the 3 Autobus SMS endpoints (see `API_ENDPOINTS.md`) are on `prod`. That split is historical, not meaningful — there's no separate dev environment behind either name (no separate Lambda/DynamoDB per stage), and this site has exactly one real target (production; see "Hosting & deployment" above — a push to `main` goes live immediately, no staging step). Not worth renaming the existing 22 to `prod` retroactively, since an API Gateway stage rename changes its invoke URL, which would mean updating every hardcoded URL in `scripts/*.js` plus this doc for a purely cosmetic fix — but any *new* endpoint going forward should be deployed to `prod` from the start, so new work doesn't keep perpetuating the `dev` label.
- **Lambda**: Node.js, using the modern modular `@aws-sdk/*` (v3) packages throughout (e.g. `@aws-sdk/client-dynamodb`), not the legacy `aws-sdk` v2. As of the 2026-08-15 sync, every live function's source is version-controlled in this repo under `Lambdas/`, not just `sendAlertHandler` — see `LAMBDA_FUNCTIONS.md` and the `## Commands` section of `CLAUDE.md` for the sync/deploy workflow.
- **DynamoDB**: at least `Blogs`, `Cards`, `Checklists`, `Subscribers`, `SubscribersTest` tables. See `DATA_MODEL.md`. **Billing mode**: `Checklists` and `Cards` both run **On-Demand**, not Provisioned — `Checklists` because `searchPlayerName`'s full-table `Scan`-per-search design (see `LAMBDA_FUNCTIONS.md`) exhausted a provisioned RCU ceiling almost immediately; `Cards` for the same reason once `cms/admin.html`'s tools (also `LAMBDA_FUNCTIONS.md`) started making many rapid `Query` calls against it. Both also have an explicit **maximum throughput cap** set (DynamoDB Console → table → Additional settings → Maximum table throughput) — a deliberate middle ground: on-demand alone removes the fixed ceiling that caused the original throttling, but leaves read/write cost technically uncapped, and both tables sit behind fully public, unauthenticated read endpoints. The cap is a coarse, real-time circuit breaker against a runaway/abusive traffic spike, sized well above any known legitimate usage pattern (including bursty admin-tool runs) so it never interferes with normal traffic — complementary to, not a replacement for, the account-wide $5/month AWS Budget alert above, which is after-the-fact rather than preventative. Other tables' billing modes haven't been confirmed either way.
- **S3**: bucket `mellowjohnny.cc.files` serves all images (`img/blog/`, `img/cards/`, `img/cms/`, favicons) directly over HTTPS, and also receives direct browser PUT uploads via presigned URLs generated by a Lambda (see `API_ENDPOINTS.md` → image upload).
- **Cognito**: one User Pool, gates the `/cms` authoring tools via its Hosted UI. See `AUTH.md`.

## Third-party services

- **TinyMCE** (cloud-hosted, API key embedded in `cms/*.html`) — WYSIWYG editor used for blog post bodies and card set review bodies in the CMS.
- **OpenWeatherMap** — homepage weather widget (`scripts/blogs.js`); API key is hardcoded client-side (`49f84d9cdb7907dfd2b02085e270372e`) — this is visible to anyone viewing page source, worth being aware of even though OpenWeather free-tier keys are generally meant to be used this way.
- **Twilio** — outbound SMS for the Autobus Messaging Platform, called from the `sendAlertHandler` Lambda using account credentials stored as Lambda environment variables (not in this repo).
- **Google Analytics (gtag.js)** — `G-JMGVGK09QX`, loaded on most public pages.
- **SweetAlert** (`unpkg.com/sweetalert`) — used for the small utility pages (Card-O-Matic, Quadratic solver) instead of native `alert()`.

## Notable cross-cutting patterns

- **No shared "API client"**: each script builds its own `fetch()` calls with a hardcoded API Gateway URL. Adding/rotating an endpoint means updating the URL string wherever it's called from.
- **Inconsistent response shapes**: several frontend functions defensively unwrap the Lambda response in multiple possible shapes (e.g. `fetchAllCardSets()` in `scripts/cms.js` checks for `Array.isArray(data)`, `data.body` as a string, `data.body` as an array, and `data.Items` all in the same function). This strongly suggests the underlying Lambdas have been rewritten/tweaked over time without the response contract being fully stabilized.
- **`published: true/false` in `Blogs` and `blogStatus: "OK"/"staged"` in `Cards`** are the site's lightweight draft/publish workflow — see `DATA_MODEL.md` and `CMS_GUIDE.md`.
