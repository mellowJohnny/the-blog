# mellowjohnny.cc — Documentation

This folder replaces documentation previously kept in Confluence. It was
reconstructed on 2026-07-16 by reading the code in this repository, since
the Confluence account it lived in was deleted. **It was not written by
inspecting the live AWS account** (API Gateway, Lambda, DynamoDB, S3,
Cognito consoles), so treat anything here about the *live* configuration
as "what the frontend code implies," not as a verified export. Where a
Lambda's source lives only in the AWS Console (i.e. isn't in this repo),
that's called out explicitly.

## What this site is

"the hella files" (mellowjohnny.cc) is Christian Couillard's personal
site: a blog (tech, Mustang Mach-E, Raspberry Pi) plus an extensive
hobby section reviewing vintage and "junk wax" era hockey card sets
(O-Pee-Chee, Upper Deck, Score, McDonald's, Tim Hortons, etc). It also
hosts a couple of small utility pages and a private CMS ("cardStack")
used to author/edit content, plus a small SMS broadcast tool ("Autobus
Messaging Platform") for a cycling club. The site doubles as a personal
playground for AWS services — API Gateway, Lambda, DynamoDB, S3,
Cognito — mentioned directly in `index.html`'s meta description.

## Document index

| Doc | Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level system diagram, hosting, AWS services in play |
| [DATA_MODEL.md](./DATA_MODEL.md) | DynamoDB tables and the fields each one holds |
| [API_ENDPOINTS.md](./API_ENDPOINTS.md) | Every API Gateway endpoint the frontend calls — URL, method, payload, purpose |
| [FRONTEND.md](./FRONTEND.md) | Public-facing pages and the `scripts/*.js` files behind them |
| [CMS_GUIDE.md](./CMS_GUIDE.md) | The `/cms` authoring tools ("cardStack") and the Autobus SMS admin tool |
| [AUTH.md](./AUTH.md) | Cognito setup and the login flow used to gate `/cms` |
| [LAMBDA_FUNCTIONS.md](./LAMBDA_FUNCTIONS.md) | The Lambda code that *is* in this repo, and an inventory of the ones that only live in the AWS Console |

## Pre-existing files in this folder

These were already here before this rewrite and are kept as-is; a few
are quoted or referenced from the new docs above:

- `AWS Developer Guides/` — vendor PDFs (AppSync, DynamoDB) — general AWS reference material, not project-specific.
- `cognito.txt` — the Cognito App Client ID, domain, and hosted sign-in URL. Superseded/expanded by `AUTH.md`.
- `getBlogPostsLambda.txt`, `dynamicBlogLambda.txt`, `GETBLOGS.txt` — early draft/prototype source for blog-fetching Lambdas. These look like earlier iterations of what's now in `Lambda Functions/getBlogs/` and don't match the current live API contract (see `LAMBDA_FUNCTIONS.md`).
- `Creating A New Lambda.txt` — a generic runbook for wiring up a new Lambda + API Gateway + DynamoDB permissions. Still procedurally accurate; referenced from `LAMBDA_FUNCTIONS.md`.
- `BlogArchive.txt` — a raw dump of a few early blog post records, useful only as a sample of the `Blogs` item shape.
- `HomePageBlogPost.docx` — not reviewed (binary doc, outside code review scope).

## Known gaps — worth confirming against the AWS Console

- Both `Cards`' and `Blogs`' key schemas are now confirmed (per the site owner, checked directly against the DynamoDB console): `Cards` — partition key `setName`, sort key `year`; `Blogs` — partition key `blogType`, sort key `time`. See `DATA_MODEL.md`.
- Whether `BlogPost` (singular-table name seen in `Creating A New Lambda.txt` and `getBlogPostsLambda.txt`) is a legacy table that's since been renamed/replaced by `Blogs`, or a second table still in use.
- The source of every Lambda behind the API Gateway endpoints in `API_ENDPOINTS.md` — all but `sendAlertHandler` (SMS broadcast) and `castVoteHandler` (card set voting) live only in the AWS Console per your note, so their current implementation could have diverged from the prototype versions checked into `Lambda Functions/`.
- CORS / auth configuration on each API Gateway route (most CMS write endpoints are called without an `Authorization` header — see `AUTH.md` for the one exception).
