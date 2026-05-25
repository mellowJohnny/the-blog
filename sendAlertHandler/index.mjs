// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by uploading the new .zip file 
// in the Console -> Code tab -> Update dropdown -> Update from a .zip file

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
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

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const message = body.message?.trim();

    if (!message) {
      return {
        statusCode: 400,
        body: "message is required"
      };
    }

    // Fetch all subscribed users
    const subscribers = await db.send(new ScanCommand({
      TableName: "Subscribers",
      FilterExpression: "#s = :sub",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":sub": { S: "subscribed" } }
    }));

    const items = subscribers.Items || [];

    if (items.length === 0) {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
          "Access-Control-Allow-Headers": "Content-Type,x-api-key",
          "Access-Control-Allow-Methods": "POST,OPTIONS"
        },
        body: JSON.stringify({ results: [] })
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
        results.push({
          phone,
          firstName,
          status: "FAILED",
          error: err.message || "Unknown error"
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
        "Access-Control-Allow-Headers": "Content-Type,x-api-key",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      body: JSON.stringify({ results })
    };

  } catch (err) {
    console.error("Error in sendAlertHandler:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
        "Access-Control-Allow-Headers": "Content-Type,x-api-key",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      body: "Internal error"
    };
  }
};

