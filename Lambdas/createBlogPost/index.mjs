import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    // Parse JSON body from API Gateway
    const body = JSON.parse(event.body);

    // Generate a UUID for the blog
    const blogID = randomUUID();
    const now = new Date().toISOString();

    // Ensure blogType is a number
    const blogType = parseInt(body.blogType, 10);
    if (Number.isNaN(blogType)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "blogType must be a valid number" }),
      };
    }

    // Normalize "published" to a real Boolean
    const published =
      body.published === true ||
      body.published === "true" ||
      body.published === 1 ||
      body.published === "1";

    // Build the DynamoDB item
    const item = {
      blogType,
      time: now,
      author: body.author,
      blogID,
      img: body.imgName || "none",
      imgCap: body.imgCap || "none",
      postBody: body.postBody,
      published, // <-- always a real Boolean now
      title: body.title
    };

    // Write to DynamoDB
    const dbResponse = await docClient.send(
      new PutCommand({
        TableName: "Blogs",
        Item: item
      })
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        message: "Blog Post successfully created!",
        item,
        dynamoResponse: dbResponse
      })
    };

  } catch (err) {
    console.error("Insert failed:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
