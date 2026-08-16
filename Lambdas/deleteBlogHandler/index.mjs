// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by uploading the new .zip file
// in the Console -> Code tab -> Update dropdown -> Update from a .zip file
//
// Deletes a blog post. Uses a DynamoDB DeleteItem keyed on blogType+time,
// guarded by a ConditionExpression requiring blogID to match too, so a
// stale/mismatched key can't silently delete the wrong item.
//
// Blogs table key: partition key `blogType` (Number), sort key `time`
// (String, ISO 8601).

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
    const blogID = body.blogID?.trim();
    const blogType = body.blogType;
    const time = body.time?.trim();

    if (!blogID || !Number.isInteger(blogType) || !time) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "blogID, blogType (integer), and time are required" })
      };
    }

    await db.send(new DeleteItemCommand({
      TableName: "Blogs",
      Key: {
        blogType: { N: String(blogType) },
        time: { S: time }
      },
      // Don't delete unless the blogID also matches - a safety check
      // against a stale/mismatched blogType+time key
      ConditionExpression: "blogID = :blogID",
      ExpressionAttributeValues: { ":blogID": { S: blogID } }
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Blog post deleted." })
    };

  } catch (err) {
    console.error("Error in deleteBlogHandler:", err);

    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Blog post not found (blogID/blogType/time mismatch)" })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal error" })
    };
  }
};
