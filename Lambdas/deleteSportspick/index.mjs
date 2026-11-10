/*
 *  deleteSportspick Lambda Function - deletes one Sportspicks item by releaseYear + figureKey (cms/sportspickEdit.html).
 *  Source of truth is this repo - don't edit it only in the AWS Console.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.junkwaxhockey.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "DELETE,OPTIONS"
};

const reply = (statusCode, body) => ({ statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const releaseYear = body.releaseYear;
    const figureKey = typeof body.figureKey === "string" ? body.figureKey.trim() : "";

    if (!Number.isInteger(releaseYear) || !figureKey) {
      return reply(400, { error: "releaseYear (integer) and figureKey are required" });
    }

    // The condition makes a stale key a 404 instead of a silent no-op.
    await ddb.send(new DeleteCommand({
      TableName: "Sportspicks",
      Key: { releaseYear, figureKey },
      ConditionExpression: "attribute_exists(figureKey)"
    }));

    return reply(200, { message: "Figure deleted." });
  } catch (err) {
    console.error("Error in deleteSportspick:", err);

    if (err.name === "ConditionalCheckFailedException") {
      return reply(404, { error: "Figure not found" });
    }
    return reply(500, { error: "Internal error" });
  }
};
