// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Lists every subscriber in the LIVE Subscribers table for the Autobus
// SMS admin page's "...list all subscribers" modal (cms/smsAdmin.html,
// scripts/adminSMS.js). Read-only: a Scan that follows LastEvaluatedKey
// so a table over 1 MB isn't silently truncated.
//
// This returns phone numbers, so its API Gateway route (GET
// /subscribers/list on the same API as subscribeHandler) must sit behind
// the Cognito Authorizer. The table name is fixed here and never taken
// from the request, so it can't be pointed at anything else. The list
// must always be current, so no Cache-Control header is sent.

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({ region: "us-east-2" });

const TABLE_NAME = "Subscribers";

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://www.junkwaxhockey.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  if (event?.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  try {
    const subscribers = [];
    let lastEvaluatedKey;

    do {
      const result = await db.send(new ScanCommand({
        TableName: TABLE_NAME,
        // status is a DynamoDB reserved word, same escape sendAlertHandler uses.
        ProjectionExpression: "phoneNumber, firstName, #s",
        ExpressionAttributeNames: { "#s": "status" },
        ExclusiveStartKey: lastEvaluatedKey
      }));

      for (const item of result.Items || []) {
        subscribers.push({
          firstName: item.firstName?.S || "",
          phoneNumber: item.phoneNumber?.S || "",
          status: item.status?.S || ""
        });
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Case-insensitive by name; the phone number breaks ties so the order is stable.
    subscribers.sort((a, b) =>
      a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase()) ||
      a.phoneNumber.localeCompare(b.phoneNumber)
    );

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true, total: subscribers.length, subscribers })
    };
  } catch (err) {
    console.error("Error in listSubscribers:", err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: "Internal server error" })
    };
  }
};
