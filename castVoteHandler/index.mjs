// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by uploading the new .zip file
// in the Console -> Code tab -> Update dropdown -> Update from a .zip file
//
// Casts a thumbs up/down vote on a card set review. Uses an atomic
// DynamoDB UpdateItem (ADD) so concurrent votes increment safely instead
// of a read-modify-write race.
//
// Cards table key: partition key `setName` (String), sort key `year`
// (Number).

import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({ region: "us-east-2" });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const setName = body.setName?.trim();
    const year = body.year;
    const voteType = body.voteType;

    if (!setName || !Number.isInteger(year) || (voteType !== "up" && voteType !== "down")) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "setName, year (integer), and voteType ('up' or 'down') are required" })
      };
    }

    const attr = voteType === "up" ? "upvotes" : "downvotes";

    const result = await db.send(new UpdateItemCommand({
      TableName: "Cards",
      Key: {
        setName: { S: setName },
        year: { N: String(year) }
      },
      UpdateExpression: `ADD ${attr} :inc`,
      ExpressionAttributeValues: { ":inc": { N: "1" } },
      // Don't silently create a new item for a bad/mistyped setName+year
      ConditionExpression: "attribute_exists(setName)",
      ReturnValues: "UPDATED_NEW"
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ [attr]: parseInt(result.Attributes[attr].N, 10) })
    };

  } catch (err) {
    console.error("Error in castVoteHandler:", err);

    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Card set not found" })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal error" })
    };
  }
};
