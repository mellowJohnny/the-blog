import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Create DynamoDB client outside the handler for reuse
const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    console.log("RAW EVENT:", JSON.stringify(event, null, 2));

    // Check query parameters
    if (
      !event.queryStringParameters ||
      !event.queryStringParameters.blogType
    ) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "Missing blogType query parameter" }),
      };
    }

    // Convert blogType to a string number (DynamoDB expects N type as string)
    const blogTypeStr = event.queryStringParameters.blogType.toString();
    console.log("TYPE OF blogType:", typeof event.queryStringParameters.blogType);
    console.log("VALUE OF blogType:", event.queryStringParameters.blogType);


    const command = new QueryCommand({
      TableName: "Blogs",
      KeyConditionExpression: "blogType = :bt",
      FilterExpression: "published = :p",
      ExpressionAttributeValues: {
        ":bt": Number(blogTypeStr),
        ":p": true
      }
    });

    const result = await docClient.send(command);

    const items = result.Items ?? [];

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(items), // MUST be string
    };
  } catch (err) {
    console.error("LAMBDA ERROR:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=600" // 10 min - new posts are a deliberate CMS action, not urgent to reflect instantly
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
