# CMS Guide

There are two separate authoring tools under `/cms`, both gated by
Cognito login (see `AUTH.md`): **cardStack** (blog posts + card set
reviews) and the **Autobus Messaging Platform** (SMS broadcast tool,
unrelated to blog content, for a cycling club).

Both tools' pages (including `wlcms.html`'s nav menu and
`smsAdmin.html`'s two-column form/results layout) now have mobile
support via the site's shared `@media (max-width: 600px)` breakpoint —
see `FRONTEND.md`'s "Mobile / responsive design" section for the
gotchas encountered doing that pass (missing viewport meta tags, a
descendant-selector CSS trap, table display-role quirks) before
changing layout CSS on these pages.

## cardStack — blog & card set authoring

Entry point: `cms/wlcms.html` — a simple menu linking to:

| Page | Purpose |
|---|---|
| `cms/createBlogPost.html` | Author a brand-new blog post. |
| `cms/createCardSet.html` | Author a brand-new card set review. |
| `cms/pickBlog.html` | Lists all blogs (split into "live" and "staged" columns) — click one to edit it. |
| `cms/pickCardSet.html` | Same, for card sets. |
| `cms/blogEdit.html` | Edit form for a single blog post, reached via `?blogID=&blogType=`. |
| `cms/setEdit.html` | Edit form for a single card set, reached via `?setID=`. |

All create/edit forms use a hosted **TinyMCE** WYSIWYG editor
(`initTinyEditor()` in `scripts/cms.js`) for the body text — the
frontend never reads a plain `<textarea>` value for the post body, it
always pulls fresh HTML out of the active TinyMCE instance at submit
time.

### Draft / publish workflow

- Blog posts: `published` = `true` (live) / `false` (staging), chosen from a dropdown.
- Card sets: `blogStatus` = `"OK"` (live) / `"staged"` (draft), chosen from a dropdown.

`pickBlog.html` and `pickCardSet.html` both show live and staged items
side-by-side in two columns, grouped under headers by blog type /
card set category (`BLOG_TYPE_LABELS`, `CARDSET_CATEGORY_LABELS` in
`scripts/cms.js`).

### Image picker / uploader

Both create/edit forms include a "Browse" button next to image fields
that opens a shared modal (`#imageBrowserModal`, driven entirely by
`scripts/cms.js`):

1. Lists every image currently in the S3 bucket (filtered client-side to `img/blog/` or `img/cards/` depending on which form opened it), with thumbnails, via a search box.
2. Clicking a thumbnail fills in the target form field and closes the modal.
3. Or, upload a brand-new file: pick a file → requests a presigned S3 PUT URL from a Lambda → uploads the raw file directly to S3 from the browser → refreshes the image list and auto-selects the new file.

See `API_ENDPOINTS.md` → "CMS — image management" for the exact calls.

### Preview

`setEdit.html` has a "Preview" button (`openPreview()` in
`scripts/cms.js`) that renders the card set exactly as it will appear
on the live site, using the current (possibly unsaved) form values, in
a modal — lets you check formatting before publishing. `createBlogPost.html`/`blogEdit.html` don't currently have an equivalent preview.

## Autobus Messaging Platform — `cms/smsAdmin.html`

A separate, unrelated tool bolted onto the same `/cms` area and
Cognito login, for sending SMS broadcasts to a cycling club's member
list via Twilio. Logic lives in `scripts/adminSMS.js`; the send itself
is handled by the one Lambda whose source is in this repo,
`sendAlertHandler` (see `LAMBDA_FUNCTIONS.md`).

The in-app "user guide" link (`#helpLink`) opens a modal with the
fullest first-party explanation of this tool, summarized here:

- **Message box**: always starts pre-filled with `"Autobus Cycling Club:\n"` — you add the ride details after it.
- **Live character/segment counter**: detects whether the message fits the **GSM-7** SMS character set (160 chars/segment) or has to fall back to **Unicode** (70 chars/segment, e.g. because of curly quotes or emoji) — messages over one segment's worth of characters get split (and billed) as multiple SMS segments by Twilio.
- **GSM-Safe Mode** checkbox: auto-replaces smart-quotes/em-dashes/ellipses with plain-ASCII equivalents to keep the message in the cheaper GSM-7 encoding.
- **Test Mode** checkbox (checked by default): sends only to the `SubscribersTest` table instead of the real `Subscribers` list — use this to sanity-check a message before going live. Unchecking it requires confirming a "LIVE MODE" browser dialog before anything sends.
- **Results panel**: per-recipient success/failure table plus a summary count, after a send.
- **Bulk import** (nav link): replaces the *entire* subscriber list from an uploaded pre-processed JSON file (already in DynamoDB typed-JSON format). This is destructive — it deletes all existing subscribers first — and is described in-app as something "prepared separately once a year from the club sign-up data," i.e. an external, out-of-band process not represented anywhere in this repo.
- **Add subscriber** (nav link): a small modal to add one subscriber by name + mobile number without doing a full bulk re-import.
