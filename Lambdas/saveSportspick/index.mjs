/*
 *  saveSportspick Lambda Function - creates or edits one Sportspicks item (cms/newSportspick.html, cms/sportspickEdit.html).
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

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const reply = (statusCode, body) => ({ statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) });

const text = (value, max) => (typeof value === "string" && value.trim() && value.trim().length <= max ? value.trim() : null);

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const playerName = text(body.playerName, 100);
    const series = text(body.series, 100);
    const variant = body.variant ? text(body.variant, 60) : "";
    const image = body.image ? text(body.image, 200) : "";
    const notes = body.notes ? text(body.notes, 1000) : "";
    const { releaseYear } = body;
    const isEdit = body.figureKey !== undefined;

    const problem =
      !Number.isInteger(releaseYear) || releaseYear < 1900 || releaseYear > 2100 ? "releaseYear must be a whole year" :
      !playerName ? "playerName is required" :
      !series ? "series is required" :
      isEdit && (typeof body.figureKey !== "string" || !SLUG_PATTERN.test(body.figureKey)) ? "figureKey is invalid" :
      variant === null ? "variant is too long" :
      image === null ? "image is too long" :
      notes === null ? "notes is too long" : null;

    if (problem) return reply(400, { error: problem });

    // The key is made once, from series + player + variant at creation, and kept when those are edited later.
    const figureKey = isEdit ? body.figureKey : slugify([series, playerName, variant].join(" "));
    if (!figureKey) return reply(400, { error: "series and playerName must contain letters or numbers" });

    const item = {
      releaseYear, figureKey,
      playerName, series,
      updatedAt: new Date().toISOString()
    };
    if (variant) item.variant = variant;
    if (image) item.image = image;
    if (notes) item.notes = notes;

    // A create must not overwrite another figure; an edit must not invent one.
    await ddb.send(new PutCommand({
      TableName: "Sportspicks",
      Item: item,
      ConditionExpression: isEdit ? "attribute_exists(figureKey)" : "attribute_not_exists(figureKey)"
    }));

    return reply(200, { message: "Figure saved.", releaseYear, figureKey });
  } catch (err) {
    console.error("Error in saveSportspick:", err);

    if (err.name === "ConditionalCheckFailedException") {
      const isEdit = JSON.parse(event.body || "{}").figureKey !== undefined;
      return isEdit
        ? reply(404, { error: "Figure not found" })
        : reply(409, { error: "A figure with that series, player and variant already exists for that year" });
    }
    return reply(500, { error: "Internal error" });
  }
};
