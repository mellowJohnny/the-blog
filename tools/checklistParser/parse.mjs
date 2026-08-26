#!/usr/bin/env node
// Parses a checklist PDF (one row per card: number, then player name,
// with optional trailing all-caps markers like RC/UER/CL/LL) into JSON:
// { setName, insertSetName, cards: [{ cardNumber, playerName, notes }] }
//
// setName/insertSetName are derived from the filename, not PDF content -
// a comma splits it into the base set name and the insert set name (see
// Lambdas/parseChecklistPdf/index.mjs's header comment; kept in sync
// deliberately). No comma means insertSetName is "" - a main-set upload.
//
// Usage:
//   node parse.mjs <path-to-pdf> [--set "Custom Set Name"] [--out output.json]
//
// With no --out, writes to checklists/<setName>[ - insertSetName].json
// at the repo root (created if needed) rather than printing to stdout.
//
// Assumes Title Case player names - a checklist source that prints names
// in ALL CAPS would need the note-detection logic below adjusted, since
// it currently treats any trailing all-caps token as a note rather than
// part of the name.

import fs from "node:fs";
import path from "node:path";
// Pinned to pdf-parse v1 (not v2 - see Lambdas/parseChecklistPdf/index.mjs
// for the reasons: v2's native canvas dependency, and importing
// lib/pdf-parse.js directly to dodge a bug in the package root's
// top-level index.js). Kept in sync with that Lambda deliberately -
// same parsing logic, same library version.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const args = process.argv.slice(2);
const pdfPath = args[0];
if (!pdfPath) {
  console.error("Usage: node parse.mjs <path-to-pdf> [--set \"Name\"] [--out output.json]");
  process.exit(1);
}

const setFlagIndex = args.indexOf("--set");
const outFlagIndex = args.indexOf("--out");
const setNameOverride = setFlagIndex !== -1 ? args[setFlagIndex + 1] : null;
const outPath = outFlagIndex !== -1 ? args[outFlagIndex + 1] : null;

// Checklist source titles often end with the sport name (e.g. "1986-87
// O-Pee-Chee Hockey"), but this site's own Cards.setName convention
// doesn't include it (e.g. "1986-87 O-Pee-Chee") - strip it so the two
// match exactly. Kept in sync with Lambdas/parseChecklistPdf/index.mjs.
function stripTrailingSport(setName) {
  return setName.replace(/\s+hockey\s*$/i, "").trim();
}

