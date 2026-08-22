// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Writes a reviewed checklist (setName + array of cards, already
// corrected in the CMS after parseChecklistPdf) to the Checklists table:
// partition key setName (String), sort key cardNumber (String) - one
// item per card. This function only ever writes/deletes - it doesn't
// parse PDFs itself.
//
// Full-replace semantics, same pattern as bulkSubscriberUpload: every
// save first deletes all existing items for this setName, then writes
// the new set - so re-uploading a corrected PDF can't leave stale rows
// behind (e.g. a card that got renumbered or removed between two
// uploads of "the same" set). Unlike bulkSubscriberUpload this only
// deletes the rows for the one setName being saved, not the whole
// table - other sets' checklists live in the same table untouched.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const db = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

const TABLE_NAME = "Checklists";
const BATCH_SIZE = 25; // DynamoDB BatchWriteItem's hard limit

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Runs chunks of BatchWriteItem requests, retrying any UnprocessedItems
// (e.g. from throttling) a few times with backoff. Returns the count of
// requests that still failed after all retries.
async function batchWriteAll(requests) {
  let unprocessedCount = 0;

  for (const batch of chunk(requests, BATCH_SIZE)) {
    let requestItems = { [TABLE_NAME]: batch };

    for (let attempt = 0; attempt < 4 && requestItems[TABLE_NAME]?.length; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
      }
      const result = await db.send(new BatchWriteCommand({ RequestItems: requestItems }));
      requestItems = result.UnprocessedItems || {};
    }

    unprocessedCount += requestItems[TABLE_NAME]?.length || 0;
  }

  return unprocessedCount;
}

// Queries (not scans - setName is the partition key) every existing
// card number for this set, handling pagination in case a set is ever
// large enough to need it.
async function getExistingCardNumbers(setName) {
  const cardNumbers = [];
  let lastEvaluatedKey;

  do {
    const result = await db.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "setName = :setName",
      ExpressionAttributeValues: { ":setName": setName },
      ProjectionExpression: "cardNumber",
      ExclusiveStartKey: lastEvaluatedKey
    }));
    cardNumbers.push(...(result.Items || []).map((item) => item.cardNumber));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return cardNumbers;
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

    // Step 1: delete every existing card for this set (full-replace,
    // not a merge - see header comment)
    const existingCardNumbers = await getExistingCardNumbers(setName);
    const deleteRequests = existingCardNumbers.map((cardNumber) => ({
      DeleteRequest: { Key: { setName, cardNumber } }
    }));
    const undeletedCount = await batchWriteAll(deleteRequests);

    if (undeletedCount > 0) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `${undeletedCount} existing card(s) for "${setName}" failed to clear after retries - aborted before writing the new set to avoid mixing old and new data. Please try again.`
        })
      };
    }

    // Step 2: write the new set
    const putRequests = cards.map((card) => ({
      PutRequest: {
        Item: {
          setName,
          cardNumber: card.cardNumber.toString().trim(),
          playerName: card.playerName.toString().trim(),
          notes: card.notes?.toString().trim() || ""
        }
      }
    }));
    const unwrittenCount = await batchWriteAll(putRequests);

    if (unwrittenCount > 0) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `${unwrittenCount} of ${cards.length} cards failed to save after retries for "${setName}" (existing data was already cleared - please retry).`
        })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: `Replaced ${existingCardNumbers.length} existing card(s) with ${cards.length} new card(s) for "${setName}".`
      })
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
