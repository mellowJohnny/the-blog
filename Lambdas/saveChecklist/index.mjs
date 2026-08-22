// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Writes a reviewed checklist (setName + optional insertSetName + array
// of cards, already corrected in the CMS after parseChecklistPdf) to the
// Checklists table: partition key setName (String), sort key cardNumber
// (String) - one item per card. This function only ever writes/deletes -
// it doesn't parse PDFs itself.
//
// Main-set cards and insert-set cards can share the same setName (an
// insert set's own base setName, e.g. "1994-95 Upper Deck", is the same
// whether you're uploading the base set or one of its insert sets - see
// parseChecklistPdf's header comment on how insertSetName is derived
// from the filename). Insert sets commonly reuse low card numbers of
// their own (R1, R2, ...), which would collide with the main set's own
// numbering under a plain setName+cardNumber key. To avoid that, the
// actual DynamoDB sort key value stored in the cardNumber attribute is
// prefixed by group:
//   main set:   MAIN#<cardNumber>
//   insert set: INSERT#<insertSetName>#<cardNumber>
// The human-readable card number (unprefixed) is kept separately in a
// cardNumberDisplay attribute - the sort key's actual value is never
// shown to a user, just used for key uniqueness/grouping.
//
// Each item also gets a plain integer sortIndex (its position in the
// reviewed table at save time, 0-based within its own group). This is
// deliberately separate from the DynamoDB sort key above - a future
// checklist-display feature should group by type/insertSetName then
// order by sortIndex, not rely on raw DynamoDB item order (which sorts
// the prefixed key as a plain string - "INSERT#" sorts before "MAIN#",
// and numbers don't sort numerically once turned into strings).
//
// Full-replace semantics, same pattern as bulkSubscriberUpload: every
// save first deletes all existing items for this setName+group, then
// writes the new set - so re-uploading a corrected PDF can't leave
// stale rows behind. Scoped to the group (via the sort-key prefix and a
// begins_with key condition), not the whole setName partition - so
// uploading/replacing one insert set never touches the main set's rows,
// or a different insert set's rows, even though they all share the same
// setName.
//
// After a successful save, also flips hasChecklist = true on the
// matching Cards item (found by setName - Cards' own partition key,
// via a Query, not a Scan) - this is what waxReviews.html checks to
// decide whether to show a "Full Checklist" link for that set. This is
// a non-critical side effect with its own try/catch, same design
// principle as updateCardSet's TinyMCE cleanup pass: its failure (e.g.
// no matching Cards item yet, or a transient error) never fails the
// checklist save itself, which already fully succeeded by this point.
// It's surfaced, though, not just logged - the success message includes
// a warning whenever this step throws OR finds zero matching Cards
// items, so a setName mismatch (e.g. the checklist title has "Hockey"
// on the end and the Cards item doesn't) shows up in the CMS instead of
// silently never linking the two.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const db = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

const TABLE_NAME = "Checklists";
const CARDS_TABLE_NAME = "Cards";
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
// sort-key value in this setName+group, handling pagination in case a
// set is ever large enough to need it. Scoped to the group via
// begins_with, so this never touches a different group's rows even
// though they share the same setName partition.
async function getExistingSortKeys(setName, prefix) {
  const sortKeys = [];
  let lastEvaluatedKey;

  do {
    const result = await db.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "setName = :setName AND begins_with(cardNumber, :prefix)",
      ExpressionAttributeValues: { ":setName": setName, ":prefix": prefix },
      ProjectionExpression: "cardNumber",
      ExclusiveStartKey: lastEvaluatedKey
    }));
    sortKeys.push(...(result.Items || []).map((item) => item.cardNumber));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return sortKeys;
}

