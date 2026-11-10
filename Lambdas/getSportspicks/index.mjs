/*
 *  getSportspicks Lambda Function - public list of Sportspicks figures for the gallery page and the Sportspicks CMS pages.
 *  No parameters returns every figure; ?releaseYear= returns one year. Source of truth is this repo.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=1800"
};

export const handler = async (event) => {
  const rawYear = event?.queryStringParameters?.releaseYear;
  const releaseYear = rawYear === undefined ? null : Number(rawYear);

  if (releaseYear !== null && !Number.isInteger(releaseYear)) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "releaseYear must be a whole number" }) };
  }

  try {
    const items = [];
    let lastKey;

    // Both calls return at most 1 MB a page; follow LastEvaluatedKey so the list is never cut short.
    do {
      const data = await ddb.send(releaseYear === null
        ? new ScanCommand({ TableName: "Sportspicks", ExclusiveStartKey: lastKey })
        : new QueryCommand({
            TableName: "Sportspicks",
            KeyConditionExpression: "releaseYear = :year",
            ExpressionAttributeValues: { ":year": releaseYear },
            ExclusiveStartKey: lastKey
          }));
      items.push(...data.Items);
      lastKey = data.LastEvaluatedKey;
    } while (lastKey);

    items.sort((a, b) => a.releaseYear - b.releaseYear || a.figureKey.localeCompare(b.figureKey));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(items) };
  } catch (err) {
    console.error("Error in getSportspicks:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Failed to fetch figures" }) };
  }
};
