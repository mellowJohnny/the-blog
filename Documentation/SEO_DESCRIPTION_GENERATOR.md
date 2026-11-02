# The Claude SEO description generator

The **Generate with Claude** button beside **SEO Meta Description** on
`cms/createCardSet.html` and `cms/setEdit.html` reads the review you have
written and has Claude write the meta description for it. This document
explains how a click becomes a description, why it is built the way it
is, and how to deploy and debug it. The other three SEO Generate buttons
(title, URL slug, keywords) are unrelated deterministic templates; see
`CMS_GUIDE.md`'s "SEO fields and their Generate buttons".

## Why it exists

The meta description is what Google shows under a result, so it should
say what the review concludes. The first generator was a template: the
set name, size, inserts and rating, plus the first sentence of the
review. It came out thin ("1982-83 O-Pee-Chee Hockey card set review.
396 cards. Rating: 3/5.") because a template can't read a review and
decide what matters. Claude can, so the description is now written by a
model that is given the whole review.

## The path of one click

```
Generate with Claude (cmsFormUI.js: generateSeoDescription)
  -> POST, Authorization: <Cognito token>
API Gateway "generateSeoDescription" (prod stage, Cognito Authorizer)
  -> Lambda generateSeoDescription
  -> Amazon Bedrock, bedrock-runtime InvokeModel, us-east-2
  -> Claude Haiku 4.5 via the US inference profile
  <- { description }
fillSeoField() -> confirm modal if the field has text -> field + counter
```

- **Frontend** (`scripts/cmsFormUI.js`): `seoReviewText()` takes the plain
  text of the TinyMCE review body; `requestSeoDescription()` POSTs it with
  the set name, maker, size, rating and inserts, attaching the bearer token
  from `getAuthToken()` like every other CMS call. The URL is the
  `SEO_DESCRIPTION_API_URL` constant at the top of that section.
- **API Gateway**: one REST API for this one action, like the rest of the
  site's "one Lambda + one API per action" pattern. A Cognito Authorizer
  (token source `Authorization`) makes the token mandatory: an
  unauthenticated POST gets 401 before the Lambda runs, which matters
  because every call costs money. CORS is an OPTIONS method plus the
  Lambda's own headers, limited to `https://www.junkwaxhockey.com`.
- **Lambda** (`Lambdas/generateSeoDescription/`): validates the body,
  builds the prompt, calls Bedrock and fixes up the answer (below).

## What the button does in the browser

- It needs the **Set Name** first (the existing alert says so).
- While Claude works the button is disabled and reads "Generating...", then
  returns to "Generate with Claude".
- If the field already holds different text, `fillSeoField()` asks through
  `cmsConfirm()` before replacing it, and the confirm shows the generated
  text itself so you can judge it before accepting. This is the shared
  path all four SEO buttons use.
- **Fallbacks.** If the review is empty, or the call fails (network,
  non-200, no description), it tells you through `cmsAlert()` and fills the
  field with the old deterministic description instead, so the button
  never leaves you with nothing. If `SEO_DESCRIPTION_API_URL` is empty the
  button silently behaves like the old template button.

## What the Lambda does

1. **Validates**: JSON body; `setName` (200 chars max) and `reviewText`
   (20,000 max) required; the optional maker, size, rating and inserts are
   length-capped. Anything else is a 400 with a message. The review cap
   bounds the cost of a single call.
2. **Prompts**: the system prompt asks for one description of 140 to 155
   characters (160 is the hard limit), starting with the set name, saying
   what the review concludes, using only facts that appear in the review or
   the set details, with no quotes, emoji, hashtags or "Rating: 3/5". The
   user message is the set details followed by `Review:` and the text.
   Claude is told to use only the review's facts because a meta description
   that invents a card or a price would be published under the site's name.
3. **Controls length**: models count characters badly, and a description
   over 160 gets cut off in Google. So when the answer is over 160 the
   Lambda sends the conversation back ("That is N characters. Rewrite it in
   150 or fewer, as complete sentences"), up to twice. If it is still too
   long, `fitToLimit()` keeps the last whole sentence that fits (at least
   100 characters), else the last whole word. It never cuts mid-word. An
   early version that simply truncated produced descriptions ending
   mid-sentence, which is why this exists.
4. **Cleans**: collapses whitespace to one line and strips wrapping quotes.
5. **Replies** `{ description }` (200), or `{ error }` with 400 (bad input)
   or 502 (Bedrock failed, the model declined, or the answer was empty).

## Bedrock and the model

- **Model**: Claude Haiku 4.5, `us.anthropic.claude-haiku-4-5-20251001-v1:0`.
  Short, factual rewriting is a small-model job, and Haiku is the cheapest
  Claude tier.
- **Why not Haiku 5.5**: it was the first choice, but this AWS account gets
  "not available for this account" from Bedrock for it, even when called
  with the owner's own identity (agreement status was AVAILABLE, so it is
  an account-level restriction, not a missing permission). Switching back
  is a one-constant change (`MODEL`) plus re-adding any 5.5-only request
  fields; an AWS support case would be the way to get access.
- **Endpoint**: the Lambda uses the default export of
  `@anthropic-ai/bedrock-sdk` (`AnthropicBedrock`), which posts InvokeModel
  to `bedrock-runtime`. The package's other client, `AnthropicBedrockMantle`,
  targets the newer `bedrock-mantle` endpoint, where the 5.x models are not
  served in us-east-2; that is what produced the first live failure ("model
  does not exist"). The request carries the documented
  `anthropic_version: "bedrock-2023-05-31"`.
- **Inference profile**: in us-east-2 these models are only reachable
  through cross-region inference profiles, hence the `us.` prefix in the
  model ID. The call may be served from any US region.
- **Access**: Bedrock has no enable toggle in commercial regions; the first
  invocation of a model subscribes the account through AWS Marketplace.

## Deploying and configuring

- **Zip deploy.** The Lambda has a real dependency
  (`@anthropic-ai/bedrock-sdk`), so, like `sendAlertHandler` and
  `parseChecklistPdf`, it is deployed as a zip: `npm install` in the
  directory, zip `index.mjs`, `package.json` and `node_modules`, upload via
  Code tab -> Update from a .zip file. The built zip sits at
  `Lambdas/generateSeoDescription/generateSeoDescription.zip` (about 16 MB),
  and `node_modules` is committed, as for the other zip Lambdas.
- **Role permissions**: `bedrock:InvokeModel` on both the inference profile
  (`arn:aws:bedrock:us-east-2:<account>:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0`)
  and the foundation model in any region
  (`arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0`),
  because the profile routes across regions and AWS checks both. A denied
  call names the missing resource in the CloudWatch error.
- **Timeout**: a call is a few seconds, up to three Bedrock round trips
  in the worst case, so Lambda's 3-second default is too short; use about
  30 seconds. API Gateway's own limit is 29, so that is the real ceiling.
- **API Gateway**: REST API, stage `prod`, POST plus OPTIONS, Cognito
  Authorizer on POST. Invoke URL:
  `https://1el471sn04.execute-api.us-east-2.amazonaws.com/prod`.

## Cost

Estimated from list prices, not measured: Haiku 4.5 is about $1 per million
input tokens and $5 per million output tokens. A long review is roughly
5,000 tokens in and about 60 out, so a call is around half a cent, and the
worst case (two shortening rounds) is a couple of cents. At a few sets a
week this is pennies a month. The Cognito Authorizer and the 20,000
character cap are what keep a stray caller or an enormous paste from
running the bill up.

## Testing and debugging

- The CMS side was tested with Playwright against a local server with the
  endpoint mocked (success, 502, network failure, empty review, no set
  name, confirm showing the new text, button states). The Lambda was tested
  in Node with the Bedrock client stubbed (request shape, cleaning,
  shortening loop, sentence-aware cut, 400s and 502s). The real Bedrock call
  can only be exercised from AWS.
- A failed click shows the fallback alert in the CMS; the reason is in the
  Lambda's CloudWatch log group (`/aws/lambda/generateSeoDescription`).
  Common ones: "not available for this account" (model access), an
  `AccessDeniedException` naming a resource (IAM), a 404 "model does not
  exist" (wrong endpoint or model ID).

## Changing it

- **Tone or content of the description**: edit `SYSTEM_PROMPT` in the
  Lambda and redeploy (zip).
- **Length rules**: `MAX_LENGTH`, `MAX_SHORTEN_ATTEMPTS` and
  `fitToLimit()` in the Lambda. Keep the 160 in step with the counter in
  `updateSeoCharCounts()`.
- **Model**: `MODEL` in the Lambda, plus the IAM resources above.
- **Endpoint URL**: `SEO_DESCRIPTION_API_URL` in `scripts/cmsFormUI.js`.