// Cards' key is setName (partition) + year (sort) - Checklists only
// tracks setName, so find the matching Cards item(s) by setName first
// (Query, not Scan) rather than assuming a year. In practice there's
// only ever one, since this site's setName strings already embed the
// year (e.g. "1986-87 O-Pee-Chee Hockey"), but loop in case that ever
// isn't true.
async function flagCardsHasChecklist(setName) {
  const result = await db.send(new QueryCommand({
    TableName: CARDS_TABLE_NAME,
    KeyConditionExpression: "setName = :setName",
    ExpressionAttributeValues: { ":setName": setName },
    // year is a DynamoDB reserved word, can't appear unescaped in a
    // ProjectionExpression - same issue documented for getStagedCardSets.
    ProjectionExpression: "setName, #yr",
    ExpressionAttributeNames: { "#yr": "year" }
  }));

  const items = result.Items || [];
  for (const item of items) {
    await db.send(new UpdateCommand({
      TableName: CARDS_TABLE_NAME,
      Key: { setName: item.setName, year: item.year },
      UpdateExpression: "SET hasChecklist = :true",
      ExpressionAttributeValues: { ":true": true }
    }));
  }

  return items.length; // matched-item count, so the caller can tell a genuine zero-match apart from success
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const setName = body.setName?.trim();
    const insertSetName = body.insertSetName?.trim() || "";
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

    const type = insertSetName ? "insertSet" : "main";
    const prefix = insertSetName ? `INSERT#${insertSetName}#` : "MAIN#";
    const groupLabel = insertSetName ? `"${setName}" / insert set "${insertSetName}"` : `"${setName}" (main set)`;

    // Step 1: delete every existing card in this group (full-replace,
    // not a merge - see header comment). Scoped to this group only.
    const existingSortKeys = await getExistingSortKeys(setName, prefix);
    const deleteRequests = existingSortKeys.map((sortKey) => ({
      DeleteRequest: { Key: { setName, cardNumber: sortKey } }
    }));
    const undeletedCount = await batchWriteAll(deleteRequests);

    if (undeletedCount > 0) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `${undeletedCount} existing card(s) for ${groupLabel} failed to clear after retries - aborted before writing the new set to avoid mixing old and new data. Please try again.`
        })
      };
    }

    // Step 2: write the new set
    const putRequests = cards.map((card, sortIndex) => {
      const cardNumberDisplay = card.cardNumber.toString().trim();
      return {
        PutRequest: {
          Item: {
            setName,
            cardNumber: `${prefix}${cardNumberDisplay}`,
            cardNumberDisplay,
            playerName: card.playerName.toString().trim(),
            notes: card.notes?.toString().trim() || "",
            type,
            insertSetName,
            // Display order within this group (main, or this one insert
            // set) - the DynamoDB sort key above is for uniqueness/safe
            // group-scoped replace, not display order (it won't sort
            // numerically, and "INSERT#" sorts before "MAIN#" as plain
            // strings). A future "get checklist" feature should group by
            // type, then order by this - not by raw DynamoDB item order.
            sortIndex
          }
        }
      };
    });
    const unwrittenCount = await batchWriteAll(putRequests);

    if (unwrittenCount > 0) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `${unwrittenCount} of ${cards.length} cards failed to save after retries for ${groupLabel} (existing data was already cleared - please retry).`
        })
      };
    }

    // Step 3: flag the matching Cards item so waxReviews.html knows to
    // show a checklist link - non-critical (doesn't fail the checklist
    // save itself), but surfaced as a warning rather than only logged,
    // see header comment.
    let cardsLinkWarning = null;
    try {
      const matchedCount = await flagCardsHasChecklist(setName);
      if (matchedCount === 0) {
        cardsLinkWarning = `no Cards item found with setName "${setName}" - the "Full Checklist" link won't appear on waxReviews.html until one exists with this exact setName.`;
      }
    } catch (err) {
      console.error("Failed to flag hasChecklist on Cards item:", err);
      cardsLinkWarning = `failed to link this checklist to its card set review (${err.message || "unknown error"}) - the "Full Checklist" link won't appear on waxReviews.html yet.`;
    }

    const baseMessage = `Replaced ${existingSortKeys.length} existing card(s) with ${cards.length} new card(s) for ${groupLabel}.`;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: cardsLinkWarning ? `${baseMessage} Warning: ${cardsLinkWarning}` : baseMessage
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
