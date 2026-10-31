/*
 *  saveWaxPack Lambda Function - creates or edits one WaxPacks item (cms/newWaxPack.html, cms/waxPackEdit.html).
 *  Source of truth is this repo - don't edit it only in the AWS Console.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.junkwaxhockey.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

const FORMATS = ["regular", "jumbo"];
const TYPES = ["main", "fast food"];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const reply = (statusCode, body) => ({ statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) });

const text = (value, max) => (typeof value === "string" && value.trim() && value.trim().length <= max ? value.trim() : null);

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const name = text(body.name, 100);
    const manufacturer = text(body.manufacturer, 60);
    const packaging = text(body.packaging, 40);
    const frontImg = body.frontImg ? text(body.frontImg, 200) : "";
    const backImg = body.backImg ? text(body.backImg, 200) : "";
    const notes = body.notes ? text(body.notes, 1000) : "";
    const reviewSlug = body.reviewSlug || "";
    const { year, type, format, numCards, price } = body;
    const isEdit = body.packKey !== undefined;

    const problem =
      !Number.isInteger(year) || year < 1900 || year > 2100 ? "year must be a whole year" :
      !name ? "name is required" :
      !manufacturer ? "manufacturer is required" :
      !packaging ? "packaging is required" :
      !TYPES.includes(type) ? "type must be main or fast food" :
      !FORMATS.includes(format) ? "format must be regular or jumbo" :
      !Number.isInteger(numCards) || numCards < 1 || numCards > 200 ? "numCards must be a whole number from 1 to 200" :
      typeof price !== "number" || !(price >= 0) || price > 1000 ? "price must be a number from 0 to 1000" :
      reviewSlug && (typeof reviewSlug !== "string" || !SLUG_PATTERN.test(reviewSlug)) ? "reviewSlug must be lowercase letters, numbers and single hyphens" :
      isEdit && (typeof body.packKey !== "string" || !SLUG_PATTERN.test(body.packKey)) ? "packKey is invalid" :
      frontImg === null ? "frontImg is too long" :
      backImg === null ? "backImg is too long" :
      notes === null ? "notes are too long" : null;

    if (problem) return reply(400, { error: problem });

    // The key is made once, from the name at creation, and kept when the name is edited later.
    const packKey = isEdit ? body.packKey : slugify(name);
    if (!packKey) return reply(400, { error: "name must contain letters or numbers" });

    const item = {
      year, packKey,
      name, manufacturer, packaging, type, format, numCards, price,
      updatedAt: new Date().toISOString()
    };
    if (reviewSlug) item.reviewSlug = reviewSlug;
    if (frontImg) item.frontImg = frontImg;
    if (backImg) item.backImg = backImg;
    if (notes) item.notes = notes;

    // A create must not overwrite another pack; an edit must not invent one.
    await ddb.send(new PutCommand({
      TableName: "WaxPacks",
      Item: item,
      ConditionExpression: isEdit ? "attribute_exists(packKey)" : "attribute_not_exists(packKey)"
    }));

    return reply(200, { message: "Wax pack saved.", year, packKey });
  } catch (err) {
    console.error("Error in saveWaxPack:", err);

    if (err.name === "ConditionalCheckFailedException") {
      const isEdit = JSON.parse(event.body || "{}").packKey !== undefined;
      return isEdit
        ? reply(404, { error: "Wax pack not found" })
        : reply(409, { error: "A wax pack with that name already exists for that year" });
    }
    return reply(500, { error: "Internal error" });
  }
};
