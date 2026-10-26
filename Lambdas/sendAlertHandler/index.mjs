// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by uploading the new .zip file 
// in the Console -> Code tab -> Update dropdown -> Update from a .zip file
// NOTE: Default Mode is "test"
//
// Twilio, not our table, is the authority on opt-outs. When it refuses a
// number with error 21610 (the recipient texted STOP or similar), that
// number is marked "unsubscribed" here too so the next broadcast skips it.
// This needs dynamodb:UpdateItem on both tables; without it the broadcast
// still runs and the result row says the number could not be marked.

import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import twilio from "twilio";

// Environment variables (set these in the Lambda console)
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER
} = process.env;

// AWS + Twilio clients
const db = new DynamoDBClient({ region: "us-east-2" });
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Twilio's "attempt to send to unsubscribed recipient" error code
const TWILIO_OPTED_OUT = 21610;

// Mirrors a Twilio opt-out into our table. Never throws: a failure here
// must not stop the broadcast. Returns whether the number is now marked.
async function markUnsubscribed(tableName, phone) {
  try {
    await db.send(new UpdateItemCommand({
      TableName: tableName,
      Key: { phoneNumber: { S: phone } },
      UpdateExpression: "SET #s = :unsub, unsubTimestamp = :ts, #src = :source",
      // Never create a record, and never overwrite a status changed since the scan.
      ConditionExpression: "attribute_exists(phoneNumber) AND #s = :sub",
      ExpressionAttributeNames: { "#s": "status", "#src": "source" },
      ExpressionAttributeValues: {
        ":unsub":  { S: "unsubscribed" },
        ":sub":    { S: "subscribed" },
        ":ts":     { N: `${Date.now()}` },
        ":source": { S: "twilio" }
      }
    }));
    return true;
  } catch (err) {
    // Changed since the scan (e.g. they already texted STOP): nothing left to do.
    if (err.name === "ConditionalCheckFailedException") return true;
    console.error("Could not mark a number unsubscribed:", err.name);
    return false;
  }
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const message = body.message?.trim();
    const mode = body.mode === "live" ? "live" : "test";   // default to test mode

    if (!message) {
      return {
        statusCode: 400,
        body: "message is required"
      };
    }

    // Pick the correct table
    const tableName = mode === "live" ? "Subscribers" : "SubscribersTest";

    console.log("Broadcast mode:", mode);
    console.log("Using table:", tableName);

    // Fetch all subscribed users
    const subscribers = await db.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: "#s = :sub",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":sub": { S: "subscribed" } }
    }));

    const items = subscribers.Items || [];

    if (items.length === 0) {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "https://www.junkwaxhockey.com",
          "Access-Control-Allow-Headers": "Content-Type,x-api-key",
          "Access-Control-Allow-Methods": "POST,OPTIONS"
        },
        body: JSON.stringify({ results: [], mode })
      };
    }

    const results = [];

    // Send SMS to each subscribed number
    for (const item of items) {
      const phone = item.phoneNumber?.S;
      const firstName = item.firstName?.S || "";

      try {
        await client.messages.create({
          body: message,
          from: TWILIO_FROM_NUMBER,
          to: phone
        });

        results.push({
          phone,
          firstName,
          status: "SUCCESS",
          error: ""
        });

      } catch (err) {
        let error = err.message || "Unknown error";

        if (Number(err.code) === TWILIO_OPTED_OUT) {
          error = (await markUnsubscribed(tableName, phone))
            ? "Opted out with Twilio (21610) - marked unsubscribed"
            : "Opted out with Twilio (21610) - could not mark unsubscribed";
        }

        results.push({
          phone,
          firstName,
          status: "FAILED",
          error
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://www.junkwaxhockey.com",
        "Access-Control-Allow-Headers": "Content-Type,x-api-key",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      body: JSON.stringify({ results, mode })
    };

  } catch (err) {
    console.error("Error in sendAlertHandler:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "https://www.junkwaxhockey.com",
        "Access-Control-Allow-Headers": "Content-Type,x-api-key",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      body: "Internal error"
    };
  }
};
