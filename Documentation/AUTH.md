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

- **Autobus SMS admin** (`scripts/adminSMS.js`): every API call (`sendBroadcast`, bulk import, add subscriber) explicitly calls `getAuthToken()` and sends it as an `Authorization` header.
- **Everything else in the CMS** (create/update/list blog posts and card sets, image upload/list — all of `scripts/cms.js`): the API calls do **not** attach any `Authorization` header at all. `auth.js` being loaded on the page keeps a logged-out browser from *seeing* the CMS UI, but the underlying API Gateway endpoints in `API_ENDPOINTS.md` (aside from the three Autobus ones) accept requests with no credentials whatsoever, from any origin that can reach them — anyone who discovers/guesses one of those URLs can call it directly, no login required.

Whether those endpoints have their own IAM/Cognito authorizer
configured at the API Gateway level (independent of anything the
frontend sends) can't be determined from this repo — that's an AWS
Console check worth doing given the above.
