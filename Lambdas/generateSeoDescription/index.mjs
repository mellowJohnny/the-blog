/*
 *  generateSeoDescription Lambda Function - writes a card set review's SEO meta description with Claude on Bedrock
 *  (the "Generate" button on cms/createCardSet.html and cms/setEdit.html).
 *  Needs the zip deploy (@anthropic-ai/bedrock-sdk); the role needs bedrock-mantle:CreateInference.
 *  Source of truth is this repo - don't edit it only in the AWS Console.
 */

import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";

const MODEL = "anthropic.claude-haiku-5-5";
const REGION = "us-east-2";
const MAX_LENGTH = 160;
const MAX_REVIEW_CHARS = 20000;

const client = new AnthropicBedrockMantle({ awsRegion: REGION });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.junkwaxhockey.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

const reply = (statusCode, body) => ({ statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) });

const SYSTEM_PROMPT = `You write the SEO meta description for a hockey card set review on a site about vintage and junk wax era hockey cards.

Write one description of 150 to 160 characters. Start with the set name. Say what the review concludes: what stands out (cards, design, rookies, inserts) and whether the set is worth collecting. Use only facts that are in the review or the set details provided; never invent a card, player, price or opinion. Write plain, natural sentences. No quotation marks, no emoji, no hashtags, and don't repeat the star rating as "Rating: 3/5".

Reply with the description text only.`;

const text = (value, max) => (typeof value === "string" && value.trim().length <= max ? value.trim() : null);

/** Cuts at the last whole word within the limit. */
function fitToLimit(description) {
  if (description.length <= MAX_LENGTH) return description;
  const cut = description.slice(0, MAX_LENGTH + 1);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut.slice(0, MAX_LENGTH)).replace(/[\s,;:-]+$/, "");
}

/** Single line, no wrapping quotes. */
function cleanDescription(raw) {
  return raw.replace(/\s+/g, " ").trim().replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

export const handler = async (event) => {
  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return reply(400, { error: "body must be JSON" });
    }
    const setName = text(body.setName, 200);
    const reviewText = text(body.reviewText, MAX_REVIEW_CHARS);
    const mfg = body.mfg ? text(body.mfg, 100) : "";
    const size = body.size ? text(String(body.size), 20) : "";
    const stars = body.stars ? text(String(body.stars), 10) : "";
    const subsets = body.subsets ? text(body.subsets, 500) : "";

    const problem =
      !setName ? "setName is required" :
      !reviewText ? `reviewText is required and must be ${MAX_REVIEW_CHARS} characters or fewer` :
      mfg === null || size === null || stars === null || subsets === null ? "a set detail is too long" : null;
    if (problem) return reply(400, { error: problem });

    const details = [
      `Set: ${setName}`,
      mfg && `Manufacturer: ${mfg}`,
      size && `Cards in set: ${size}`,
      stars && `Rating: ${stars} out of 5`,
      subsets && `Insert sets: ${subsets}`
    ].filter(Boolean).join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: `${details}\n\nReview:\n${reviewText}` }]
    });

    if (response.stop_reason === "refusal") {
      return reply(502, { error: "The model declined to write a description" });
    }

    const raw = response.content.filter((block) => block.type === "text").map((block) => block.text).join(" ");
    const description = fitToLimit(cleanDescription(raw));
    if (!description) return reply(502, { error: "The model returned no description" });

    return reply(200, { description });
  } catch (err) {
    console.error("Error in generateSeoDescription:", err);
    return reply(502, { error: "Could not generate a description" });
  }
};
