# junkwaxhockey.com — Documentation

This folder replaces documentation previously kept in Confluence. It was
reconstructed on 2026-07-16 by reading the code in this repository, since
the Confluence account it lived in was deleted. **It was not written by
inspecting the live AWS account** (API Gateway, Lambda, DynamoDB, S3,
Cognito consoles), so treat anything here about the *live* configuration
as "what the frontend code implies," not as a verified export. Where a
Lambda's source lives only in the AWS Console (i.e. isn't in this repo),
that's called out explicitly.

## What this site is

"the hella files" (junkwaxhockey.com) is Christian Couillard's site:
an extensive hobby section reviewing vintage and "junk wax" era hockey
card sets (O-Pee-Chee, Upper Deck, Score, McDonald's, Tim Hortons,
etc) with full checklists, a player search and a live NHL/PWHL scores
ticker. It also hosts a couple of small utility pages and a private
CMS ("cardStack") used to author/edit content, plus a small SMS
broadcast tool ("Autobus Messaging Platform") for a cycling club. The
site doubles as a personal playground for AWS services — API Gateway,
Lambda, DynamoDB, S3, Cognito.

It moved from `mellowjohnny.cc` on 2026-10-12; that domain now
redirects here (see `ARCHITECTURE.md`). The earlier personal blog
(tech, Mustang Mach-E, Raspberry Pi) is still in the code and the
`Blogs` table but is no longer linked from the nav, home page or
sitemap.

## Document index

| Doc | Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level system diagram, hosting, domains/DNS/redirects, AWS services in play |
| [DATA_MODEL.md](./DATA_MODEL.md) | DynamoDB tables and the fields each one holds |
| [API_ENDPOINTS.md](./API_ENDPOINTS.md) | Every API Gateway endpoint the frontend calls — URL, method, payload, purpose |
| [FRONTEND.md](./FRONTEND.md) | Public-facing pages and the `scripts/*.js` files behind them |
| [PUBLIC_PAGE_FLOWS.md](./PUBLIC_PAGE_FLOWS.md) | Public pages traced end to end — what loads, what runs on load, what each interaction calls and why |
| [CMS_GUIDE.md](./CMS_GUIDE.md) | The `/cms` authoring tools ("cardStack") and the Autobus SMS admin tool |
| [CMS_PAGE_FLOWS.md](./CMS_PAGE_FLOWS.md) | Every `/cms` page traced the same way as PUBLIC_PAGE_FLOWS.md |
| [AUTH.md](./AUTH.md) | Cognito setup and the login flow used to gate `/cms` |
| [LAMBDA_FUNCTIONS.md](./LAMBDA_FUNCTIONS.md) | The Lambda code that *is* in this repo, and an inventory of the ones that only live in the AWS Console |
| [AMP_SMS_PLATFORM.md](./AMP_SMS_PLATFORM.md) | The Autobus Messaging Platform (SMS broadcast tool): bulk upload, subscriber management and inbound SMS, API security, and the core Lambda/admin page/JS — a repo mirror of the "AMP SMS - Platform Core" Confluence page |
| [PWHL_API.md](./PWHL_API.md) | Research reference for the PWHL's data feed (HockeyTech), behind the PWHL section of the scores ticker — access quirks, views and status codes, as of October 2026 |
| [NHL_API.md](./NHL_API.md) | Research reference for the NHL's free, undocumented API (`api-web.nhle.com`) behind the scores ticker — every area of functionality found, as of October 2026 |

## Other files in this folder

- `cognito.txt` — the Cognito App Client ID, domain, and hosted sign-in URL. Superseded/expanded by `AUTH.md`.
- `Creating A New Lambda.txt` — a generic runbook for wiring up a new Lambda + API Gateway + DynamoDB permissions. Still procedurally accurate; referenced from `LAMBDA_FUNCTIONS.md`.

## Command-line tools (`tools/` at the repo root)

Run by hand with Node; neither is part of any deploy.

- `tools/generateSitemap/generate.mjs` — regenerates `sitemap.xml` from the live `getPublicCardSets` data (see `FRONTEND.md`'s sitemap section). Re-run it whenever a card set is added or removed.
- `tools/checklistParser/parse.mjs` — parses a checklist PDF into the JSON the checklist-upload flow produces, mirroring `Lambdas/parseChecklistPdf/` (see `LAMBDA_FUNCTIONS.md` and `CMS_GUIDE.md`).

## Known gaps — worth confirming against the AWS Console

- Both `Cards`' and `Blogs`' key schemas are now confirmed (per the site owner, checked directly against the DynamoDB console): `Cards` — partition key `setName`, sort key `year`; `Blogs` — partition key `blogType`, sort key `time`. See `DATA_MODEL.md`.
- Whether `BlogPost` (singular-table name seen in `Creating A New Lambda.txt`) is a legacy table that's since been renamed/replaced by `Blogs`, or a second table still in use.
- **Resolved 2026-08-15**: the source of every Lambda behind the API Gateway endpoints in `API_ENDPOINTS.md` is now checked into this repo (one directory per function) — see `LAMBDA_FUNCTIONS.md`. The `amplify-readonly-cli` credential turned out to have broader IAM access than its name/original docs suggested (full Lambda read, confirmed via `aws lambda get-function`), which is how this was pulled in directly rather than by hand. The prototype code in `Lambda Functions/` is still a separate, older thing and still doesn't match the real deployed versions — several confirmed mismatches are now documented per-file in `LAMBDA_FUNCTIONS.md`.
- CORS / auth configuration on each API Gateway route can't be inspected directly from here (the same broad-access credential does **not** extend to `apigateway:GET`, confirmed denied) — but has been verified indirectly via `curl` for every CMS write/read endpoint (all 15 original cardStack/Autobus endpoints plus the 2 checklist-upload endpoints): each returns `401` unauthenticated and `200` on `OPTIONS`, confirming a Cognito Authorizer is attached to the real method but not to `OPTIONS`. Only image upload/list (`cmsImageUploader`, `cmsImagePicker`) remain unauthenticated — see `AUTH.md`.
- The real invoke URL for `Lambdas/inboundSMSHandler/`'s API Gateway endpoint — its Lambda source is now in the repo (see `LAMBDA_FUNCTIONS.md`), but since it's a Twilio-to-us webhook rather than something this frontend calls, it was never discoverable by this doc's original "grep for `fetch()` calls" method, and (per the point above) can't be looked up via API Gateway either.
