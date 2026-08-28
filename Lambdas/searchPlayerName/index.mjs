// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by pasting the updated code into
// the Console's inline Code tab and clicking Deploy (no real dependency,
// so no .zip needed - see CLAUDE.md's Lambda deployment section).
//
// Public read endpoint backing playerSearch.html's player-name search.
// Takes ?q= (a player name or partial name) and searches every card in
// the Checklists table for a case-insensitive substring match on
// playerName, grouped by the set(s) that player appears in.
//
// There's no index on playerName - Checklists' only key is
// setName+cardNumber - so this does a full paginated Scan of the table,
// matching case-insensitively in code (DynamoDB's own contains() is
// case-sensitive, which would give poor search UX; a stored lowercase
// mirror field would let us push the filter server-side, but isn't
// worth the added write-time complexity + backfilling every
// already-uploaded checklist at this site's current scale). Cost/
// latency grows with total Checklists table size - fine today, revisit
// with a GSI if that table gets much bigger.
//
// For each distinct matching setName, does a second, cheap Query
// (partition key, not a scan) against Cards to get year/blogCat, so the
// frontend can build a working link back to that set's review on
// waxReviews.html. pageName (the third param that URL needs) isn't
// looked up here - it's a pure UI/nav concept derived from blogCat+year,
// computed client-side via getPageNameForYear() in helper.js instead of
// duplicating that mapping server-side too.
//
// No Cognito Authorizer - same public trust level as
// getChecklistBySetName/getCardSetsByYear/getBlogs.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CHECKLISTS_TABLE = "Checklists";
const CARDS_TABLE = "Cards";

async function scanAllMatchingCards(queryLower) {
  const matches = [];
  let lastEvaluatedKey;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: CHECKLISTS_TABLE,
      ExclusiveStartKey: lastEvaluatedKey
    }));

    for (const item of result.Items || []) {
      if (typeof item.playerName === "string" && item.playerName.toLowerCase().includes(queryLower)) {
        matches.push(item);
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return matches;
}

// Same full paginated Scan as scanAllMatchingCards, but collects every
// distinct setName instead of filtering by player - backs ?audit=1
// below, a data-integrity check for the 1:1 Checklists<->Cards
// assumption every search result link depends on: every setName in
// Checklists should resolve to exactly one Cards item, or a search
// result shows up unlinked (see DATA_MODEL.md's Checklists table).
async function scanAllDistinctSetNames() {
  const setNames = new Set();
  let lastEvaluatedKey;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: CHECKLISTS_TABLE,
      ProjectionExpression: "setName",
      ExclusiveStartKey: lastEvaluatedKey
    }));

    for (const item of result.Items || []) {
      if (item.setName) setNames.add(item.setName);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return [...setNames];
}

// Cards' key is setName (partition) + year (sort) - loop in case a
// setName ever legitimately maps to more than one Cards item, same
// defensive pattern as saveChecklist's flagCardsHasChecklist.
async function getCardsEntriesForSet(setName) {
  const result = await docClient.send(new QueryCommand({
    TableName: CARDS_TABLE,
    KeyConditionExpression: "setName = :setName",
    ExpressionAttributeValues: { ":setName": setName },
    ProjectionExpression: "setName, #yr, blogCat",
    ExpressionAttributeNames: { "#yr": "year" }
  }));

  return result.Items || [];
}

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=1800"
};

export const handler = async (event) => {
  try {
    // Data-integrity audit mode (?audit=1) - not part of the search
    // feature itself. Enumerates every distinct setName in Checklists
    // and reports which ones have no matching Cards item, i.e. would
    // show up in search results with no working review link. See
    // scanAllDistinctSetNames() above.
    if (event?.queryStringParameters?.audit === "1") {
      const setNames = await scanAllDistinctSetNames();
      const unlinkedSetNames = [];

      for (const setName of setNames) {
        const cardsEntries = await getCardsEntriesForSet(setName);
        if (cardsEntries.length === 0) unlinkedSetNames.push(setName);
      }

      unlinkedSetNames.sort();

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          totalDistinctSetNames: setNames.length,
          linkedCount: setNames.length - unlinkedSetNames.length,
          unlinkedSetNames
        })
      };
    }

    const rawQuery = event?.queryStringParameters?.q?.trim();

    if (!rawQuery || rawQuery.length < 2) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Query parameter 'q' must be at least 2 characters" })
      };
    }

    const queryLower = rawQuery.toLowerCase();
    const matches = await scanAllMatchingCards(queryLower);

    // Group matches by setName - a player can appear on multiple cards
    // within the same set (base + parallel + insert), and we want one
    // result entry per set, not one per card.
    const bySetName = new Map();
    for (const item of matches) {
      if (!bySetName.has(item.setName)) bySetName.set(item.setName, []);
      bySetName.get(item.setName).push({
        cardNumberDisplay: item.cardNumberDisplay,
        playerName: item.playerName,
        notes: item.notes || "",
        type: item.type,
        insertSetName: item.insertSetName || "",
        sortIndex: item.sortIndex ?? 0
      });
    }

    // Order each set's cards main-before-insert, then by sortIndex within
    // that group - never by Scan/insertion order, and never by
    // cardNumberDisplay directly, since that's a display string ("T-20",
    // "NNO") that doesn't sort numerically. Same convention
    // getChecklistBySetName's items already carry sortIndex for - see
    // DATA_MODEL.md's Checklists table.
    for (const cards of bySetName.values()) {
      cards.sort((a, b) => {
        if (a.type !== b.type) return a.type === "insertSet" ? 1 : -1;
        if (a.insertSetName !== b.insertSetName) return a.insertSetName.localeCompare(b.insertSetName);
        return a.sortIndex - b.sortIndex;
      });
    }

    const results = [];
    for (const [setName, cards] of bySetName) {
      const cardsEntries = await getCardsEntriesForSet(setName);
      if (cardsEntries.length === 0) {
        // No matching Cards item (a setName-linking gap, same category
        // of issue saveChecklist's hasChecklist warning already guards
        // against) - still surface the match, just without a link.
        results.push({ setName, year: null, blogCat: null, cards });
      } else {
        for (const cardsItem of cardsEntries) {
          results.push({ setName, year: cardsItem.year, blogCat: cardsItem.blogCat, cards });
        }
      }
    }

    results.sort((a, b) => a.setName.localeCompare(b.setName));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ query: rawQuery, results })
    };
  } catch (err) {
    console.log("Error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
