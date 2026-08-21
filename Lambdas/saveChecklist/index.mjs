// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Writes a reviewed checklist (setName + array of cards, already
// corrected in the CMS after parseChecklistPdf) to the Checklists table:
// partition key setName (String), sort key cardNumber (String) - one
// item per card. Uses BatchWriteItem in chunks of 25 (its hard limit).
// This function only ever writes - it doesn't parse PDFs itself.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const db = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

const TABLE_NAME = "Checklists";
const BATCH_SIZE = 25;

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const setName = body.setName?.trim();
    const cards = body.cards;

    if (!setName || !Array.isArray(cards) || cards.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "setName and a non-empty cards array are required" })
      };
    }

    for (const card of cards) {
      const cardNumber = card.cardNumber?.toString().trim();
      const playerName = card.playerName?.toString().trim();
      if (!cardNumber || !playerName) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: `Every card needs a cardNumber and playerName (offending row: ${JSON.stringify(card)})` })
        };
      }
    }

    const batches = chunk(cards, BATCH_SIZE);
    let unprocessedCount = 0;

    for (const batch of batches) {
      let requestItems = {
        [TABLE_NAME]: batch.map((card) => ({
          PutRequest: {
            Item: {
              setName,
              cardNumber: card.cardNumber.toString().trim(),
              playerName: card.playerName.toString().trim(),
              notes: card.notes?.toString().trim() || ""
            }
          }
        }))
      };

      // BatchWriteItem can leave some items unprocessed (e.g. throttling)
      // even under normal load - retry those a few times with backoff
      // before giving up on them.
      for (let attempt = 0; attempt < 4 && requestItems[TABLE_NAME]?.length; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
        }
        const result = await db.send(new BatchWriteCommand({ RequestItems: requestItems }));
        requestItems = result.UnprocessedItems || {};
      }

      unprocessedCount += requestItems[TABLE_NAME]?.length || 0;
    }

    if (unprocessedCount > 0) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `${unprocessedCount} of ${cards.length} cards failed to save after retries - please try again for "${setName}".`
        })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `Saved ${cards.length} cards for "${setName}".` })
    };

  } catch (err) {
    console.error("Error in saveChecklist:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal error" })
    };
  }
};
