/**
 * IMPORTANT NOTE: PartiQL can be used on this table for queries the way I expect.
 * REASON: PartiQL internally coerces the partition key into a STRING during evaluation.
 * When the PK is a NUMBER, this coercion sometimes fails.
 * When it fails, PartiQL throws: Unsupported type passed: 0
 * This is a known AWS issue with PartiQL + numeric partition keys.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });

export const handler = async () => {
  try {
    const command = new ScanCommand({
      TableName: "Blogs",
      FilterExpression: "published = :p",
      ExpressionAttributeValues: {
        ":p": true
      }
    });

    const data = await client.send(command);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ items: data.Items })
    };

  } catch (err) {
    console.error("Query failed:", err);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
