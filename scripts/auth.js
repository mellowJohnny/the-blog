// =============================================================
// auth.js — Cognito Authentication
// Handles token exchange, session validation, and token access
// for all pages under /cms
// =============================================================

const AUTH_CONFIG = {
  region:       'us-east-2',
  userPoolId:   'us-east-2_wEdajhS7F',
  clientId:     '1m22cfonep7l85th9ut1obk0pe',
  redirectUri:  'https://www.mellowjohnny.cc/cms/wlcms.html',
  loginUrl:     'https://mellowjohnny.auth.us-east-2.amazoncognito.com/login' +
                '?response_type=code' +
                '&client_id=1m22cfonep7l85th9ut1obk0pe' +
                '&redirect_uri=https://www.mellowjohnny.cc/cms/wlcms.html'
};

// localStorage key helpers
const LS_PREFIX    = () => `CognitoIdentityServiceProvider.${AUTH_CONFIG.clientId}`;
const LS_LAST_USER = () => `${LS_PREFIX()}.LastAuthUser`;
const LS_ID_TOKEN  = (user) => `${LS_PREFIX()}.${user}.idToken`;
const LS_REFRESH   = (user) => `${LS_PREFIX()}.${user}.refreshToken`;
const LS_EXPIRES   = (user) => `${LS_PREFIX()}.${user}.tokenExpiry`;

// =============================================================
// Token exchange — swap the authorization code for tokens
// =============================================================
async function exchangeCodeForTokens(code) {
  const tokenEndpoint = `https://cognito-idp.${AUTH_CONFIG.region}.amazonaws.com/${AUTH_CONFIG.userPoolId}/oauth2/token`;

  const params = new URLSearchParams({
    grant_type:   'authorization_code',
    client_id:    AUTH_CONFIG.clientId,
    redirect_uri: AUTH_CONFIG.redirectUri,
    code:         code
  });

  const response = await fetch(`https://mellowjohnny.auth.us-east-2.amazoncognito.com/oauth2/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString()
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return response.json();
}

// =============================================================
// Store tokens in localStorage
// =============================================================
function storeTokens(tokens) {
  // Decode the ID token to extract the username (sub claim)
  const payload = JSON.parse(atob(tokens.id_token.split('.')[1]));
  const username = payload['cognito:username'] || payload.sub;

  // Calculate and store expiry time
  const expiresAt = Date.now() + (tokens.expires_in * 1000);

  localStorage.setItem(LS_LAST_USER(),       username);
  localStorage.setItem(LS_ID_TOKEN(username), tokens.id_token);
  localStorage.setItem(LS_REFRESH(username),  tokens.refresh_token);
  localStorage.setItem(LS_EXPIRES(username),  expiresAt.toString());
}

// =============================================================
// Refresh the session using the refresh token
// =============================================================
async function refreshSession(username, refreshToken) {
  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     AUTH_CONFIG.clientId,
    refresh_token: refreshToken
  });

  const response = await fetch(`https://mellowjohnny.auth.us-east-2.amazoncognito.com/oauth2/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString()
  });

  if (!response.ok) return false;

  const tokens = await response.json();
  const expiresAt = Date.now() + (tokens.expires_in * 1000);

  localStorage.setItem(LS_ID_TOKEN(username), tokens.id_token);
  localStorage.setItem(LS_EXPIRES(username),  expiresAt.toString());

  return true;
}

// =============================================================
// Redirect to Cognito login
// =============================================================
function redirectToLogin() {
  window.location.href = AUTH_CONFIG.loginUrl;
}

// =============================================================
// Global: get the current valid ID token for API calls
// Usage: const token = await getAuthToken();
// =============================================================
window.getAuthToken = async function() {
  const username = localStorage.getItem(LS_LAST_USER());
  if (!username) {
    redirectToLogin();
    return null;
  }

  const expiry = parseInt(localStorage.getItem(LS_EXPIRES(username)) || '0', 10);
  const idToken = localStorage.getItem(LS_ID_TOKEN(username));

  // If token is still valid (with 60s buffer), return it
  if (idToken && Date.now() < expiry - 60000) {
    return idToken;
  }

  // Token expired — try to refresh
  const refreshToken = localStorage.getItem(LS_REFRESH(username));
  if (refreshToken) {
    const refreshed = await refreshSession(username, refreshToken);
    if (refreshed) {
      return localStorage.getItem(LS_ID_TOKEN(username));
    }
  }

  // Refresh failed — send back to login
  redirectToLogin();
  return null;
};

// =============================================================
// Initialise on page load
// =============================================================
(async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    try {
      // Exchange the authorization code for tokens
      const tokens = await exchangeCodeForTokens(code);
      storeTokens(tokens);

      // Clean the ?code= from the URL without reloading the page
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (err) {
      console.error('Auth error:', err);
      redirectToLogin();
    }
    return;
  }

  // No code in URL — check for an existing valid session
  const username = localStorage.getItem(LS_LAST_USER());
  if (!username) {
    redirectToLogin();
    return;
  }

  const expiry = parseInt(localStorage.getItem(LS_EXPIRES(username)) || '0', 10);
  const idToken = localStorage.getItem(LS_ID_TOKEN(username));

  if (idToken && Date.now() < expiry - 60000) {
    // Valid session — nothing to do
    return;
  }

  // Try to refresh
  const refreshToken = localStorage.getItem(LS_REFRESH(username));
  if (refreshToken) {
    const refreshed = await refreshSession(username, refreshToken);
    if (refreshed) return;
  }

  // No valid session — redirect to login
  redirectToLogin();
})();