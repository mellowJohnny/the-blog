/*
*  getCardSets Lambda Function
*  Fetches all card set reviews for the CMS
*  Uses ProjectionExpression to only return the fields we need
*/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  let responseBody = "";
  let statusCode = 200;
// OLD
 // const params = {
   // TableName: "Cards",
    // IndexName: "blogStatus-year-index",
    // ProjectionExpression: "setName, setID",
    // KeyConditionExpression: "blogStatus = :status",
    // ExpressionAttributeValues: {
    //  ":status": "OK"
    // },
    // ScanIndexForward: true
 // };

 // V1
 // const params = {
   // TableName: "Cards",
   // IndexName: "blogStatus-year-index",
   // ProjectionExpression: "setName, setID, blogCat, year",
   // KeyConditionExpression: "blogStatus = :status",
   // ExpressionAttributeValues: {
     // ":status": "OK"
   // },
   // ScanIndexForward: true
  // };

  // V2
  const params = {
    TableName: "Cards",
    IndexName: "blogStatus-year-index",
    KeyConditionExpression: "blogStatus = :status",
    ExpressionAttributeValues: {
      ":status": "OK"
    },
    ScanIndexForward: true
  };
  

  try {
    const data = await ddb.send(new QueryCommand(params));
    responseBody = JSON.stringify(data.Items);
  } catch (err) {
    console.log("DynamoDB error:", err);
    statusCode = 500;
    responseBody = JSON.stringify({
      error: "Failed to fetch card sets",
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
