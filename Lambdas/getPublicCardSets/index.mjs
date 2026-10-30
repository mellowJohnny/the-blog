/*
 *  getPublicCardSets Lambda Function
 *  Public list of every live card set for browseBySet.html - names only.
 *  The CMS's getCardSets returns full items (review bodies) behind a login,
 *  so it can't serve a public page; this one projects a few small fields
 *  (now/updatedAt feed the sitemap generator's <lastmod>; the slug and SEO
 *  fields feed the review-page generator; ?view=links returns just enough
 *  for pages to link to reviews).
 *
 *  Source of truth is this repo - don't edit it only in the AWS Console.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const ddb = DynamoDBDocumentClient.from(client);

// ?view=links is the small version every public page loads to build its
// links to the reviews (nav, year picker, Player Search); no param is the full list.
const LINKS_PROJECTION = "setID, setName, blogCat, #yr, seoURLSlug, stars";
const FULL_PROJECTION = "setID, setName, blogCat, #yr, stars, hasChecklist, #now, updatedAt, seoURLSlug, seoPageTitle, seoMetaDesc, seoTags, headerImg, headerImgName";

export const handler = async (event) => {
  let statusCode = 200;
  let responseBody = "";
  const projection = event?.queryStringParameters?.view === "links" ? LINKS_PROJECTION : FULL_PROJECTION;

  try {
    const items = [];
    let lastKey;

    // Query returns at most 1 MB a page; follow LastEvaluatedKey so the list
    // can never be silently cut short as the number of sets grows.
    do {
      const data = await ddb.send(new QueryCommand({
        TableName: "Cards",
        IndexName: "blogStatus-year-index",
        KeyConditionExpression: "blogStatus = :status",
        // year is a DynamoDB reserved word, so it has to be aliased; DynamoDB
        // rejects an alias the projection doesn't use, so #now is full-list only.
        ProjectionExpression: projection,
        ExpressionAttributeNames: projection === FULL_PROJECTION ? { "#yr": "year", "#now": "now" } : { "#yr": "year" },
        ExpressionAttributeValues: { ":status": "OK" },
        ExclusiveStartKey: lastKey
      }));
      items.push(...data.Items);
      lastKey = data.LastEvaluatedKey;
    } while (lastKey);

    responseBody = JSON.stringify(items);
  } catch (err) {
    console.log("DynamoDB error:", err);
    statusCode = 500;
    responseBody = JSON.stringify({ error: "Failed to fetch card sets" });
  }

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=1800"
    },
    body: responseBody
  };
};
