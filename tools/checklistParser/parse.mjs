#!/usr/bin/env node
// Parses a TCDB.com-style checklist PDF (one row per card: number, then
// player name, with optional trailing all-caps markers like RC/UER/CL/LL)
// into JSON: { setName, cards: [{ cardNumber, playerName, notes }] }
//
// Usage:
//   node parse.mjs <path-to-pdf> [--set "Custom Set Name"] [--out output.json]
//
// With no --out, writes to checklists/<setName>.json at the repo root
// (created if needed) rather than printing to stdout.
//
// Assumes Title Case player names (tcdb.com's own formatting) - a checklist
// source that prints names in ALL CAPS would need the note-detection logic
// below adjusted, since it currently treats any trailing all-caps token as
// a note rather than part of the name.

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

function deriveSetName(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base.replace(/\s*-\s*checklist\s*$/i, "").trim();
}

// A "note" token is a trailing word that's entirely uppercase letters
// (2+ of them, no digits/periods/apostrophes) - e.g. RC, UER, CL, LL, SP.
// Real player-name tokens in this source are Title Case, or initials with
// periods (T.J.), so they never match this.
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
    notes: noteTokens.join(" "),
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

const dataBuffer = fs.readFileSync(pdfPath);
const pdfData = await pdfParse(dataBuffer);

const setName = setNameOverride || deriveSetName(pdfPath);
const { cards, skippedDuplicates } = parseChecklistText(pdfData.text);

if (skippedDuplicates.length > 0) {
  console.warn(`Skipped ${skippedDuplicates.length} duplicate-number line(s) (kept first occurrence):`);
  skippedDuplicates.forEach((l) => console.warn(`  ${l}`));
}

const result = { setName, cards };
const json = JSON.stringify(result, null, 2);

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const defaultOutPath = path.join(repoRoot, "checklists", `${setName}.json`);
const finalOutPath = outPath || defaultOutPath;

fs.mkdirSync(path.dirname(finalOutPath), { recursive: true });
fs.writeFileSync(finalOutPath, json);
console.log(`Wrote ${cards.length} cards to ${finalOutPath}`);
