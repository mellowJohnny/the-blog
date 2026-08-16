import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    // Parse JSON body from Proxy Integration
    const body = JSON.parse(event.body || "{}");

    const {
      blogID,
      title,
      img,
      imgCap,
      postBody,
      published,
      blogType,
      time
    } = body;

    // Validate required fields
    if (!title) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Title is required" })
      };
    }

    if (blogType === undefined || Number.isNaN(Number(blogType))) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid blogType" })
      };
    }

    if (!time) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid time" })
      };
    }

    // Build UpdateCommand
    const command = new UpdateCommand({
      TableName: "Blogs",
      Key: {
        blogType: Number(blogType),
        time: time
      },
      UpdateExpression: `
        SET title = :title,
            img = :img,
            imgCap = :imgCap,
            postBody = :postBody,
            published = :published
      `,
      ExpressionAttributeValues: {
        ":title": title,
        ":img": img,
        ":imgCap": imgCap,
        ":postBody": postBody,
        ":published": published === true || published === "true"
      },
      ReturnValues: "UPDATED_NEW"
    });

    const result = await docClient.send(command);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Blog updated successfully",
        updated: result.Attributes
      })
    };

  } catch (err) {
    console.error("Update failed:", err);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: "Internal server error",
        details: err.message
      })
    };
  }
};