function deriveSetNames(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
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

// A "note" token is a trailing word that's entirely uppercase letters
// (2+ of them, no digits/periods/apostrophes) - e.g. RC, UER, CL, LL, SP.
// Real player-name tokens in this source are Title Case, or initials with
// periods (T.J.), so they never match this.
function isNoteToken(token) {
  const stripped = token.replace(/[.,]+$/, "");
  // Uppercase letters and digits both allowed (e.g. "1000PC" for a
  // "1000 Point Club" parallel), but require at least one letter -
  // otherwise a lone number could get misread as a note.
  return /^[A-Z0-9]{2,}$/.test(stripped) && /[A-Z]/.test(stripped);
}

// Inserts a space at digit<->letter boundaries in a note token, e.g.
// "500GC" -> "500 GC" (the source has no space, but it reads better
// with one). Pure-letter notes like "RC"/"VAR" have no such boundary
// and pass through unchanged.
function formatNoteToken(token) {
  return token.replace(/(\d)([A-Za-z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2");
}

function splitNameAndNotes(remainder) {
  const tokens = remainder.split(/\s+/).filter(Boolean);
  const noteTokens = [];
  while (tokens.length > 0 && isNoteToken(tokens[tokens.length - 1])) {
    noteTokens.unshift(formatNoteToken(tokens.pop()));
  }
  return {
    playerName: tokens.join(" "),
    notes: noteTokens.join(" "),
  };
}

// Leading letters are optional (insert sets are commonly numbered with a
// prefix, e.g. "R1", "R2" for a "Predictors" insert set, or "PR-1" for a
// "Parkie Reprints" insert set, or "McD 1" for a McDonald's insert set -
// the optional single hyphen or space between the letters and digits is
// for exactly this) and a single trailing letter is also optional (e.g.
// "165a"). Requiring at least one digit somewhere in the middle is what
// keeps this from matching prose lines like "Trading Card Database" or
// the set title line (which also always has a hyphen inside its year,
// e.g. "1997-98", immediately breaking the digit run before any
// whitespace) - except for "NNO" ("No Number") and the letters-hyphen-
// letters shape (e.g. "J-AM" for a jersey/memorabilia insert numbered
// by player initials, no digit anywhere in it), both matched as
// specific exceptions rather than loosening the digit requirement
// generally (which would start matching ordinary prose lines). The
// letters-hyphen-letters case additionally requires ALL CAPS (checked
// in code, not here - see isAllCapsLetterCode) since the regex alone
// can't distinguish "J-AM" from an ordinary Title-Case hyphenated
// phrase like "Self-Titled" that happens to share the same shape.
const CARD_LINE_RE = /^(NNO|[A-Za-z]+-[A-Za-z]+|[A-Za-z]*[-\s]?\d+[A-Za-z]?)\s+(\S.*)$/i;

function isUnnumbered(cardNumber) {
  return cardNumber.toUpperCase() === "NNO";
}

// A letters-hyphen-letters card number (no digit at all) is only a
// real card code when printed in ALL CAPS in the source - see
// CARD_LINE_RE's comment above for why this can't just be baked into
// the regex (which is case-insensitive throughout).
function isAllCapsLetterCode(cardNumber) {
  return /^[A-Z]+-[A-Z]+$/.test(cardNumber);
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
    // A checklist card's own description commonly references a range
    // of the real card numbers it covers, e.g. "NNO Parkies Checklist
    // #1:" wrapping onto "PR-1 - PR-8 CL". That continuation line
    // starts with what looks like a valid card number ("PR-1") followed
    // by a bare "-", which is the range dash, not part of a name - a
    // real card's remainder is a player name, never a bare "-". Treat
    // that shape as "not actually a new card" so it falls through to
    // the continuation-merge logic below instead of being read as a
    // (duplicate, and therefore silently dropped) fresh card.
    const isRangeReference = match && /^-\s/.test(match[2]);

    // See isAllCapsLetterCode()'s comment: a letters-hyphen-letters
    // match (no digit, not "NNO") is only a real card number if it's
    // printed in ALL CAPS - otherwise it's an ordinary hyphenated
    // phrase that happened to match the same broad shape.
    const isBogusLetterCode = match && !/\d/.test(match[1]) && !isUnnumbered(match[1]) && !isAllCapsLetterCode(match[1]);

    if (!match || isRangeReference || isBogusLetterCode) {
      // A line that doesn't look like "<number> <name>" is either
      // header/title noise before the first card (nothing to attach it
      // to yet - cards.length is still 0), or - for some PDFs - text
      // that wrapped onto its own line instead of staying on the
      // card's line (e.g. "456 Pittsburgh Wins Patrick" / "Division",
      // or "R30 Points Leader" / "Long Shot RDM"). Once at least one
      // card has been seen, run the wrapped line through the same
      // name/notes split used for a normal line and merge each half in
      // - whatever isn't a trailing all-caps note extends the name,
      // whatever is extends the notes. There's no reliable way to tell
      // "the name/title wasn't finished yet" apart from "this actually
      // is an independent note" from the text alone - both look like
      // plain Title-Case word(s) - so this favours completing the
      // name/title, which empirically is the more common case. The
      // rare case where a wrapped line is genuinely an independent note
      // phrase with no all-caps marker of its own (e.g. "Long Shot"
      // ahead of "RDM") ends up appended to the name instead - a minor
      // imperfection to catch in the review step, not a lost note.
      if (cards.length > 0) {
        const lastCard = cards[cards.length - 1];
        const { playerName: nameContinuation, notes: noteContinuation } = splitNameAndNotes(line);
        if (nameContinuation) {
          lastCard.playerName = `${lastCard.playerName} ${nameContinuation}`;
        }
        if (noteContinuation) {
          lastCard.notes = lastCard.notes ? `${lastCard.notes} ${noteContinuation}` : noteContinuation;
        }
      }
      continue;
    }

    const [, cardNumber, remainder] = match;
    const { playerName, notes } = splitNameAndNotes(remainder);

    // "NNO" isn't a unique identifier - a set can legitimately have
    // several different unnumbered cards, all designated "NNO" - so
    // unlike a real duplicate card number (a genuine parsing artifact,
    // e.g. a stray repeated caption), repeated "NNO" lines are each a
    // separate card and none of them get skipped as duplicates.
    //
    // The dedup key is cardNumber + notes, not cardNumber alone: some
    // sets legitimately reuse a card number across distinct parallels/
    // variants sharing the same base slot (e.g. "125 Patrick Roy AU,
    // SN1000" and "125 Patrick Roy AU, SN250" - two different serial-
    // numbered autograph parallels; or "AW5 Ray Bourque ERR" and "AW5
    // Ray Bourque COR" - an error and its correction). Those have
    // different notes, so they're kept as separate cards. A true parsing
    // artifact (the same line's text extracted twice) has identical
    // notes too, so it still collides and gets skipped.
    if (!isUnnumbered(cardNumber)) {
      const dedupeKey = `${cardNumber}|${notes}`;
      if (seenNumbers.has(dedupeKey)) {
        skippedDuplicates.push(line);
        continue;
      }
      seenNumbers.add(dedupeKey);
    }

    cards.push({ cardNumber, playerName, notes });
  }

  return { cards, skippedDuplicates };
}

const dataBuffer = fs.readFileSync(pdfPath);
const pdfData = await pdfParse(dataBuffer);

const derived = deriveSetNames(pdfPath);
const setName = setNameOverride || derived.setName;
const insertSetName = derived.insertSetName;
const { cards, skippedDuplicates } = parseChecklistText(pdfData.text);

if (skippedDuplicates.length > 0) {
  console.warn(`Skipped ${skippedDuplicates.length} duplicate-number line(s) (kept first occurrence):`);
  skippedDuplicates.forEach((l) => console.warn(`  ${l}`));
}

const result = { setName, insertSetName, cards };
const json = JSON.stringify(result, null, 2);

const outFileName = insertSetName ? `${setName} - ${insertSetName}.json` : `${setName}.json`;
const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const defaultOutPath = path.join(repoRoot, "checklists", outFileName);
const finalOutPath = outPath || defaultOutPath;

fs.mkdirSync(path.dirname(finalOutPath), { recursive: true });
fs.writeFileSync(finalOutPath, json);
console.log(`Wrote ${cards.length} cards to ${finalOutPath}`);
