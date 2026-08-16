/*
*  getStagedCardSets Lambda Function
*/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  let responseBody = "";
  let statusCode = 200;

  const params = {
    TableName: "Cards",
    IndexName: "blogStatus-year-index",
    ProjectionExpression: "setName, setID, blogCat, #yr",
    ExpressionAttributeNames: {
      "#yr": "year"
    },
    KeyConditionExpression: "blogStatus = :status",
    ExpressionAttributeValues: {
      ":status": "staged"
    },
    ScanIndexForward: true
  };

  try {
    const data = await ddb.send(new QueryCommand(params));
    console.log("STAGED QUERY RESULT:", JSON.stringify(data));

    responseBody = JSON.stringify(data.Items);
  } catch (err) {
    console.log("DynamoDB error:", err);
    statusCode = 500;
    responseBody = JSON.stringify({
      error: "Failed to fetch staged card sets",
      details: err
    });
  }

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE"
    },
    body: responseBody
  };
};
