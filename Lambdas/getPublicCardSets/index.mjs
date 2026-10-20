/*
 *  getPublicCardSets Lambda Function
 *  Public list of every live card set for browseBySet.html - names only.
 *  The CMS's getCardSets returns full items (review bodies) behind a login,
 *  so it can't serve a public page; this one projects five small fields.
 *
 *  Source of truth is this repo - don't edit it only in the AWS Console.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  let statusCode = 200;
  let responseBody = "";

  try {
    const items = [];
    let lastKey;

    // Query returns at most 1 MB a page; follow LastEvaluatedKey so the list
    // can never be silently cut short as the number of sets grows.
    do {
      const data = await ddb.send(new QueryCommand({
        TableName: "Cards",
        IndexName: "blogStatus-year-index",
        KeyConditionExpression: "blogStatus = :status",
        // year is a DynamoDB reserved word, so it has to be aliased.
        ProjectionExpression: "setID, setName, blogCat, #yr, hasChecklist",
        ExpressionAttributeNames: { "#yr": "year" },
        ExpressionAttributeValues: { ":status": "OK" },
        ExclusiveStartKey: lastKey
      }));
      items.push(...data.Items);
      lastKey = data.LastEvaluatedKey;
    } while (lastKey);

    responseBody = JSON.stringify(items);
  } catch (err) {
    console.log("DynamoDB error:", err);
    statusCode = 500;
    responseBody = JSON.stringify({ error: "Failed to fetch card sets" });
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
