// This is the Twilio inbound webhook, called when a subscriber replies to a text message
// with the keywords STOP, START, or HELP

import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import crypto from "crypto";

const db = new DynamoDBClient({ region: "us-east-2" });
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

// Normalize phone numbers to E.164
function normalizePhoneNumber(raw) {
  if (!raw) return null;

  let phone = raw.trim().replace(/[\s\-\(\)]/g, "");

  if (/^1\d{10}$/.test(phone)) return `+${phone}`;
  if (/^\+\d{10,15}$/.test(phone)) return phone;
  if (/^\d{10}$/.test(phone)) return `+1${phone}`;

  return null;
}

// Twilio requires XML responses
function twiml(message) {
  return `
    <Response>
      <Message>${message}</Message>
    </Response>
  `.trim();
}

// Twilio signature validation
function validateTwilioSignature(event, authToken) {
  const signature =
    event.headers["x-twilio-signature"] ||
    event.headers["X-Twilio-Signature"];

  // console.log("🔍 Incoming Twilio Signature:", signature);

  const domain = event.requestContext.domainName;
  const path = event.requestContext.path;

 // console.log("🔍 domainName:", domain);
  //console.log("🔍 path:", path);

  const reconstructedUrl = `https://${domain}${path}`;
 // console.log("🔍 Reconstructed URL:", reconstructedUrl);

  if (!signature) {
   // console.log("❌ No signature header found");
    return false;
  }

  const params = new URLSearchParams(event.body || "");
  const sorted = [...params.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );

 // console.log("🔍 Sorted POST params:", sorted);

  let data = reconstructedUrl;
  for (const [key, value] of sorted) {
    data += key + value;
  }

 // console.log("🔍 String to sign:", data);

  const computed = crypto
    .createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

 // console.log("🔍 Computed signature:", computed);

  const isValid = crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );

 // console.log("🔍 Signature comparison result:", isValid);

  return isValid;
}

export const handler = async (event) => {
  try {
    // 1) Validate Twilio signature
    const isValid = validateTwilioSignature(event, AUTH_TOKEN);
   // console.log("Signature valid:", isValid);

    if (!isValid) {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/xml" },
        body: "<Response><Message>Forbidden</Message></Response>"
      };
    }

    // 2) Parse Twilio body
   // console.log("Incoming body:", event.body);
    const params = new URLSearchParams(event.body || "");
    const rawFrom = params.get("From");
    const rawBody = params.get("Body") || "";

    // 3) Normalize phone and keyword
    const phoneNumber = normalizePhoneNumber(rawFrom);
    const keyword = rawBody.trim().toUpperCase();

   // console.log("Normalized phone:", phoneNumber);
   // console.log("Keyword:", keyword);

    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/xml" },
        body: twiml("Invalid phone number")
      };
    }

// 4) STOP → unsubscribe
      if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(keyword)) {
        await db.send(
          new UpdateItemCommand({
            TableName: "Subscribers",
            Key: { phoneNumber: { S: phoneNumber } },
            UpdateExpression: "SET #s = :unsub, unsubTimestamp = :ts, #src = :source",
            ExpressionAttributeNames: { 
              "#s":   "status",
              "#src": "source"
            },
            ExpressionAttributeValues: {
              ":unsub":  { S: "unsubscribed" },
              ":ts":     { N: `${Date.now()}` },
              ":source": { S: "mobile" }
            }
          })
        );

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/xml" },
          body: twiml("You have been unsubscribed. Reply START to resubscribe.")
        };
      }

// 5) START → resubscribe
if (["START", "YES", "UNSTOP"].includes(keyword)) {
  // Check if the phone number exists in the table
  const { GetItemCommand } = await import("@aws-sdk/client-dynamodb");
  const existing = await db.send(new GetItemCommand({
    TableName: "Subscribers",
    Key: { phoneNumber: { S: phoneNumber } }
  }));

  if (!existing.Item) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml" },
      body: twiml("This is a private communication channel for Autobus Cycling Club members only. If you are a member please contact a Ride Leader to be added.")
    };
  }

  await db.send(
    new UpdateItemCommand({
      TableName: "Subscribers",
      Key: { phoneNumber: { S: phoneNumber } },
      UpdateExpression: "SET #s = :sub, optInTimestamp = :ts, #src = :source",
      ExpressionAttributeNames: {
        "#s":   "status",
        "#src": "source"
      },
      ExpressionAttributeValues: {
        ":sub":    { S: "subscribed" },
        ":ts":     { N: `${Date.now()}` },
        ":source": { S: "mobile" }
      }
    })
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/xml" },
    body: twiml("You are now subscribed again.")
  };
}

    // 6) HELP
    if (keyword === "HELP") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/xml" },
        body: twiml("Reply START to subscribe, STOP to unsubscribe.")
      };
    }

    // 7) Unknown command
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml" },
      body: twiml("Command not recognized. Reply HELP for options.")
    };
  } catch (err) {
    console.error("Error handling inbound SMS:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/xml" },
      body: twiml("Internal error")
    };
  }
};
