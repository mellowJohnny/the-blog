// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Public read endpoint backing the "Checklist" link/modal on
// waxReviews.html (see scripts/wax.js). Takes ?setName= and returns
// every card in the Checklists table for that setName - both the main
// set and any insert sets, undifferentiated - as a raw JSON array,
// same "return the Items array as-is" convention as getCardSetsByYear.
// The frontend groups by type/insertSetName and sorts by sortIndex; see
// DATA_MODEL.md's Checklists table for why those fields exist rather
// than relying on DynamoDB's own item order.
//
// No Cognito Authorizer - same public trust level as the card set
// reviews themselves (getCardSetsByYear, getBlogs, etc).

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  let responseBody = "";
  let statusCode = 200;

  try {
    const setName = event?.queryStringParameters?.setName;

    if (!setName) {
      throw new Error("Missing 'setName' query parameter");
    }

    const data = await docClient.send(new QueryCommand({
      TableName: "Checklists",
      KeyConditionExpression: "setName = :setName",
      ExpressionAttributeValues: { ":setName": setName }
    }));

    responseBody = JSON.stringify(data.Items);
  } catch (err) {
    console.log("Error:", err);
    statusCode = 500;
    responseBody = JSON.stringify({ error: err.message });
  }

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=1800"
    },
    body: responseBody
  };
};
