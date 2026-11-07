#!/usr/bin/env node
// Checks the public pages against Documentation/STYLE_GUIDE.md. Run by hand before calling a
// UI change done; never part of the build. Default: lines changed since HEAD. --all: everything.
// Allowed values live in config.json. Exit code 1 when anything is found.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const config = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const ALL = process.argv.includes("--all");

const SCRIPT_FILES = config.scripts.map((name) => `scripts/${name}.js`);
const FILES = [...config.pages, ...SCRIPT_FILES, config.stylesheet];

const NAMED_COLOURS = /\b(white|black|red|blue|green|gr[ae]y|navy|yellow|orange|purple|pink|silver|maroon|teal|aqua|lime|olive|fuchsia|brown|gold)\b/i;
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\s*\(/i;
const PRESENTATIONAL = /<(i|b|font)(\s[^>]*)?>/i;
const RELATIVE_LINK = /href=["'](?!\/|#|https?:|mailto:|tel:|\$\{)([^"']+)["']/i;
const HEADING_CLASS = /(^|[\s.#>,])(h[1-3])\b|-(title|heading|name)\b/;

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// Line numbers (1-based) added or changed since HEAD, per file; null means "every line" (new file).
function changedLines() {
  const changed = new Map();
  for (const file of git(`ls-files --others --exclude-standard -- ${FILES.join(" ")}`).split("\n").filter(Boolean)) {
    changed.set(file, null);
  }
  let current = null;
  for (const line of git(`diff -U0 HEAD -- ${FILES.join(" ")}`).split("\n")) {
    const file = line.match(/^\+\+\+ b\/(.+)$/);
    if (file) { current = file[1]; if (!changed.has(current)) changed.set(current, new Set()); continue; }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && current && changed.get(current)) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let n = start; n < start + count; n++) changed.get(current).add(n);
    }
  }
  return changed;
}

const findings = [];
function report(file, lineNo, rule, text) {
  findings.push({ file, lineNo, rule, text: text.trim().slice(0, 110) });
}

// CMS-only rules are out of scope; approved components (STYLE_GUIDE.md, "Approved deviations") keep their own look.
function isSkippedSelector(selector) {
  return [...config.cmsSelectorPrefixes, ...config.approvedComponentPrefixes].some((prefix) => selector.includes(prefix));
}

function checkDeclaration(file, lineNo, selector, prop, value, piece) {
  const raw = `${selector.replace(/\s+/g, " ").slice(0, 50)} { ${piece.trim()} }`;
  const v = value.trim();
  const lower = v.toLowerCase();
  if (config.colourProperties.includes(prop) && !lower.startsWith("var(")) {
    const stripped = lower.replace(/var\([^)]*\)/g, "");
    const keywordOnly = config.colourKeywordsAllowed.includes(stripped.trim());
    if (!keywordOnly && (COLOUR_LITERAL.test(stripped) || NAMED_COLOURS.test(stripped))) report(file, lineNo, "colour", raw);
  }
  if (prop === "font-family") {
    const first = v.split(",")[0].replace(/["']/g, "").trim();
    const systemUiOk = first === "system-ui" && config.systemUiSelectors.some((s) => selector.includes(s));
    if (!config.fontFamilies.includes(first) && !systemUiOk) report(file, lineNo, "font-family", raw);
    else if (config.familiesNeedingFallback.includes(first) && !/Fallback/.test(v)) report(file, lineNo, "font-family", raw);
  }
  const sizeExempt = config.fontSizeExemptSelectors.some((s) => selector.includes(s));
  if (prop === "font-size" && lower !== "inherit" && !sizeExempt) {
    const px = lower.match(/^(\d+(?:\.\d+)?)px$/);
    if (!px || !config.fontSizesPx.includes(Number(px[1]))) report(file, lineNo, "font-size", raw);
  }
  if (prop === "font-weight" && !config.fontWeights.includes(lower)) report(file, lineNo, "font-weight", raw);
  const parts = selector.split(",").map((s) => s.trim());
  const linkInside = parts.every((s) => /\sa(:[a-z-]+)?$/.test(s));
  if ((prop === "font-size" || prop === "color") && HEADING_CLASS.test(selector) && !linkInside && !sizeExempt) {
    const shared = parts.every((s) => config.sharedHeadingSelectors.includes(s) || config.approvedHeadingSelectors.includes(s));
    if (!shared) report(file, lineNo, "heading-style", raw);
  }
}

function checkCss(file, lines, wanted) {
  let buffer = "";
  const stack = []; // selectors and at-rules currently open
  let inComment = false;
  lines.forEach((original, i) => {
    let line = original;
    if (inComment) {
      const end = line.indexOf("*/");
      if (end === -1) return;
      line = line.slice(end + 2);
      inComment = false;
    }
    line = line.replace(/\/\*.*?\*\//g, "");
    const open = line.indexOf("/*");
    if (open !== -1) { line = line.slice(0, open); inComment = true; }
    for (const ch of line.split(/([{};])/)) {
      if (ch === "{") { stack.push(buffer.trim()); buffer = ""; }
      else if (ch === "}") { checkPiece(buffer); stack.pop(); buffer = ""; }
      else if (ch === ";") { checkPiece(buffer); buffer = ""; }
      else buffer += ch + " ";
    }
    function checkPiece(piece) {
      const selector = [...stack].reverse().find((s) => !s.startsWith("@")) || "";
      if (!selector || selector === ":root" || isSkippedSelector(selector)) return;
      if (wanted && !wanted.has(i + 1)) return;
      const m = piece.match(/^\s*([a-z-]+)\s*:\s*(.+)$/i);
      if (m) checkDeclaration(file, i + 1, selector, m[1].toLowerCase(), m[2].replace(/!important/i, ""), piece);
    }
  });
}

function checkMarkup(file, lines, wanted, isHtml) {
  let lastLevel = 0;
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const want = !wanted || wanted.has(lineNo);
    if (want && /\sstyle\s*=\s*["']/.test(line)) report(file, lineNo, "inline-style", line);
    if (want && PRESENTATIONAL.test(line)) report(file, lineNo, "presentational-tag", line);
    if (want && RELATIVE_LINK.test(line) && !/<link\b/.test(line)) report(file, lineNo, "relative-link", line);
    if (isHtml) {
      for (const h of line.matchAll(/<h([1-6])\b/gi)) {
        const level = Number(h[1]);
        if (lastLevel && level > lastLevel + 1 && want) report(file, lineNo, "heading-skip", `h${lastLevel} → h${level}: ${line}`);
        lastLevel = level;
      }
    }
  });
}

const changed = ALL ? null : changedLines();
for (const file of FILES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  let wanted = null;
  if (changed) {
    if (!changed.has(file)) continue;
    wanted = changed.get(file); // null = new file, check every line
  }
  const lines = fs.readFileSync(full, "utf8").split("\n");
  if (file.endsWith(".css")) checkCss(file, lines, wanted);
  else checkMarkup(file, lines, wanted, file.endsWith(".html"));
}

if (!findings.length) {
  console.log(ALL ? "Style check: no findings in the public pages." : "Style check: no findings in the changed lines.");
  process.exit(0);
}
const byRule = {};
for (const f of findings) (byRule[f.rule] = byRule[f.rule] || []).push(f);
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`\n${rule} (${list.length})`);
  for (const f of list) console.log(`  ${f.file}:${f.lineNo}  ${f.text}`);
}
console.log(`\n${findings.length} finding(s)${ALL ? "" : " in changed lines"}. See Documentation/STYLE_GUIDE.md.`);
process.exit(1);
