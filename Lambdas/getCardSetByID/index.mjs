import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  let statusCode = 200;
  let responseBody = "";

  // Extract setID safely from all possible locations
  const setID =
    event?.queryStringParameters?.setID ??
    event?.pathParameters?.setID ??
    event?.setID;

  if (!setID) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: "Missing setID parameter" }),
    };
  }

  const command = new QueryCommand({
    TableName: "Cards",
    IndexName: "setID-index",
    KeyConditionExpression: "setID = :id",
    ExpressionAttributeValues: { ":id": setID },
  });

  try {
    const data = await docClient.send(command);

    // Log for debugging consistency
    console.log("UPDATE FETCH RESULT:", JSON.stringify(data));

    // Normalize the response so the frontend always receives the same shape
    responseBody = JSON.stringify({
      items: data.Items ?? []
    });

  } catch (err) {
    console.log("Lambda error:", err);
    statusCode = 500;
    responseBody = JSON.stringify({ error: err.message });
  }

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: responseBody,
  };
};
