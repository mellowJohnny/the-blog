// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change it here in VS Code, then redeploy by pasting this file
// into the Console -> Code tab inline editor and clicking Deploy
//
// Emails a build summary when an Amplify deploy finishes. Triggered by
// an EventBridge rule on "Amplify Deployment Status Change", filtered
// to SUCCEED/FAILED, and publishes plain text to an SNS email topic.
//
// The event only carries appId/branchName/jobId/jobStatus, so the
// commit, duration and per-step detail come from an amplify:GetJob
// call. See LAMBDA_FUNCTIONS.md for the AWS setup steps.

import { AmplifyClient, GetJobCommand } from "@aws-sdk/client-amplify";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const amplify = new AmplifyClient({ region: "us-east-2" });
const sns = new SNSClient({ region: "us-east-2" });

const APP_NAME = "the-blog (mellowjohnny.cc)";

function formatDuration(start, end) {
  if (!start || !end) return "unknown";
  const totalSeconds = Math.round((new Date(end) - new Date(start)) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function buildMessage({ branchName, jobId, jobStatus, summary, steps }) {
  const lines = [
    `Amplify build ${jobStatus} on ${APP_NAME}`,
    "",
    `Branch:   ${branchName}`,
    `Job:      #${jobId}`,
    `Duration: ${formatDuration(summary?.startTime, summary?.endTime)}`
  ];

  if (summary?.commitId) {
    lines.push(`Commit:   ${summary.commitId.slice(0, 7)}`);
  }
  if (summary?.commitMessage) {
    lines.push(`Message:  ${summary.commitMessage.trim().split("\n")[0]}`);
  }

  if (steps?.length) {
    lines.push("", "Steps:");
    for (const step of steps) {
      lines.push(`  ${step.status.padEnd(9)} ${step.stepName} (${formatDuration(step.startTime, step.endTime)})`);
    }

    // The failing step's log is the thing you actually want on a
    // failure, so surface it rather than making someone dig for it.
    const failed = steps.find((s) => s.status === "FAILED");
    if (failed?.logUrl) {
      lines.push("", `Failed step log: ${failed.logUrl}`);
    }
  }

  return lines.join("\n");
}

export const handler = async (event) => {
  const { appId, branchName, jobId, jobStatus } = event.detail || {};

  if (!appId || !branchName || !jobId) {
    console.error("Unexpected event shape:", JSON.stringify(event));
    return;
  }

  // A GetJob failure shouldn't swallow the notification - a build that
  // failed silently is the worst case. Send what the event gave us.
  let summary = null;
  let steps = null;
  try {
    const { job } = await amplify.send(new GetJobCommand({ appId, branchName, jobId }));
    summary = job?.summary;
    steps = job?.steps;
  } catch (err) {
    console.error("GetJob failed, sending event-only summary:", err);
  }

  await sns.send(new PublishCommand({
    TopicArn: process.env.SNS_TOPIC_ARN,
    Subject: `Amplify build ${jobStatus} - ${branchName} #${jobId}`,
    Message: buildMessage({ branchName, jobId, jobStatus, summary, steps })
  }));
};
