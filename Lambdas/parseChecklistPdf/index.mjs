// index.mjs
// *** NEVER Change this code in the AWS Console
// ONLY change in VS Code, then redeploy by uploading the new .zip file
// in the Console -> Code tab -> Update dropdown -> Update from a .zip file
// (this function has a real dependency - pdf-parse - so the inline code
// editor won't work; see CLAUDE.md's Lambda deployment section)
//
// Accepts a base64-encoded checklist PDF, parses it into
// { setName, insertSetName, cards: [{ cardNumber, playerName, notes }] },
// and returns that for review in the CMS before anything is written to
// DynamoDB - this function never touches the Checklists table itself,
// see saveChecklist for that.
//
// setName/insertSetName are derived from the filename, not PDF content:
// a comma in the filename splits it into the base set name and the
// insert set name (e.g. "1986-87 O-Pee-Chee Hockey, Team Canada -
// Checklist.pdf" -> setName "1986-87 O-Pee-Chee Hockey", insertSetName
// "Team Canada"). No comma means insertSetName is "" - a main-set
// upload. This convention (not a `type` field) is what saveChecklist
// keys its full-replace scoping off of.
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

// Leading letters are optional (insert sets are commonly numbered with a
// prefix, e.g. "R1", "R2" for a "Predictors" insert set) and a single
// trailing letter is also optional (e.g. "165a"). Requiring at least one
// digit somewhere in the middle is what keeps this from matching prose
// lines like "Trading Card Database" or the set title line - except for
// "NNO" ("No Number"), a standard checklist designation for unnumbered
// cards with no digit in it at all, matched as a specific exception
// rather than loosening the digit requirement generally (which would
// start matching ordinary prose lines).
const CARD_LINE_RE = /^(NNO|[A-Za-z]*\d+[A-Za-z]?)\s+(\S.*)$/i;

function isUnnumbered(cardNumber) {
  return cardNumber.toUpperCase() === "NNO";
}

function parseChecklistText(text) {
  const lines = text.split(/\r?\n/);
  const cards = [];
  const seenNumbers = new Set();
  const skippedDuplicates = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(CARD_LINE_RE);
    if (!match) {
      // A line that doesn't look like "<number> <name>" is either
      // header/title noise before the first card (nothing to attach it
      // to yet), or - for some PDFs - text that wrapped onto its own
      // line instead of staying on the card's line. Once at least one
      // card has been seen, attach it to that card rather than silently
      // dropping it - but what kind of text it is depends on how much
      // of a name the card already has:
      //   - exactly one word so far (e.g. "Blaine") almost certainly
      //     means the surname got cut off mid-name (e.g. "130 Blaine" /
      //     "Stoughton" -> "Blaine Stoughton", sometimes with a trailing
      //     note on the same wrapped line too, e.g. "Stoughton IA") - so
      //     run it through the same name/notes split as a normal line
      //     and merge each half in.
      //   - an unclosed "(" so far (e.g. a title like "Canada Cup
      //     Checklist (Brett Hull") means the name is mid-parenthetical
      //     regardless of word count - same merge treatment.
      //   - otherwise (e.g. "Points Leader", complete and balanced)
      //     the name is already finished, so the wrapped line is a
      //     genuine note (e.g. "RDM"/"Long Shot RDM") and gets appended
      //     whole.
      if (cards.length > 0) {
        const lastCard = cards[cards.length - 1];
        const nameWordCount = lastCard.playerName.split(/\s+/).filter(Boolean).length;
        const openParens = (lastCard.playerName.match(/\(/g) || []).length;
        const closeParens = (lastCard.playerName.match(/\)/g) || []).length;
        const nameLooksUnfinished = nameWordCount === 1 || openParens > closeParens;

        if (nameLooksUnfinished) {
          const { playerName: nameContinuation, notes: noteContinuation } = splitNameAndNotes(line);
          if (nameContinuation) {
            lastCard.playerName = `${lastCard.playerName} ${nameContinuation}`;
          }
          if (noteContinuation) {
            lastCard.notes = lastCard.notes ? `${lastCard.notes} ${noteContinuation}` : noteContinuation;
          }
        } else {
          lastCard.notes = lastCard.notes ? `${lastCard.notes} ${line}` : line;
        }
      }
      continue;
    }

    const [, cardNumber, remainder] = match;

    // "NNO" isn't a unique identifier - a set can legitimately have
    // several different unnumbered cards, all designated "NNO" - so
    // unlike a real duplicate card number (a genuine parsing artifact,
    // e.g. a stray repeated caption), repeated "NNO" lines are each a
    // separate card and none of them get skipped as duplicates.
    if (!isUnnumbered(cardNumber)) {
      if (seenNumbers.has(cardNumber)) {
        skippedDuplicates.push(line);
        continue;
      }
      seenNumbers.add(cardNumber);
    }

    const { playerName, notes } = splitNameAndNotes(remainder);
    cards.push({ cardNumber, playerName, notes });
  }

  return { cards, skippedDuplicates };
}

// Checklist source titles often end with the sport name (e.g. "1986-87
// O-Pee-Chee Hockey"), but this site's own Cards.setName convention
// doesn't include it (e.g. "1986-87 O-Pee-Chee") - strip it so the two
// match exactly, since saveChecklist's Cards lookup (hasChecklist flag)
// depends on an exact setName match.
function stripTrailingSport(setName) {
  return setName.replace(/\s+hockey\s*$/i, "").trim();
}

function deriveSetNames(fileName) {
  const base = (fileName || "").replace(/\.pdf$/i, "");
  const withoutSuffix = base.replace(/\s*-\s*checklist\s*$/i, "").trim();

  const commaIndex = withoutSuffix.indexOf(",");
  if (commaIndex === -1) {
    return { setName: stripTrailingSport(withoutSuffix), insertSetName: "" };
  }
  return {
    setName: stripTrailingSport(withoutSuffix.slice(0, commaIndex).trim()),
    insertSetName: withoutSuffix.slice(commaIndex + 1).trim()
  };
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

    const derived = deriveSetNames(fileName);
    const setName = body.setName?.trim() || derived.setName;
    const insertSetName = body.insertSetName?.trim() ?? derived.insertSetName;
    const { cards, skippedDuplicates } = parseChecklistText(pdfData.text);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ setName, insertSetName, cards, skippedDuplicates })
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
