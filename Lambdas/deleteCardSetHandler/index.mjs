// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by uploading the new .zip file
// in the Console -> Code tab -> Update dropdown -> Update from a .zip file
//
// Deletes a card set review. Uses a DynamoDB DeleteItem keyed on
// setName+year, guarded by a ConditionExpression requiring setID to
// match too, so a stale/mismatched key can't silently delete the wrong
// item.
//
// Cards table key: partition key `setName` (String), sort key `year`
// (Number). `setID` is a non-key attribute (see DATA_MODEL.md).

import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({ region: "us-east-2" });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "DELETE,OPTIONS"
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const setID = body.setID?.trim();
    const setName = body.setName?.trim();
    const year = body.year;

    if (!setID || !setName || !Number.isInteger(year)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "setID, setName, and year (integer) are required" })
      };
    }

    await db.send(new DeleteItemCommand({
      TableName: "Cards",
      Key: {
        setName: { S: setName },
        year: { N: String(year) }
      },
      // Don't delete unless the setID also matches - a safety check
      // against a stale/mismatched setName+year key
      ConditionExpression: "setID = :setID",
      ExpressionAttributeValues: { ":setID": { S: setID } }
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Card set deleted." })
    };

  } catch (err) {
    console.error("Error in deleteCardSetHandler:", err);

    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Card set not found (setID/setName/year mismatch)" })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal error" })
    };
  }
};
