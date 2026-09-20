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

/**
 * Minimal RFC-4180-ish CSV parser: handles quoted fields, commas and
 * newlines embedded inside quotes, and "" as an escaped quote. Returns
 * an array of rows, each row an array of raw (untrimmed) field strings.
 */
const parseCsv = (text) => {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // skip - the following \n (if any) ends the row
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

// Basic E.164 normalization helper - byte-for-byte the same as
// Lambdas/subscribeHandler/index.mjs and Lambdas/inboundSMSHandler/index.mjs.
function normalizePhoneNumber(raw) {
  if (!raw) return null;

  let phone = raw.trim();

  // Remove spaces, dashes, parentheses
  phone = phone.replace(/[\s\-\(\)]/g, "");

  // If it starts with "1" and is 11 digits, convert to +1
  if (/^1\d{10}$/.test(phone)) {
    return `+${phone}`;
  }

  // If it already starts with + and looks valid
  if (/^\+\d{10,15}$/.test(phone)) {
    return phone;
  }

  // If it's 10 digits, assume US/Canada and add +1
  if (/^\d{10}$/.test(phone)) {
    return `+1${phone}`;
  }

  return null; // Not a valid format
}

/**
 * Parses the raw CSV text into DynamoDB-typed Subscriber items, using
 * only the "Name"/"Your mobile number" columns (matched trimmed,
 * case-insensitively). Returns { items, skippedRows, error } - error is
 * set (and items/skippedRows omitted) for a structurally bad file that
 * can't be processed at all (no rows, missing required header).
 */
const buildSubscriberItems = (csvContent) => {
  const rows = parseCsv(csvContent).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (rows.length === 0) {
    return { error: "CSV file is empty." };
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const phoneIdx = header.indexOf("your mobile number");

  if (nameIdx === -1 || phoneIdx === -1) {
    return {
      error: 'CSV must have "Name" and "Your mobile number" columns.',
    };
  }

  const items = [];
  const skippedRows = [];
  const seenPhones = new Set();

  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1; // 1-based, header is row 1
    const name = (rows[i][nameIdx] || "").trim();
    const rawPhone = rows[i][phoneIdx] || "";

    if (!name) {
      skippedRows.push({ row: rowNumber, reason: "Missing name" });
      continue;
    }

    const phoneNumber = normalizePhoneNumber(rawPhone);
    if (!phoneNumber) {
      skippedRows.push({ row: rowNumber, reason: `Invalid phone number: "${rawPhone}"` });
      continue;
    }

    if (seenPhones.has(phoneNumber)) {
      skippedRows.push({ row: rowNumber, reason: "Duplicate phone number in file" });
      continue;
    }
    seenPhones.add(phoneNumber);

    items.push({
      PutRequest: {
        Item: {
          phoneNumber: { S: phoneNumber },
          firstName: { S: name },
          status: { S: "subscribed" },
          source: { S: "web" },
          optInTimestamp: { N: `${Date.now()}` },
        },
      },
    });
  }

  if (items.length === 0) {
    return { error: "No valid subscriber rows found in the CSV.", skippedRows };
  }

  return { items, skippedRows };
};

export const handler = async (event) => {
  try {
    // API Gateway passes the body as a string
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    if (!body || typeof body.csvContent !== "string" || body.csvContent.trim() === "") {
      return response(400, { message: "Request body must include csvContent as a non-empty CSV string." });
    }

    const { items, skippedRows, error } = buildSubscriberItems(body.csvContent);
    if (error) {
      return response(400, { message: error, skippedRows: skippedRows || [] });
    }

    // Step 1: Truncate existing table (only once the new list is ready)
    const deletedCount = await truncateTable();

    // Step 2: Chunk into groups of 25 and write each batch
    const chunks = chunkArray(items, CHUNK_SIZE);
    await Promise.all(chunks.map((chunk) => batchWriteWithRetry(chunk)));

    return response(200, {
      message: `Successfully deleted ${deletedCount} existing subscriber(s) and imported ${items.length} new one(s).`,
      deletedCount,
      importedCount: items.length,
      skippedRows,
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
