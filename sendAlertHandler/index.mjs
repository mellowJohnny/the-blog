// index.mjs

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

/**
 * Lambda handler for POST /send-alert
 * Expects JSON body: { "message": "Ride tomorrow at 7am..." }
 */
export const handler = async (event) => {
  try {
    // Parse body
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
        body: JSON.stringify({ ok: true, sentTo: 0 })
      };
    }

    // Send SMS to each subscribed number
    const sendPromises = items.map((item) =>
      client.messages.create({
        body: message,
        from: TWILIO_FROM_NUMBER,
        to: item.phoneNumber.S
      })
    );

    await Promise.all(sendPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, sentTo: items.length })
    };
  } catch (err) {
    console.error("Error in sendAlertHandler:", err);
    return {
      statusCode: 500,
      body: "Internal error"
    };
  }
};

