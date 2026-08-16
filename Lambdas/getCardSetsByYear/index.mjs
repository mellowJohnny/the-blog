/**
 * The MAIN Lambda function used to fetch card sets on the front-end
 * Changed Jan. 29, 2026 to use a new Global Search Index on 'blogCat' and 'year'
 * PLUS a filter on Status so we only get live sets returned
 * ALso, no more shitty PartiQL :-)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("EVENT:", JSON.stringify(event));

  let responseBody = "";
  let statusCode = 200;

  try {
    // Read our query parameters passed in from the API call to getCardSetsByYear. 
    // API is called from waxReviews.html, which calls fetchCardSetsByYear(year,sortOrder,blogCat);
    const rawYear = event?.queryStringParameters?.year;
    // Our most important param - what 'category' of set do we have? Used to fetch either 'reg', 'tims', or 'mcd'
    // Default to reg if nothing is passed
    const blogCat = event?.queryStringParameters?.blogCat || "reg"; 
    const year = parseInt(rawYear, 10);

    // *********** DEBUG ***************
    // console.log("Parsed year:", year);
    // console.log("Requested blogCat:", blogCat);

    if (isNaN(year)) {
      throw new Error("Invalid or missing 'year' query parameter");
    }

    /**
     * Query the NEW GSI: blogCat-year-index
     * - PK: blogCat
     * - SK: year
     * Then filter for blogStatus = "OK"
     */
    const params = {
      TableName: "Cards",
      IndexName: "blogCat-year-index",
      KeyConditionExpression: "#cat = :cat AND #yr = :year",
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#cat": "blogCat",
        "#yr": "year",
        "#status": "blogStatus"
      },
      ExpressionAttributeValues: {
        ":cat": blogCat,
        ":year": year,
        ":status": "OK"
      }
    };

    const data = await docClient.send(new QueryCommand(params));
    // ******** DEBUG **************
    // console.log("DynamoDB response:", JSON.stringify(data));

    // Return only the items array (not the metadata)
    responseBody = JSON.stringify(data.Items);
  } catch (err) {
    console.log("Error:", err);
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
      "Cache-Control": "public, max-age=1800" // CloudFront cache for 5 minutes
    },
    body: responseBody,
  };
};
