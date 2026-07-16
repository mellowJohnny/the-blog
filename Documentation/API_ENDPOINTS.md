I # API Endpoints

Every endpoint below was found by grepping the frontend `scripts/*.js`
files for `fetch(...)` calls. Each one is its own API Gateway REST API
(own subdomain), fronting its own Lambda — see `ARCHITECTURE.md`. The
Lambda names in the "Lambda" column are *inferred* from context
(comments, variable names) — none of these Lambdas' current source is
in this repo except where noted, so treat the request/response shapes
below as "what the frontend expects today," not as guaranteed current
backend behavior.

All URLs are `https://{id}.execute-api.us-east-2.amazonaws.com/{stage}`.

## Public site — read APIs

### Get all blogs of a given type
- **URL**: `https://qeb63ean2e.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `blogType` (e.g. `1`, `3`, `5`, `99`)
- **Called from**: `fetchBlogs()` in `scripts/blogs.js` (used by `index.html`, `tech.html`)
- **Response**: JSON array of blog objects directly (`postBody`, `author`, `time`, `title`, `img`, `imgCap`) — *not* wrapped in `{Items: [...]}` the way raw DynamoDB `scan`/`query` results are, so the Lambda must post-process the DynamoDB response.
- **Likely Lambda**: `getBlogs` (evolved past `Lambda Functions/getBlogs/getBlogs.js`, which returns the raw `{Items:[...]}` DynamoDB shape and hardcodes `blogType`, neither of which matches current usage).

### Get blog intro text by type
- **URL**: `https://0t14dphgwb.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `blogType`
- **Called from**: `fetchBlogIntroByType()` in `scripts/blogs.js` — defined but **not currently called** anywhere; intro text is now rendered client-side by `renderBlogIntro()`/`renderCardIntro()` instead (hardcoded copy per type). Looks like a deprecated/replaced approach kept around in case it's needed again.
- **Response**: `{ Items: [{ introText }] }`

### Get card sets by year
- **URL**: `https://a92dwyl3ic.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `year`, `blogCat`
- **Called from**: `fetchCardSetsByYear()` in `scripts/wax.js` (used by `waxReviews.html`)
- **Response**: JSON array directly (each item has `postBody`, `year`, `mfg`, `size`, `subsets`, `stars`, `formats`, `headerImg`, `headerImgName`, `footerImg`, `footerImgName`, `setName`, `author`, `now`).

## CMS — blog authoring

### Create blog post
- **URL**: `https://s4ge5t9w06.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ published, title, imgName, imgCap, author, postBody, blogType }`
- **Called from**: `createBlogPost()` in `scripts/cms.js` (used by `cms/createBlogPost.html`)
- **Response**: `{ message }`
- **Note**: this exact URL is the worked example in `Documentation/Creating A New Lambda.txt`, so this is likely the very first endpoint built for the site.
- **No `Authorization` header sent** — see `AUTH.md`.

### Update blog post
- **URL**: `https://836pk40tsl.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: PUT
- **Body**: `{ blogID, title, img, imgCap, published, blogType, time, postBody }`
- **Called from**: `updateBlogPost()` in `scripts/cms.js` (used by `cms/blogEdit.html`)
- **Response**: `{ message }`

### Get all live blogs (for the edit picker)
- **URL**: `https://pqf303gfq6.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `getBlogsForUpdate()` in `scripts/cms.js` (used by `cms/pickBlog.html`)
- **Response**: `{ blogs: [{ title, blogID, blogType }] }` (or `{ items: [...] }` — the frontend accepts either key)

### Get all staged (draft) blogs
- **URL**: `https://sh8girwnxg.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `getStagedBlogsForUpdate()` in `scripts/cms.js` (used by `cms/pickBlog.html`)
- **Response**: `{ items: [{ title, blogID, blogType }] }`

### Get a single blog by ID
- **URL**: `https://gcd40hir88.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `blogID`, `blogType`
- **Called from**: `fetchBlogByID()` in `scripts/cms.js` (used by `cms/blogEdit.html`)
- **Response**: `{ item: { postBody, published, blogType, time, title, img, imgCap, ... } }`

## CMS — card set authoring

### Create card set
- **URL**: `https://05uss9ffij.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ blogStatus, seoPageTitle, seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets, stars, formats, year, postBody, mfg, headerImgName, footerImgName, blogCat }`
- **Called from**: `createCardSet()` in `scripts/cms.js` (used by `cms/createCardSet.html`)
- **Response**: `{ message }` on success; `{ error, details }` on failure (frontend reads `response.ok` to distinguish).

