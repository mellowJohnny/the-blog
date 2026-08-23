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
