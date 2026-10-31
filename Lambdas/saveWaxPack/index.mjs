/*
 *  saveWaxPack Lambda Function - creates or overwrites one WaxPacks item (cms/newWaxPack.html, cms/waxPackEdit.html).
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

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const setSlug = text(body.setSlug, 100);
    const setName = text(body.setName, 100);
    const manufacturer = text(body.manufacturer, 60);
    const packaging = text(body.packaging, 40);
    const imgName = body.imgName ? text(body.imgName, 200) : "";
    const notes = body.notes ? text(body.notes, 1000) : "";
    const { year, type, format, numCards, price } = body;

    const problem =
      !Number.isInteger(year) || year < 1900 || year > 2100 ? "year must be a whole year" :
      !setSlug || !SLUG_PATTERN.test(setSlug) ? "setSlug must be lowercase letters, numbers and single hyphens" :
      !setName ? "setName is required" :
      !manufacturer ? "manufacturer is required" :
      !packaging ? "packaging is required" :
      !TYPES.includes(type) ? "type must be main or fast food" :
      !FORMATS.includes(format) ? "format must be regular or jumbo" :
      !Number.isInteger(numCards) || numCards < 1 || numCards > 200 ? "numCards must be a whole number from 1 to 200" :
      typeof price !== "number" || !(price >= 0) || price > 1000 ? "price must be a number from 0 to 1000" :
      imgName === null ? "imgName is too long" :
      notes === null ? "notes are too long" : null;

    if (problem) return reply(400, { error: problem });

    // Lowercased with runs of other characters collapsed, so "Wax" and "wax " are one pack.
    const packagingKey = packaging.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!packagingKey) return reply(400, { error: "packaging must contain letters or numbers" });

    const item = {
      year,
      packKey: `${setSlug}#${packagingKey}#${format}`,
      setSlug, setName, manufacturer, packaging, type, format, numCards, price,
      updatedAt: new Date().toISOString()
    };
    if (imgName) item.imgName = imgName;
    if (notes) item.notes = notes;

    await ddb.send(new PutCommand({ TableName: "WaxPacks", Item: item }));

    return reply(200, { message: "Wax pack saved.", year: item.year, packKey: item.packKey });
  } catch (err) {
    console.error("Error in saveWaxPack:", err);
    return reply(500, { error: "Internal error" });
  }
};
