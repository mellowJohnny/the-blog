# Authentication (Cognito)

All `/cms` pages (and only `/cms` pages) load `scripts/auth.js`, which
gates access using an AWS Cognito User Pool's Hosted UI.

## Configuration

From `AUTH_CONFIG` in `scripts/auth.js` (matches `Documentation/cognito.txt`):

| Setting | Value |
|---|---|
| Region | `us-east-2` |
| User Pool ID | `us-east-2_wEdajhS7F` |
| App Client ID | `1m22cfonep7l85th9ut1obk0pe` |
| Cognito domain | `mellowjohnny.auth.us-east-2.amazoncognito.com` |
| Redirect URI | `https://www.mellowjohnny.cc/cms/wlcms.html` |

Login URL (also linked from the public site footer, `index.html`):
```
https://mellowjohnny.auth.us-east-2.amazoncognito.com/login?response_type=code&client_id=1m22cfonep7l85th9ut1obk0pe&redirect_uri=https://www.mellowjohnny.cc/cms/wlcms.html
```

## Flow

This is the OAuth2 **authorization code** flow against Cognito's
Hosted UI, done entirely client-side (no backend token exchange proxy
— the `client_secret`-less public app client exchanges the code
directly from the browser):

1. Any `/cms/*.html` page loads `auth.js` in `<head>`.
2. On load, `auth.js` checks `localStorage` for an existing valid session (see storage keys below).
3. If there's no valid session and no `?code=` in the URL, redirect to the Cognito Hosted UI login page.
4. After a successful login, Cognito redirects back to `cms/wlcms.html?code=...`.
5. `auth.js` detects `code` in the URL, calls Cognito's `/oauth2/token` endpoint (`exchangeCodeForTokens()`) to swap it for an ID token + refresh token, stores them, then strips `?code=` from the URL via `history.replaceState` (so refreshing the page doesn't try to reuse a spent code).
6. From then on, any page can call `window.getAuthToken()` to get a currently-valid ID token, transparently refreshing it via the refresh token if it's expired (with a 60-second early-refresh buffer).
7. If refresh ever fails (e.g. refresh token itself expired/revoked), the user is bounced back to the login page.

That 60-second buffer only governs *when* the short-lived ID token gets
silently swapped for a new one — the refresh token backing that whole
dance has its own, much longer ceiling. Cognito's refresh token here
uses the pool's default **30-day expiry**, which is the real outer
bound on a logged-in session: as long as some `/cms` page gets loaded
(and therefore calls `getAuthToken()`) at least once within any
rolling 30-day window, the session renews itself indefinitely with no
re-login. Only genuine inactivity — 30 straight days without visiting
any `/cms` page — lets the refresh token itself expire, at which point
step 7 fires and the next page load bounces to the Cognito Hosted UI
login exactly as if it were a first-time visit. This is a Cognito User
Pool default, not a value set anywhere in `AUTH_CONFIG`.

## Storage

Tokens are kept in `localStorage` under keys namespaced by the
client ID, mirroring the format Amplify/amazon-cognito-identity-js
uses:

```
CognitoIdentityServiceProvider.{clientId}.LastAuthUser
CognitoIdentityServiceProvider.{clientId}.{username}.idToken
CognitoIdentityServiceProvider.{clientId}.{username}.refreshToken
CognitoIdentityServiceProvider.{clientId}.{username}.tokenExpiry
```

`username` is pulled from the decoded ID token's `cognito:username`
claim (falling back to `sub`).

## What's actually protected