### Update card set
- **URL**: `https://bb8yehibjb.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: PUT
- **Body**: `{ blogStatus, seoPageTitle, seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets, stars, formats, year, postBody, headerImgName, footerImgName, mfg }`
- **Called from**: `updateCardSet()` in `scripts/cms.js` (used by `cms/setEdit.html`)
- **Response**: accepted in several shapes — a plain string, `{ message }`, or `{ body }` (itself either a JSON string to parse or plain text). See `updateCardSet()` in `scripts/cms.js` for the exact unwrapping logic.

### Get all live card sets (for the edit picker)
- **URL**: `https://tx7romovbd.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `fetchAllCardSets()` in `scripts/cms.js` (used by `cms/pickCardSet.html`)
- **Response**: tolerant of several shapes — a raw array, `{ body: "<json array>" }`, `{ body: [...] }`, or `{ Items: [...] }`.

### Get all staged (draft) card sets
- **URL**: `https://ecy21wzgkl.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `fetchAllStagedCardSets()` in `scripts/cms.js` (used by `cms/pickCardSet.html`)
- **Response**: same tolerant unwrapping as above; expects at least `setID`, `setName`.

### Get a single card set by ID
- **URL**: `https://733bwunxq6.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Query params**: `setID`
- **Called from**: `fetchCardSetByID()` in `scripts/cms.js` (used by `cms/setEdit.html`)
- **Response**: array of one item (again tolerant of `{items:[...]}` / raw array / `{body:...}` / `{Items:[...]}`), containing `blogStatus, seoPageTitle, seoMetaDesc, seoURLSlug, seoTags, author, postBody, year, mfg, size, subsets, stars, formats, setName, headerImgName, footerImgName`.

## CMS — image management (S3)

### Get S3 upload URL (presigned PUT)
- **URL**: `https://k95rdenpn5.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: POST
- **Body**: `{ fileName, directory, contentType }` — `directory` is `"img/cards/"` or `"img/blog/"` depending on which image picker triggered the upload.
- **Called from**: `uploadNewImage()` in `scripts/cms.js` (used by both create/edit forms' "Browse" image modal)
- **Response**: `{ uploadUrl, finalUrl }` — `uploadUrl` is a presigned S3 PUT URL the browser then uploads the raw file bytes to directly (bypassing this Lambda for the actual file transfer); `finalUrl` is the resulting public S3 URL.

### List images in the bucket
- **URL**: `https://y3d5n8hq61.execute-api.us-east-2.amazonaws.com/dev`
- **Method**: GET
- **Called from**: `fetchImageList()` / `fetchBlogImageList()` in `scripts/cms.js` (powers the image-browser modal on both create/edit forms)
- **Response**: `{ files: [...] }` — full flat list of every object key in the bucket; the frontend filters client-side by prefix (`img/cards/` vs `img/blog/`).

## Autobus Messaging Platform (SMS)

All three of these send an `Authorization` header carrying the raw
Cognito ID token from `getAuthToken()` (`scripts/auth.js`) — see
`AUTH.md`. These are also the only endpoints on the whole site that do
so.

### Send broadcast
- **URL**: `https://yzivv3xuw2.execute-api.us-east-2.amazonaws.com/prod/admin/send`
- **Method**: POST
- **Body**: `{ message, mode }` — `mode` is `"test"` or `"live"`.
- **Called from**: `sendBroadcast()` in `scripts/adminSMS.js` (used by `cms/smsAdmin.html`)
- **Response**: `{ results: [{ phone, firstName, status: "SUCCESS"|"FAILED", error }], mode }`
- **Lambda**: this is `sendAlertHandler/index.mjs` — **the one Lambda whose source lives in this repo**. See `LAMBDA_FUNCTIONS.md`.

### Bulk import subscribers
- **URL**: `https://05b6ofo7i1.execute-api.us-east-2.amazonaws.com/prod/subscribers/bulk-upload`
- **Method**: POST
- **Body**: a JSON array of subscriber records, already in DynamoDB typed-JSON format (`{ phoneNumber: { S: "..." }, ... }`), per the in-app help text in `cms/smsAdmin.html`.
- **Called from**: `uploadBtn` click handler in `scripts/adminSMS.js`
- **Response**: `{ deletedCount, importedCount }` on success. **Destructive**: this call deletes *all* existing subscribers before importing the new list (confirmed with the user via a JS `confirm()` dialog first).

### Add a single subscriber
- **URL**: `https://05b6ofo7i1.execute-api.us-east-2.amazonaws.com/prod/subscribers`
- **Method**: POST
- **Body**: `{ firstName, phoneNumber }`
- **Called from**: `addSubscriberSaveBtn` click handler in `scripts/adminSMS.js`
- **Response**: 2xx on success; `{ error }` on failure (e.g. duplicate phone number, per the in-app copy).
