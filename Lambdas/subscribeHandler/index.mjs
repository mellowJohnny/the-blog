import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({ region: "us-east-2" });

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Basic E.164 normalization helper
function normalizePhoneNumber(raw) {
  if (!raw) return null;

  let phone = raw.trim();

  // Remove spaces, dashes, parentheses
  phone = phone.replace(/[\s\-\(\)]/g, "");

  // If it starts with "1" and is 11 digits, convert to +1
  if (/^1\d{10}$/.test(phone)) {
    return `+${phone}`;
  }

  // If it already starts with + and looks valid
  if (/^\+\d{10,15}$/.test(phone)) {
    return phone;
  }

  // If it's 10 digits, assume US/Canada and add +1
  if (/^\d{10}$/.test(phone)) {
    return `+1${phone}`;
  }

  return null; // Not a valid format
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const rawPhone = body.phoneNumber;
    const firstName = body.firstName?.trim() || "";

    if (!rawPhone) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "A phone number is required"
        })
      };
    }

    if (!firstName) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "A name is required"
        })
      };
    }

    const phoneNumber = normalizePhoneNumber(rawPhone);

    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Invalid phone number format"
        })
      };
    }

    try {
      await db.send(new PutItemCommand({
        TableName: "Subscribers",
        Item: {
          phoneNumber:    { S: phoneNumber },
          firstName:      { S: firstName },
          status:         { S: "subscribed" },
          optInTimestamp: { N: `${Date.now()}` },
          source:         { S: "web" }
        },
        ConditionExpression: "attribute_not_exists(phoneNumber)"
      }));
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        return {
          statusCode: 409,
          headers: HEADERS,
          body: JSON.stringify({
            ok: false,
            error: "This phone number is already subscribed"
          })
        };
      }
      throw err; // Let the outer catch handle other errors
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        message: "Subscription successful",
        phoneNumber,
        firstName
      })
    };

  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: "Internal server error"
      })
    };
  }
};
