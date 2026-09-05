import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const blogID = qs.blogID;

    if (!blogID) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Missing blogID" })
      };
    }

    const command = new QueryCommand({
      TableName: "Blogs",
      IndexName: "blogID-index",
      KeyConditionExpression: "blogID = :id",
      ExpressionAttributeValues: {
        ":id": blogID
      }
    });

    const data = await docClient.send(command);

    if (!data.Items || data.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Blog not found" })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ item: data.Items[0] })   // ✅ CORRECT
    };
    

  } catch (err) {
    console.error("Error fetching blog:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Internal server error", details: err.message })
    };
  }
};
