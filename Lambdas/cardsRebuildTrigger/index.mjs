// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change it here in VS Code, then redeploy by pasting this file
// into the Console -> Code tab inline editor and clicking Deploy
//
// Starts an Amplify build whenever a live card set changes in a way the
// static site is generated from. Triggered by the Cards table's DynamoDB
// Stream (new and old images); each build runs tools/generateReviewPages,
// which rewrites the /reviews/<slug>/ pages, the link manifest and the
// sitemap from the live sets. The stream's batching window collapses a burst
// of saves into one invocation, and so one build.
//
// Not API-Gateway-backed and called by no frontend code. Setup steps and the
// IAM permissions it needs (stream read plus amplify:StartJob): LAMBDA_FUNCTIONS.md.

import { AmplifyClient, StartJobCommand } from "@aws-sdk/client-amplify";

const amplify = new AmplifyClient({ region: "us-east-2" });

const APP_ID = "d20qsyoicusf3p";
const BRANCH_NAME = "main";

// Fields that reach the generated pages, manifest or sitemap. Vote counts,
// hasChecklist and the review text are deliberately absent: the page's own
// JS renders those live, so changing them needs no build.
const STATIC_OUTPUT_FIELDS = [
  "blogStatus", "setName", "year", "blogCat", "setID", "stars",
  "seoURLSlug", "seoPageTitle", "seoMetaDesc", "seoTags",
  "headerImg", "headerImgName", "now", "updatedAt"
];

const isLive = (image) => image?.blogStatus?.S === "OK";
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Stream images keep DynamoDB's typed shape ({ S: "..." }), which is
// enough to compare values without unmarshalling.
export function changesStaticOutput(record) {
  const { eventName, dynamodb = {} } = record;
  const { OldImage, NewImage } = dynamodb;
  if (eventName === "INSERT") return isLive(NewImage);
  if (eventName === "REMOVE") return isLive(OldImage);
  if (eventName !== "MODIFY") return false;
  if (!isLive(OldImage) && !isLive(NewImage)) return false;
  return STATIC_OUTPUT_FIELDS.some((field) => !sameValue(OldImage?.[field], NewImage?.[field]));
}

export const handler = async (event) => {
  const changed = (event.Records || []).filter(changesStaticOutput);
  if (changed.length === 0) {
    console.log(`${event.Records?.length || 0} stream record(s), none change the static output`);
    return { started: false };
  }

  const names = [...new Set(changed.map((r) => (r.dynamodb.NewImage || r.dynamodb.OldImage)?.setName?.S).filter(Boolean))];
  const jobReason = `Card set change: ${names.join(", ")}`.slice(0, 255);

  // A failure throws, so the stream retries the batch; rebuilding is idempotent.
  const { jobSummary } = await amplify.send(new StartJobCommand({
    appId: APP_ID,
    branchName: BRANCH_NAME,
    jobType: "RELEASE",
    jobReason
  }));
  console.log(`Started Amplify job #${jobSummary.jobId}: ${jobReason}`);
  return { started: true, jobId: jobSummary.jobId };
};
