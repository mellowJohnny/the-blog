/*
 *  getWaxPacks Lambda Function - public list of wax packs for the museum page and the wax pack CMS pages.
 *  No parameters returns every pack; ?year= returns one year. Source of truth is this repo.
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
  const rawYear = event?.queryStringParameters?.year;
  const year = rawYear === undefined ? null : Number(rawYear);

  if (year !== null && !Number.isInteger(year)) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "year must be a whole number" }) };
  }

  try {
    const items = [];
    let lastKey;

    // Both calls return at most 1 MB a page; follow LastEvaluatedKey so the list is never cut short.
    do {
      const data = await ddb.send(year === null
        ? new ScanCommand({ TableName: "WaxPacks", ExclusiveStartKey: lastKey })
        : new QueryCommand({
            TableName: "WaxPacks",
            KeyConditionExpression: "#yr = :year",
            ExpressionAttributeNames: { "#yr": "year" },
            ExpressionAttributeValues: { ":year": year },
            ExclusiveStartKey: lastKey
          }));
      items.push(...data.Items);
      lastKey = data.LastEvaluatedKey;
    } while (lastKey);

    items.sort((a, b) => a.year - b.year || a.packKey.localeCompare(b.packKey));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(items) };
  } catch (err) {
    console.error("Error in getWaxPacks:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Failed to fetch wax packs" }) };
  }
};
