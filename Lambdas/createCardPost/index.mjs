/*
*  createCardSet Lambda Function
*  Used by the CMS page to create a new card set
*/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Step 1: Create DynamoDB Document Client - provides better formatted JSON
const client = new DynamoDBClient({ region: "us-east-2" });
const documentClient = DynamoDBDocumentClient.from(client);

// Define handler function, the entry point to our code for the Lambda service
// We receive the object that triggers the function as a parameter from the web page submit
export const handler = async (event) => {

    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            body: JSON.stringify({ message: "CORS preflight OK" })
        };
    }

    // Parse JSON body for proxy integration
    let payload = event;
    if (event.body) {
        try {
            payload = JSON.parse(event.body);
        } catch (e) {
            console.log("Body parse error:", e);
        }
    }

    // Extract values from the Event object
    // The Event object's properties were populated when we made the API call from our html page
    let blogStatus = payload.blogStatus;
    let seoPageTitle = payload.seoPageTitle;
    let seoMetaDesc = payload.seoMetaDesc;
    let seoURLSlug = payload.seoURLSlug;
    let seoTags = payload.seoTags;
    let author = payload.author;
    let setName = payload.setName;
    let postBody = payload.postBody;
    let mfg = payload.mfg;
    let size = payload.size;
    let subsets = payload.subsets;
    let stars = payload.stars;
    let formats = payload.formats;
    let headerImgName = payload.headerImgName;
    let footerImgName = payload.footerImgName;
    let blogCat = payload.blogCat;

    // Fix the Year - needs to be converted to a Number
    let year = parseInt(payload.year);

    // Generate a random, unique-ish ID
    // We have indexed this field in DynamoDB to be able to potentially query on it later
    let rawID = Math.random().toString(36).slice(2);
    const setId = rawID;

    // Creation Date
    const now = new Date().toISOString();

    // Pre-Fill some fields the CMS does not have...
    let imageSlug = "https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/img/cards/";
    const headerImg = imageSlug;
    const footerImg = imageSlug;

    // Create JSON object with parameters for DynamoDB and store in a variable
    let params = {
        TableName: "Cards",
        Item: {
            setName,
            setID: setId,
            now,
            size,
            subsets,
            mfg,
            year,
            headerImg,
            headerImgName,
            footerImg,
            footerImgName,
            blogStatus,
            stars,
            formats,
            seoPageTitle,
            seoMetaDesc,
            seoURLSlug,
            seoTags,
            author,
            postBody,
            blogCat
        },
        ConditionExpression: "attribute_not_exists(setName) AND attribute_not_exists(#yr)",
        ExpressionAttributeNames: {
            "#yr": "year"
        }
    };

    // Using await, make sure object writes to DynamoDB table before continuing execution
    try {
        await documentClient.send(new PutCommand(params));
    } catch (err) {
        console.error("CREATE ERROR:", err);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            body: JSON.stringify({
                error: "Failed to create card set",
                details: err.message
            })
        };
    }

    // Create a JSON object with our response and store it in a constant
    if (blogStatus === "OK") {
        const response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            body: JSON.stringify({
                message: "The Card Set Review is now LIVE! Have a lovely day!"
            })
        };
        return response;
    } else {
        const response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            body: JSON.stringify({
                message: "The Card Set Review was STAGED successfully. Have a lovely day!"
            })
        };
        return response;
    }
};
