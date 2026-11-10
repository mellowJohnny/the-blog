/*
 *  deleteWaxPack Lambda Function - deletes one WaxPacks item by year + packKey (cms/waxPackEdit.html).
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
    const year = body.year;
    const packKey = typeof body.packKey === "string" ? body.packKey.trim() : "";

    if (!Number.isInteger(year) || !packKey) {
      return reply(400, { error: "year (integer) and packKey are required" });
    }

    // The condition makes a stale key a 404 instead of a silent no-op.
    await ddb.send(new DeleteCommand({
      TableName: "WaxPacks",
      Key: { year, packKey },
      ConditionExpression: "attribute_exists(packKey)"
    }));

    return reply(200, { message: "Wax pack deleted." });
  } catch (err) {
    console.error("Error in deleteWaxPack:", err);

    if (err.name === "ConditionalCheckFailedException") {
      return reply(404, { error: "Wax pack not found" });
    }
    return reply(500, { error: "Internal error" });
  }
};
