import { DynamoDBClient, BatchWriteItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;
const CHUNK_SIZE = 25; // DynamoDB BatchWriteItem limit

/**
 * Splits an array into chunks of a given size.
 */
const chunkArray = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

/**
 * Executes a single BatchWriteItem call and handles unprocessed items
 * by retrying with exponential backoff.
 */
const batchWriteWithRetry = async (requestItems, attempt = 1) => {
  const command = new BatchWriteItemCommand({
    RequestItems: {
      [TABLE_NAME]: requestItems,
    },
  });

  const result = await client.send(command);
  const unprocessed = result.UnprocessedItems?.[TABLE_NAME];

  if (unprocessed && unprocessed.length > 0) {
    if (attempt >= 5) {
      throw new Error(
        `Failed to process ${unprocessed.length} item(s) after ${attempt} attempts.`
      );
    }
    // Exponential backoff before retrying unprocessed items
    const delay = Math.pow(2, attempt) * 100;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return batchWriteWithRetry(unprocessed, attempt + 1);
  }
};

/**
 * Scans the entire table and returns all items (handles pagination).
 */
const scanAllItems = async () => {
  const items = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: "phoneNumber", // only fetch the partition key
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    });

    const result = await client.send(command);
    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};

/**
 * Deletes all existing items in the table using BatchWriteItem.
 */
const truncateTable = async () => {
  const items = await scanAllItems();

  if (items.length === 0) return 0;

  const deleteRequests = items.map((item) => ({
    DeleteRequest: { Key: { phoneNumber: item.phoneNumber } },
  }));

  const chunks = chunkArray(deleteRequests, CHUNK_SIZE);
  await Promise.all(chunks.map((chunk) => batchWriteWithRetry(chunk)));

  return items.length;
};

export const handler = async (event) => {
  try {
    // API Gateway passes the body as a string
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    if (!Array.isArray(body) || body.length === 0) {
      return response(400, { message: "Request body must be a non-empty array of DynamoDB items." });
    }

    // Step 1: Truncate existing table
    const deletedCount = await truncateTable();

    // Step 2: Wrap each item in a PutRequest
    const putRequests = body.map((item) => ({ PutRequest: { Item: item } }));

    // Step 3: Chunk into groups of 25 and write each batch
    const chunks = chunkArray(putRequests, CHUNK_SIZE);
    await Promise.all(chunks.map((chunk) => batchWriteWithRetry(chunk)));

    return response(200, {
      message: `Successfully deleted ${deletedCount} existing subscriber(s) and imported ${body.length} new one(s).`,
      deletedCount,
      importedCount: body.length,
    });

  } catch (err) {
    console.error("Bulk upload error:", err);
    return response(500, { message: err.message || "Internal server error." });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
    "Access-Control-Allow-Headers": "Content-Type,x-api-key",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  },
  body: JSON.stringify(body),
});