Loading `auth.js` only gates **page access** (redirect-to-login if
there's no session) — it does not, by itself, protect any API call.
Looking at how the resulting token is actually used:

- **Autobus SMS admin** (`scripts/adminSMS.js`): every API call (`sendBroadcast`, bulk import, add subscriber) explicitly calls `getAuthToken()` and sends it as an `Authorization` header. **Confirmed 2026-08-16** (via the site owner's own Confluence documentation, cross-checked when connecting this repo's docs to Confluence): this isn't just client-side politeness — all three of these API Gateway routes (`POST /admin/send`, `POST /subscribers`, `POST /subscribers/bulk-upload`) have a **Cognito User Pool Authorizer** (`CognitoAuthorizer`) attached at the API Gateway level, validating the JWT independently of the frontend and returning `401 Unauthorized` on any request with a missing/invalid token — this closes the open question below. The authorizer's token source is configured as the `Authorization` header specifically (matching exactly how `adminSMS.js` sends it — see the `Flow`/`Storage` sections above for the shared `AUTH_CONFIG`/token details, which apply here unchanged; nothing about the SMS admin's Cognito setup is separate from the rest of `/cms`). Worth noting for history: this authorizer wasn't there from the start — per the site owner's own Confluence write-up of the hardening pass that added it (dated 2026-05-28, the same source cross-checked above), all of the Autobus SMS platform's API Gateway endpoints, these three included, were previously open to anyone who knew the URL, with zero request-level authentication; `auth.js` gating the admin *pages* client-side was, until this pass, the only thing standing between an anonymous request and a real Twilio-backed broadcast send or a subscriber-list mutation. That Confluence page's own protected-endpoints table is itself stale in one respect — it lists only `POST /admin/send` and `POST /subscribers/bulk-upload`, omitting `POST /subscribers` (the add-single-subscriber endpoint) even though that route carries the same `CognitoAuthorizer` and is included correctly in the three-endpoint list above. The one exception is the Twilio inbound-SMS webhook (`inboundSMSHandler` — see `LAMBDA_FUNCTIONS.md`), which has no authorizer and must stay public, since Twilio itself calls it; that endpoint instead validates Twilio's own request signature in the Lambda (see `LAMBDA_FUNCTIONS.md`).
- **cardStack — blog/card-set create, update, delete, and list endpoints** (all of `scripts/cms.js`, 12 endpoints total — see `API_ENDPOINTS.md`): **confirmed enforced, 2026-08-20.** The frontend attaches `getAuthToken()` as the `Authorization` header on every one of these calls (added 2026-08-16), matching the Autobus pattern above. Each of the 12 underlying API Gateway REST APIs now has its own Cognito Authorizer attached to the actual method (GET/POST/PUT/DELETE) — verified directly: every endpoint returns `401` on an unauthenticated request and `200` on its `OPTIONS` preflight (confirming the authorizer wasn't accidentally also attached to `OPTIONS`, which would have broken CORS for logged-in users too). Full list of the 12 endpoints and their URLs: `API_ENDPOINTS.md`.
- **Checklist upload** (`parseChecklistPdf`, `saveChecklist` — `scripts/checklistUpload.js`): same pattern, confirmed enforced — both attach `getAuthToken()` as the `Authorization` header and both API Gateway routes have a Cognito Authorizer on the POST method only, verified the same way (`401` unauthenticated, `200` on `OPTIONS`).
- **Image upload/list** (`cmsImageUploader`, `cmsImagePicker`): not yet included in the above — still send no `Authorization` header and have no authorizer. Lower severity (upload requires knowing the presign contract; list just discloses bucket filenames) but the same fix would apply if hardened later.
- **Get checklist by set name** (`getChecklistBySetName` — powers the "Checklist" modal on `waxReviews.html`, a *public* page, not `/cms`): no `Authorization` header, no authorizer — but unlike the image-upload/list gap above, this is intentional, not an oversight. Same public trust level as `getBlogs`/`getCardSetsByYear`, the other unauthenticated public-read endpoints. See `API_ENDPOINTS.md`.
- **Search players by name** (`searchPlayerName` — powers `playerSearch.html`, also public): same story, deliberately unauthenticated, including its `?audit=1` data-integrity mode (not a hidden admin flag - anyone who knows to append it can trigger it, same trust level as the rest of the endpoint). See `LAMBDA_FUNCTIONS.md`.

## Discoverability (defense-in-depth, not access control)

Separate from authorization above — these don't stop anyone with the
direct URL, they just reduce the odds of the `/cms` link or pages
being found in the first place: `robots.txt` (repo root) disallows
`/cms/`; every live page under `/cms` also
carries `<meta name="robots" content="noindex, nofollow">` directly,
which holds even if a page is reached by some path other than the
site's own link (a stronger, page-level version of the `rel="nofollow"`
already on the CMS link in `index.html`). None of this is a substitute
for the authorization work above — a search engine simply choosing not
to index a page has no bearing on whether its API endpoints will
accept an unauthenticated request.
