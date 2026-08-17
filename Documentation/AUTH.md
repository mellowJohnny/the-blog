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

- **Autobus SMS admin** (`scripts/adminSMS.js`): every API call (`sendBroadcast`, bulk import, add subscriber) explicitly calls `getAuthToken()` and sends it as an `Authorization` header. **Confirmed 2026-08-16** (via the site owner's own Confluence documentation, cross-checked when connecting this repo's docs to Confluence): this isn't just client-side politeness — all three of these API Gateway routes (`POST /admin/send`, `POST /subscribers`, `POST /subscribers/bulk-upload`) have a **Cognito User Pool Authorizer** (`CognitoAuthorizer`) attached at the API Gateway level, validating the JWT independently of the frontend and returning `401 Unauthorized` on any request with a missing/invalid token — this closes the open question below. The one exception is the Twilio inbound-SMS webhook (`inboundSMSHandler` — see `LAMBDA_FUNCTIONS.md`), which has no authorizer and must stay public, since Twilio itself calls it; that endpoint instead validates Twilio's own request signature in the Lambda (see `LAMBDA_FUNCTIONS.md`).
- **cardStack — blog/card-set create, update, delete, and list endpoints** (all of `scripts/cms.js`, 12 endpoints total — see `API_ENDPOINTS.md`): **in progress, 2026-08-16.** The frontend now attaches `getAuthToken()` as the `Authorization` header on every one of these calls, matching the Autobus pattern above — but that alone doesn't protect anything; a header the server never checks is just an unread request header. **Server-side enforcement is not live yet** — none of the underlying API Gateway REST APIs has a Cognito Authorizer attached. Until that Console-side work is done (one authorizer per REST API, since Cognito Authorizers are scoped per-API, not account-wide — see `LAMBDA_FUNCTIONS.md`), these endpoints still accept requests with no credentials whatsoever, from any origin that can reach them; anyone who discovers/guesses one of those URLs can still call it directly, no login required, same as before. The frontend change was deployed first, deliberately, so that once the authorizers do go live there's no gap where real CMS usage would suddenly start failing with `401`.
- **Image upload/list** (`cmsImageUploader`, `cmsImagePicker`): not yet included in the above — still send no `Authorization` header and have no authorizer. Lower severity (upload requires knowing the presign contract; list just discloses bucket filenames) but the same fix would apply if hardened later.

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
