// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by uploading the new .zip file
// in the Console -> Code tab -> Update dropdown -> Update from a .zip file
// (this function has a real dependency - pdf-parse - so the inline code
// editor won't work; see CLAUDE.md's Lambda deployment section)
//
// Accepts a base64-encoded checklist PDF, parses it into
// { setName, cards: [{ cardNumber, playerName, notes }] }, and returns
// that for review in the CMS before anything is written to DynamoDB -
// this function never touches the Checklists table itself, see
// saveChecklist for that.
//
// Parsing logic (regex, note-token detection, dedup) mirrors
// tools/checklistParser/parse.mjs in this repo - keep the two in sync if
// either changes. See that file's comments for the assumptions this
// makes about checklist PDF formatting (Title Case player names, etc).

// Pinned to pdf-parse v1 (not the current v2 major) deliberately: v2
// requires a native @napi-rs/canvas binary even for plain text
// extraction, and npm installs whatever binary matches the machine you
// ran `npm install` on (e.g. darwin-x64 locally) - wrong for Lambda's
// Linux runtime, and re-fetching the correct platform binary needs a
// Linux-matching install step. v1 is pure JS, no native deps, so the
// zip built from a Mac just works on Lambda.
//
// Importing lib/pdf-parse.js directly rather than the package root is
// also deliberate: pdf-parse v1's top-level index.js has a long-standing
// bug (isDebugMode = !module.parent) that misfires under ESM/dynamic
// import - not just here, but reportedly in AWS Lambda's own module
// loader too - and tries to read a nonexistent test fixture file,
// crashing on load. lib/pdf-parse.js is the actual implementation
// without that debug wrapper.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.mellowjohnny.cc",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

function isNoteToken(token) {
  const stripped = token.replace(/[.,]+$/, "");
  return /^[A-Z]{2,}$/.test(stripped);
}

function splitNameAndNotes(remainder) {
  const tokens = remainder.split(/\s+/).filter(Boolean);
  const noteTokens = [];
  while (tokens.length > 0 && isNoteToken(tokens[tokens.length - 1])) {
    noteTokens.unshift(tokens.pop());
  }
  return {
    playerName: tokens.join(" "),
    notes: noteTokens.join(" ")
  };
}

const CARD_LINE_RE = /^(\d+[A-Za-z]?)\s+(\S.*)$/;

function parseChecklistText(text) {
  const lines = text.split(/\r?\n/);
  const cards = [];
  const seenNumbers = new Set();
  const skippedDuplicates = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(CARD_LINE_RE);
    if (!match) continue;

    const [, cardNumber, remainder] = match;

    if (seenNumbers.has(cardNumber)) {
      skippedDuplicates.push(line);
      continue;
    }
    seenNumbers.add(cardNumber);

    const { playerName, notes } = splitNameAndNotes(remainder);
    cards.push({ cardNumber, playerName, notes });
  }

  return { cards, skippedDuplicates };
}

function deriveSetName(fileName) {
  const base = (fileName || "").replace(/\.pdf$/i, "");
  return base.replace(/\s*-\s*checklist\s*$/i, "").trim();
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const fileName = body.fileName?.trim();
    const fileContent = body.fileContent;

    if (!fileContent) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "fileContent (base64-encoded PDF) is required" })
      };
    }

    const dataBuffer = Buffer.from(fileContent, "base64");
    const pdfData = await pdfParse(dataBuffer);

    const setName = body.setName?.trim() || deriveSetName(fileName);
    const { cards, skippedDuplicates } = parseChecklistText(pdfData.text);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ setName, cards, skippedDuplicates })
    };

  } catch (err) {
    console.error("Error in parseChecklistPdf:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to parse PDF" })
    };
  }
};
