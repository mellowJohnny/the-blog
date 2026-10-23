# Autobus Messaging Platform — Core Platform Documentation

## Overview

This document describes the three core files that make up the Autobus Messaging Platform frontend and broadcast backend. It covers file locations, responsibilities, key behaviours, and deployment notes.

---

## 1. SMS Broadcast Lambda (`index.mjs`)

### 1.1 Overview

The broadcast Lambda (sendAlertHandler) is the backend engine of the platform. It receives a message and a mode from the frontend, fetches the appropriate list of subscribers from DynamoDB, and sends an SMS to each one via Twilio.

**Location:** VS Code  
**Runtime:** Node.js (ES Module)  
**Trigger:** `POST /admin/send` via API Gateway  
**Authorizer:** CognitoAuthorizer (JWT required)

> ⚠️ **Important:** This Lambda bundles the Twilio library and must **not** be edited in the AWS Console. All changes must be made in VS Code and redeployed by uploading a new `.zip` file via Console → Code tab → Update dropdown → Update from a .zip file.
>
> **General Configuration:** Timeout: 1 minute 3 seconds (This MUST be at least one minute to allow for the time Twilio takes to send each SMS message

---

### 1.2 Environment Variables

| Variable | Purpose |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token |
| `TWILIO_FROM_NUMBER` | The Twilio phone number messages are sent from |

---

### 1.3 IAM Permissions

| Permission | Purpose |
| --- | --- |
| `dynamodb:Scan` | Read subscriber records from the active table |

---

### 1.4 Behaviour

The Lambda accepts a JSON body with two fields:

| Field | Type | Description |
| --- | --- | --- |
| `message` | String | The SMS message body to send |
| `mode` | String | `"live"` or `"test"` — defaults to `"test"` if not specified or invalid |

**Processing steps:**

1. Parses `message` and `mode` from the request body
2. Selects the DynamoDB table based on mode:

| Mode | DynamoDB Table |
| --- | --- |
| `live` | `Subscribers` |
| `test` | `SubscribersTest` |

3. Scans the selected table for all records where `status = "subscribed"`
4. Sends an SMS via Twilio to each subscriber's `phoneNumber`
5. Records a `SUCCESS` or `FAILED` result for each recipient
6. Returns the full results array to the frontend

**Response format:**

```
{
  "results": [
    {
      "phone": "+16135550123",
      "firstName": "Christian",
      "status": "SUCCESS",
      "error": ""
    },
    {
      "phone": "+16135550124",
      "firstName": "Jane",
      "status": "FAILED",
      "error": "The number is unsubscribed"
    }
  ],
  "mode": "live"
}
```

---

### 1.5 Key Design Decisions

- **Default mode is** `test` — if the `mode` field is missing or anything other than `"live"`, the Lambda defaults to test mode. This prevents accidental live broadcasts.
- **Per-recipient error handling** — each SMS send is wrapped in its own try/catch. A failure for one recipient does not stop the rest of the broadcast; it is recorded as `FAILED` and processing continues.
- **Separate test table** — `SubscribersTest` is a dedicated DynamoDB table for test subscribers, keeping test sends completely isolated from the live subscriber list.
- **Messages sent sequentially** — the Lambda sends one SMS at a time (not in parallel) to avoid overwhelming the Twilio API and to ensure accurate per-recipient result tracking.

---

### 1.6 CORS Headers

All responses include the following headers:

| Header | Value |
| --- | --- |
| `Access-Control-Allow-Origin` | `https://www.junkwaxhockey.com` |
| `Access-Control-Allow-Headers` | `Content-Type, x-api-key` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |

---

## 2. SMS Admin Page (`smsAdmin.html`)

### 2.1 Overview

The main admin interface for the Autobus Messaging Platform. Provides the message composition form, results display, bulk import modal, and user guide modal.

**Location:** `/cms/smsAdmin.html`  
**Access:** Restricted — requires Cognito authentication via `auth.js`

---

### 2.2 Page Structure

| Section | Description |
| --- | --- |
| Masthead | Club logo and "Autobus Messaging Platform" branding |
| Navigation | Links to CMS dashboard, bulk import modal, and user guide modal |
| Left column | Message composition form |
| Right column | Send results panel |
| Bulk Import modal | Subscriber list upload interface |
| User Guide modal | Plain-language help documentation |
| Spinner overlay | Full-page loading indicator shown during send operations |

---

### 2.3 Navigation Links

| Link | Action |
| --- | --- |
| `back to cms...` | Returns to the main CMS dashboard (`/cms/wlcms.html`) |
| `bulk import...` | Opens the Bulk Import modal |
| `user guide...` | Opens the User Guide modal |

---

### 2.4 Message Composition Form

| Element | Description |
| --- | --- |
| **Message textarea** | Pre-filled with `"Autobus Cycling Club:\n"` as a default template |
| **SMS stats bar** | Live display of character count, encoding (GSM‑7 or Unicode), and segment count |
| **Test Mode checkbox** | When checked, sends only to `SubscribersTest` table |
| **GSM‑Safe Mode checkbox** | When checked, automatically replaces smart punctuation with plain equivalents |
| **Send button** | Triggers the broadcast; prompts for confirmation in Live Mode |

---

### 2.5 Results Panel

Displayed after a send operation. Shows:

- The message that was sent (in a styled bubble)
- A table with one row per recipient showing: Name, Phone Number, Status, Error
- A summary row with total successful and failed counts

---

### 2.6 Bulk Import Modal

See the Bulk Upload section of this page for full details.

---

### 2.7 User Guide Modal

A plain-language reference modal accessible from the navigation bar. Covers:

- Composing and sending messages
- GSM‑Safe Mode
- Test Mode vs Live Mode
- Reading the SMS stats bar
- Using the bulk import feature
- A note on SMS segments and Twilio costs

---

### 2.8 Script and Style Dependencies

| File | Purpose |
| --- | --- |
| `/scripts/auth.js` | Cognito authentication — loaded first in `<head>` |
| `/styles/styles.css` | All platform styles |
| `/scripts/adminSMS.js` | All page logic and interactivity |
| Google Fonts | Spicy Rice, Nunito, Special Elite, Work Sans, Source Sans 3 |

---

## 3. Admin JavaScript (`adminSMS.js`)

### 3.1 Overview

All client-side logic for the SMS admin page. Handles message composition, broadcast sending, SMS stats, bulk import, and modal interactions.

**Location:** `/scripts/adminSMS.js`  
**Depends on:** `auth.js` (must be loaded first), `getAuthToken()` global function

---

### 3.2 Module Structure

| Section | Description |
| --- | --- |
| Initialisation | Binds event listeners, pre-fills textarea, initialises SMS stats |
| GSM‑7 character set | Complete set of valid GSM‑7 characters used for encoding detection |
| `applyGsmSafeMode()` | Replaces smart punctuation with plain ASCII equivalents |
| `updateSmsStats()` | Calculates and displays character count, encoding, and segment count |
| `sendBroadcast()` | Handles the full send flow including auth, confirmation, API call, and results rendering |
| Bulk import | File selection, drag-and-drop, validation, upload, and modal state management |
| Help modal | Open, close, and overlay-click handling |

---

### 3.3 SMS Stats (`updateSmsStats`)

Called on every keystroke in the message textarea and on GSM‑Safe Mode toggle. Calculates:

| Metric | GSM‑7 | Unicode |
| --- | --- | --- |
| Single segment limit | 160 characters | 70 characters |
| Multi-segment limit | 153 characters per segment | 67 characters per segment |
| Encoding detected by | All characters present in GSM‑7 set | Any character outside GSM‑7 set |

If GSM‑Safe Mode is enabled, smart punctuation is replaced before stats are calculated, which may change the encoding from Unicode to GSM‑7.

---

### 3.4 Send Broadcast (`sendBroadcast`)

**Flow:**

| Step | Action |
| --- | --- |
| 1 | Reads message and mode from the form |
| 2 | If Live Mode: shows a confirmation dialog before proceeding |
| 3 | Validates that the message is not empty |
| 4 | Shows the full-page spinner |
| 5 | Calls `getAuthToken()` to retrieve the current Cognito JWT |
| 6 | POSTs `{ message, mode }` to `POST /admin/send` with the JWT in the `Authorization` header |
| 7 | Renders the results table with per-recipient status |
| 8 | Appends a summary row (successful / failed counts) |
| 9 | Resets the textarea to the default template |
| 10 | Hides the spinner |

**Error handling:** Network or API errors are caught and displayed as a red error row in the results table.

---

### 3.5 Bulk Import

**Constants:**

```
const BULK_IMPORT_API = 'https://05b6ofo7i1.execute-api.us-east-2.amazonaws.com/prod/subscribers/bulk-upload';
```

**Flow:**

| Step | Action |
| --- | --- |
| 1 | User clicks `bulk import...` → modal opens, state resets |
| 2 | User selects or drops a `.json` file |
| 3 | File is validated client-side (must be a non-empty JSON array) |
| 4 | Record count is shown; Upload button enabled |
| 5 | User clicks Upload → confirmation dialog shown |
| 6 | `getAuthToken()` called; file POSTed to bulk upload endpoint |
| 7 | On success: Cancel/Upload buttons hidden, Close button shown, success message displayed |
| 8 | On error: error message shown, Upload button re-enabled |

`resetModal()` restores the modal to its initial state (buttons, feedback, file input) and is called on both Cancel and Close.

---

### 3.6 API Endpoints

| Endpoint | Method | Function | Auth |
| --- | --- | --- | --- |
| `/admin/send` | POST | Send SMS broadcast | Cognito JWT required |
| `/subscribers/bulk-upload` | POST | Truncate and import subscriber list | Cognito JWT required |

---

### 3.7 Key Constants and Defaults

| Constant / Default | Value |
| --- | --- |
| Message template | `"Autobus Cycling Club:\n"` |
| Bulk import API | `https://05b6ofo7i1.execute-api.us-east-2.amazonaws.com/prod/subscribers/bulk-upload` |
| Broadcast API | `https://yzivv3xuw2.execute-api.us-east-2.amazonaws.com/prod/admin/send` |
| Default send mode | `test` (enforced by both frontend checkbox and Lambda default) |

---

# Bulk Upload

## Autobus Messaging Platform

## Overview

This document describes the technical changes made to the Autobus Messaging Platform, covering the bulk subscriber import feature, API security hardening, and supporting frontend and backend changes.

---

## 1. Bulk Subscriber Import

### 1.1 Background

The platform requires an annual refresh of the subscriber list to reflect current club membership. Previously this was a manual process with no tooling. The bulk import feature provides a repeatable, end-to-end workflow for replacing the subscriber list each year.

### 1.2 CSV Upload (no pre-processing required)

**Updated 2026-09-19:** the CSV export from the club sign-up form is now uploaded directly — the manual "pre-process into DynamoDB typed JSON with an AI prompt" step this section used to describe has been eliminated entirely. The Lambda itself (see 1.3 below) extracts the **"Name"** and **"Your mobile number"** columns, maps them to `firstName`/`phoneNumber`, and normalizes the phone number to E.164 — no other tool or step is needed between the CSV export and the bulk import modal.

**Requirements on the CSV file:**

- Must have a header row containing `Name` and `Your mobile number` columns (matched trimmed and case-insensitively) — every other column is ignored.
- The full `Name` column value is stored as `firstName` (unlike the old manual-prep prompt, which took only the first token).
- A row with a missing name or a phone number that can't be normalized to E.164 is skipped and reported back in the upload result, not silently dropped.
- A phone number that appears more than once in the file is also skipped (first occurrence kept) — `BatchWriteItem` rejects a duplicate key within one request, so this has to be caught before the write, not left to "last write wins" (see 1.3's Key design decisions — this replaces what used to be handled entirely by the pre-processing step).

---

### 1.3 Backend — Lambda Function (`Lambdas/bulkSubscriberUpload/index.mjs`)

*Filename corrected 2026-09-19 — previously mislabeled here as* `bulkUploadSubscribers.mjs`*; the real checked-in source (this repo's source of truth as of 2026-08-15) is* `Lambdas/bulkSubscriberUpload/index.mjs`*.*

**Location:** AWS Lambda console  
**Runtime:** Node.js (ES Module)  
**Trigger:** `POST /subscribers/bulk-upload` via API Gateway

**Behaviour:**

1. Receives the raw CSV file content from the frontend as `{ csvContent: "..." }` — no pre-processing required.
2. Parses the CSV with a small hand-rolled parser (handles quoted fields, and commas/newlines embedded inside quotes) and maps only the `Name`/`Your mobile number` columns to `firstName`/`phoneNumber`, normalizing the phone number to E.164.
3. Validates every row before touching the table — a row with a missing name, an unnormalizable phone number, or a phone number duplicated elsewhere in the file is skipped and reported, not silently dropped or overwritten. A structurally bad file (missing required columns, zero valid rows) is rejected before anything is deleted.
4. Scans the existing DynamoDB table and deletes all records (`BatchWriteItem` with `DeleteRequest`) — only once the new list has been fully parsed and validated.
5. Writes the new records to the table (`BatchWriteItem` with `PutRequest`) in chunks of 25 (DynamoDB limit).
6. Retries any unprocessed items with exponential backoff (up to 5 attempts).
7. Returns a response containing `deletedCount`, `importedCount`, and `skippedRows` (a `{ row, reason }` entry for every row that was skipped).

**Environment Variables:**

| Variable | Value |
| --- | --- |
| `TABLE_NAME` | DynamoDB table name |

**Required IAM Permissions:**

| Permission | Purpose |
| --- | --- |
| `dynamodb:Scan` | Read existing records for truncation |
| `dynamodb:BatchWriteItem` | Delete existing and write new records |

**Key design decisions:**

- The table is fully truncated before each import to ensure no stale records from previous years remain
- Only the `phoneNumber` partition key is fetched during the scan (no need to retrieve full records for deletion)
- Pagination is handled automatically — the scan loops until all records are retrieved regardless of table size
- The table is only truncated once the entire CSV has been parsed and validated — a bad file never leaves the table empty with nothing to replace it.
- Duplicate phone numbers within the uploaded file are detected and skipped by the Lambda itself (first occurrence kept, later ones reported in `skippedRows`) — this replaced the old workflow's reliance on pre-processing to remove duplicates before upload, since `BatchWriteItem` rejects a duplicate key within one request outright.
- No CSV-parsing npm dependency was added — the hand-rolled parser keeps this Lambda inline-paste deployable (no zip), unlike `sendAlertHandler`/`parseChecklistPdf`, which need a real dependency bundled.

---

### 1.4 API Gateway

**Resource:** `POST /subscribers/bulk-upload`  
**Integration:** Lambda proxy (enabled)  
**Authorizer:** CognitoAuthorizer (see the Security section)

**CORS Configuration on** `/subscribers/bulk-upload`**:**

| Setting | Value |
| --- | --- |
| OPTIONS method | Enabled (auto-created via Enable CORS) |
| Default 4XX gateway response | Enabled |
| Default 5XX gateway response | Enabled |
| `Access-Control-Allow-Origin` | `https://www.junkwaxhockey.com` |
| `Access-Control-Allow-Headers` | `Content-Type, x-api-key` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |

---

### 1.5 Frontend — Bulk Import Modal

**Location:** `/cms/smsAdmin.html` (markup + CSS), `/scripts/adminSMS.js` (logic) — corrected 2026-09-19, this page previously listed a stale `/cms/autobusSMS.html` filename.

A **"bulk import..."** link was added to the CMS navigation bar. Clicking it opens a modal dialog with the following behaviour:

| Step | Action |
| --- | --- |
| 1 | User selects or drag-and-drops a `.csv` file — the club sign-up export, uploaded directly |
| 2 | The file is read as raw text client-side — no parsing or validation happens in the browser; the Lambda is the sole parser (see 1.3) |
| 3 | An approximate record count is shown for review (a simple line count — the Lambda's own count, once it parses the file, is the authoritative one) |
| 4 | User clicks **Upload** — a confirmation dialog is shown: *"This will delete ALL existing subscribers and replace them with ~N new records. Are you sure?"* |
| 5 | On confirmation, the raw CSV text is POSTed to the bulk upload endpoint as `{ csvContent }` |
| 6 | On success, the modal displays: *"✓ Deleted X existing subscriber(s) and imported Y new one(s)."*, plus a list of any skipped rows and why, and shows a **Close** button |
| 7 | On error, the error message is displayed and the Upload button is re-enabled |

**Notes:**

- The modal resets fully on close, ready for the next import
- Clicking outside the modal closes it
- The Cancel and Upload buttons are hidden on success and replaced with a single Close button

---

# Subscriber Management

## Autobus Messaging Platform — Subscriber Management & Inbound SMS Documentation

## Overview

This document covers the two Lambdas responsible for subscriber management and inbound SMS handling: the single subscriber add handler and the Twilio inbound webhook. It also documents the Add Subscriber frontend modal and the source audit trail design.

---

## 1. Add Subscriber Lambda (`Lambdas/subscribeHandler/index.mjs`)

### 1.1 Overview

Handles the addition of a single new subscriber via the admin frontend. Validates input, normalises the phone number to E.164 format, and writes the record to DynamoDB. Rejects duplicate phone numbers.

**Location:** AWS Lambda console  
**Runtime:** Node.js (ES Module)  
**Trigger:** `POST /subscribers` via API Gateway  
**Authorizer:** CognitoAuthorizer (JWT required)  
**Editable in Console:** Yes — no external dependencies

---

### 1.2 Environment Variables

None — no environment variables required.

---

### 1.3 Required IAM Permissions

| Permission | Purpose |
| --- | --- |
| `dynamodb:PutItem` | Write new subscriber record |

---

### 1.4 Request Format

```json
{
  "phoneNumber": "905 555 0123",
  "firstName": "Christian Reid"
}
```

| Field | Required | Description |
| --- | --- | --- |
| `phoneNumber` | Yes | Mobile number in any common format — normalised to E.164 by the Lambda |
| `firstName` | Yes | Full name of the subscriber |

---

### 1.5 Phone Number Normalisation

The Lambda accepts phone numbers in multiple formats and normalises them to E.164:

| Input Format | Example | Output |
| --- | --- | --- |
| 10 digits | `9055550123` | `+19055550123` |
| 11 digits starting with 1 | `19055550123` | `+19055550123` |
| Already E.164 | `+19055550123` | `+19055550123` |
| Formatted | `(905) 555-0123` | `+19055550123` |
| Invalid | `12345` | Rejected — 400 |

---

### 1.6 Behaviour

1. Parses `phoneNumber` and `firstName` from the request body
2. Validates both fields are present and non-empty
3. Normalises the phone number to E.164
4. Writes the record to DynamoDB using `PutItemCommand` with a `ConditionExpression` to prevent overwrites
5. Returns success or an appropriate error response

**DynamoDB record written:**

```json
{
  "phoneNumber":    { "S": "+19055550123" },
  "firstName":      { "S": "Christian Reid" },
  "status":         { "S": "subscribed" },
  "source":         { "S": "web" },
  "optInTimestamp": { "N": "1234567890000" }
}
```

---

### 1.7 Response Codes

| Status | Condition | Response |
| --- | --- | --- |
| 200 | Success | `{ ok: true, message, phoneNumber, firstName }` |
| 400 | Missing or invalid phone number | `{ ok: false, error: "..." }` |
| 400 | Missing name | `{ ok: false, error: "A name is required" }` |
| 409 | Phone number already exists | `{ ok: false, error: "This phone number is already subscribed" }` |
| 500 | Unexpected error | `{ ok: false, error: "Internal server error" }` |

---

### 1.8 Key Design Decisions

- `ConditionExpression: "attribute_not_exists(phoneNumber)"` — prevents silent overwrites of existing records. Duplicates are explicitly rejected with a 409
- `firstName` stores the full name — the field is named `firstName` for consistency with the bulk import schema, but stores the full name as entered
- `source` is hardcoded to `"web"` — single subscriber adds via the admin frontend are always web-initiated
- **Phone normalisation is Lambda-side** — the frontend accepts any reasonable format and lets the Lambda clean it up

---

### 1.9 CORS Headers

All responses include:

| Header | Value |
| --- | --- |
| `Access-Control-Allow-Origin` | `https://www.junkwaxhockey.com` |
| `Access-Control-Allow-Headers` | `Content-Type, x-api-key` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |

---

## 2. Inbound SMS Webhook Lambda (`Lambdas/inboundSMSHandler/index.mjs`)

### 2.1 Overview

Handles inbound SMS messages from Twilio subscribers. Processes STOP, START, and HELP keywords, updates DynamoDB accordingly, and returns TwiML responses to Twilio.

**Location:** AWS Lambda console  
**Runtime:** Node.js (ES Module)  
**Trigger:** Twilio webhook — `POST` on inbound SMS  
**Authorizer:** None — this endpoint must be publicly accessible for Twilio to call it  
**Editable in Console:** Yes — no external dependencies

> ⚠️ **Security note:** This Lambda validates every inbound request using Twilio's HMAC-SHA1 signature before processing. Requests with an invalid or missing signature are rejected with a 403. This prevents unauthorised callers from triggering subscriber updates.

---

### 2.2 Environment Variables

| Variable | Purpose |
| --- | --- |
| `TWILIO_AUTH_TOKEN` | Used to validate the Twilio webhook signature |

---

### 2.3 Required IAM Permissions

| Permission | Purpose |
| --- | --- |
| `dynamodb:GetItem` | Check if a phone number exists before processing START |
| `dynamodb:UpdateItem` | Update subscriber status, timestamps, and source |

---

### 2.4 Keyword Handling

| Keyword(s) | Action | DynamoDB Update | TwiML Response |
| --- | --- | --- | --- |
| `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` | Unsubscribe | `status = unsubscribed`, `unsubTimestamp`, `source = mobile` | "You have been unsubscribed. Reply START to resubscribe." |
| `START`, `YES`, `UNSTOP` (existing subscriber) | Resubscribe | `status = subscribed`, `optInTimestamp`, `source = mobile` | "You are now subscribed again." |
| `START`, `YES`, `UNSTOP` (unknown number) | Reject | No DynamoDB update | Private channel message (see below) |
| `HELP` | Info | No DynamoDB update | "Reply START to subscribe, STOP to unsubscribe." |
| Any other | Unknown | No DynamoDB update | "Command not recognized. Reply HELP for options." |

**Private channel rejection message (unknown START):**

> *"This is a private communication channel for Autobus Cycling Club members only. If you are a member please contact a Ride Leader to be added."*

---

### 2.5 START Flow Detail

The START handler includes an existence check to prevent unknown numbers from self-subscribing:

1. `GetItem` is called to check if the phone number exists in the `Subscribers` table
2. If **no record found** → returns the private channel rejection message, no DynamoDB write
3. If **record found** → updates status to `subscribed`, sets `optInTimestamp` and `source = mobile`

This ensures the platform remains a closed, invite-only subscriber list.

---

### 2.6 Twilio Duplicate Reply Note

Twilio has built-in keyword handling for START and STOP that cannot be fully disabled. As a result, subscribers may occasionally receive two reply messages — one from Twilio's default handler and one from this Lambda. This is an accepted limitation for a rare edge case (unknown numbers texting START) and does not affect normal subscriber behaviour.

---

### 2.7 DynamoDB Reserved Word Handling

Both `status` and `source` are reserved words in DynamoDB and must be aliased in expressions:

| Attribute | Alias |
| --- | --- |
| `status` | `#s` |
| `source` | `#src` |

---

## 3. Add Subscriber Frontend Modal

### 3.1 Overview

A modal dialog accessible from the `add subscriber...` navigation link on the SMS admin page. Allows the admin to add a single subscriber by name and phone number.

**Nav link:** `add subscriber...`  
**Files:** `smsAdmin.html` (markup), `styles.css` (styles), `adminSMS.js` (logic)

---

### 3.2 Form Fields

| Field | Type | Validation |
| --- | --- | --- |
| Name | Text input | Required — must be non-empty |
| Mobile Number | Text input | Required — format validation handled by Lambda |

---

### 3.3 Behaviour

| Step | Action |
| --- | --- |
| 1 | Modal opens, Name field receives focus automatically |
| 2 | Admin enters name and phone number |
| 3 | Client-side validation checks both fields are non-empty |
| 4 | `getAuthToken()` called; record POSTed to `POST /subscribers` |
| 5 | On success: *"✓ [Name] has been successfully added."* shown; Add/Cancel replaced by Close button |
| 6 | On duplicate: *"This phone number is already subscribed"* shown; Add button re-enabled |
| 7 | On invalid number: Lambda error message shown; Add button re-enabled |
| 8 | On close: modal resets fully for next use |

---

### 3.4 API Endpoint

| Endpoint | Method | Auth |
| --- | --- | --- |
| `https://05b6ofo7i1.execute-api.us-east-2.amazonaws.com/prod/subscribers` | POST | Cognito JWT required |

---

## 4. Source Audit Trail

All subscriber records include a `source` field indicating how the subscriber was added to the platform:

| Source Value | How Set | Action |
| --- | --- | --- |
| `web` | Bulk import Lambda | Annual CSV import |
| `web` | `subscribeHandler` Lambda | Single subscriber add via admin frontend |
| `mobile` | `inboundSMSHandler` Lambda | Subscriber replied START or STOP via SMS |

This provides a clear audit trail of subscriber origin and opt-in/opt-out channel directly in DynamoDB without requiring any additional reporting infrastructure.

---

## 5. API Gateway Summary

All subscriber management endpoints live under the same API as the broadcast endpoint:

| Method | Resource | Lambda | Authorizer |
| --- | --- | --- | --- |
| POST | `/admin/send` | `index.mjs` (broadcast) | CognitoAuthorizer |
| POST | `/subscribers` | `subscribeHandler` | CognitoAuthorizer |
| POST | `/subscribers/bulk-upload` | `bulkUploadSubscribers.mjs` | CognitoAuthorizer |
| POST | `/twilio/inbound` (or equivalent) | `inboundSMSHandler` | None (public) |

---

# Security

## API Security — Cognito Authorizer

### 2.1 Background

Prior to this change, all API Gateway endpoints were publicly accessible. Any party with knowledge of an endpoint URL could call it directly without authentication, bypassing the Cognito-protected admin pages entirely.

### 2.2 Solution

A **Cognito User Pool Authorizer** was added to API Gateway and attached to all sensitive endpoints. API Gateway now validates the Cognito JWT token on every inbound request before it reaches any Lambda function. Requests without a valid token receive a `401 Unauthorized` response immediately.

### 2.3 Cognito Configuration

| Setting | Value |
| --- | --- |
| Region | `us-east-2` |
| User Pool ID | `us-east-2_wEdajhS7F` |
| App Client ID | `1m22cfonep7l85th9ut1obk0pe` |
| Auth flow | Authorization Code (`response_type=code`) |
| Client secret | None |
| Redirect URI | `https://www.junkwaxhockey.com/cms/wlcms.html` |
| Login URL | `https://mellowjohnny.auth.us-east-2.amazoncognito.com/login` |
| Refresh token expiry | 30 days (Cognito default) |

### 2.4 API Gateway Authorizer

**Name:** `CognitoAuthorizer`  
**Type:** Cognito User Pool  
**Token source:** `Authorization` header

**Protected endpoints:**

| Method | Resource | Authorizer |
| --- | --- | --- |
| POST | `/admin/send` | CognitoAuthorizer |
| POST | `/subscribers/bulk-upload` | CognitoAuthorizer |

---

### 2.5 Frontend — `auth.js`

**Location:** `/scripts/auth.js`  
**Included on:** All pages under `/cms` (added as the first `<script>` tag in `<head>`)

`auth.js` is a vanilla JavaScript module (no external dependencies) that manages the full Cognito authentication lifecycle for the admin frontend.

**Page load behaviour:**

| Condition | Action |
| --- | --- |
| `?code=` present in URL | Exchange authorization code for tokens, store in `localStorage`, clean URL |
| Valid token in `localStorage` | Do nothing — page loads normally |
| Expired token, refresh token available | Silently refresh the ID token using the refresh token |
| No valid session | Redirect to Cognito login page |

**Token storage (**`localStorage` **keys):**

| Key | Contents |
| --- | --- |
| `CognitoIdentityServiceProvider.{clientId}.LastAuthUser` | Current username |
| `CognitoIdentityServiceProvider.{clientId}.{username}.idToken` | JWT ID token |
| `CognitoIdentityServiceProvider.{clientId}.{username}.refreshToken` | Refresh token |
| `CognitoIdentityServiceProvider.{clientId}.{username}.tokenExpiry` | Expiry timestamp (ms) |

**Global function:**

```
const token = await getAuthToken();
```

Returns the current valid ID token, automatically refreshing it if expired. Redirects to login if no valid session exists. Used in all API fetch calls as the `Authorization` header value.

**Session lifecycle:**

| Event | Behaviour |
| --- | --- |
| Login | Tokens stored in `localStorage` after code exchange |
| Active use | Token silently refreshed after ~1 hour as needed |
| 30 days inactive | Refresh token expires — user redirected to login on next page load |

---

### 2.6 Fetch Call Updates

All API fetch calls in `adminSMS.js` were updated to include the Cognito ID token in the `Authorization` header:

```
const token = await getAuthToken();

const res = await fetch(API_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': token
  },
  body: JSON.stringify(payload)
});
```

**Affected fetch calls:**

| Function | Endpoint |
| --- | --- |
| `sendBroadcast()` | `POST /admin/send` |
| Bulk import upload handler | `POST /subscribers/bulk-upload` |

---

## 3. Additional Changes

### 3.1 Message Template Default

The message textarea now pre-fills with a default template on page load:

```
Autobus Cycling Club:
```

The textarea also resets to this default template (rather than empty) after a successful broadcast send.

### 3.2 Help Modal

A **"help..."** link was added to the CMS navigation bar. Clicking it opens a modal with a plain-language user guide covering:

- Composing and sending messages
- GSM‑Safe Mode
- Test Mode vs Live Mode
- Reading the character/encoding/segment stats
- Using the bulk import feature
- A note on SMS segments and cost

---

## 4. File Summary

| File | Type | Change |
| --- | --- | --- |
| `bulkUploadSubscribers.mjs` | Lambda | New — bulk import with truncate-then-write logic |
| `auth.js` | JavaScript | New — Cognito token exchange and session management |
| `adminSMS.js` | JavaScript | Updated — bulk import logic, auth token headers, help modal, message template |
| `smsAdmin.html` | HTML | Updated — bulk import modal, help modal, nav links |
| `styles.css` | CSS | Updated — bulk import and help modal styles |
| All `/cms` HTML pages | HTML | Updated — `auth.js` script tag added to `<head>` |
