#!/usr/bin/env node
// Minifies the public scripts and the stylesheet IN PLACE, for the Amplify
// build only (amplify.yml runs it after tools/generateReviewPages, which
// needs the readable helper.js). The repo keeps the readable source and
// nothing minified is committed; the build machine is thrown away.
//
// Each file is minified on its own: no bundling, no format. esbuild then keeps
// every top-level function/let/const/var name (inline onclick handlers and
// cross-file calls rely on them) and only shortens local names. The tool
// verifies that, and that each file got smaller, before moving on; any
// failure exits non-zero, which fails the build and leaves the previous
// deployment live. A linked source map is written next to each file.
//
// Runs on Node 16 (the build image), hence esbuild pinned to 0.19.x.
//
// Usage: node minify.mjs [--root <dir>]  (needs AWS_APP_ID, which Amplify
// sets, or --force-in-place; it overwrites files, so never run it on a working copy)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// The public pages' own files. The CMS scripts and scripts/fonts/ are left alone.
const SCRIPTS = ["helper", "wax", "ticker", "blogs", "playerSearch", "browseBySet", "timeline"]
  .map((name) => `scripts/${name}.js`);
const STYLES = ["styles/styles.css"];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (!process.env.AWS_APP_ID && !process.argv.includes("--force-in-place")) {
  console.error("Refusing to run: this overwrites files in place and is meant for the Amplify build (AWS_APP_ID).");
  console.error("To try it, run it on a copy of the repo with --force-in-place --root <copy>.");
  process.exit(1);
}

const ROOT = path.resolve(argValue("--root") || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."));

// Names the page's other scripts and inline handlers can reach: declarations at the start of a line.
function topLevelNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm)) names.add(match[1]);
  for (const match of source.matchAll(/^(?:let|const|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(match[1]);
  return [...names];
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const rows = [];
let totalBefore = 0;
let totalAfter = 0;

try {
  for (const file of [...SCRIPTS, ...STYLES]) {
    const abs = path.join(ROOT, file);
    const source = fs.readFileSync(abs, "utf8");
    const isScript = file.endsWith(".js");

    await build({
      entryPoints: [abs],
      outfile: abs,
      allowOverwrite: true,
      minify: true,
      sourcemap: true,
      charset: "utf8",
      legalComments: "none",
      logLevel: "warning"
    });

    const output = fs.readFileSync(abs, "utf8");
    if (!output.trim()) throw new Error(`${file}: the minified output is empty`);
    const before = Buffer.byteLength(source);
    const after = Buffer.byteLength(output);
    if (after >= before) throw new Error(`${file}: the output (${after} bytes) is not smaller than the source (${before})`);
    if (!fs.existsSync(`${abs}.map`)) throw new Error(`${file}: no source map was written`);

    if (isScript) {
      const names = topLevelNames(source);
      if (names.length === 0) throw new Error(`${file}: found no top-level names in the source - has the layout changed?`);
      const lost = names.filter((name) => !new RegExp(`(?<![\\w$])${escapeRegExp(name)}(?![\\w$])`).test(output));
      if (lost.length) throw new Error(`${file}: top-level names missing from the output: ${lost.join(", ")}`);
    }

    rows.push({ file, before, after });
    totalBefore += before;
    totalAfter += after;
  }
} catch (err) {
  console.error(`Minify failed: ${err.message}`);
  process.exit(1);
}

for (const { file, before, after } of rows) {
  console.log(`${file.padEnd(28)} ${String(before).padStart(7)} -> ${String(after).padStart(7)} bytes`);
}
console.log(`${"total".padEnd(28)} ${String(totalBefore).padStart(7)} -> ${String(totalAfter).padStart(7)} bytes (${rows.length} files)`);
