#!/usr/bin/env node
// Generates sitemap.xml at the repo root.
//
// This site has no per-post/per-set permalinks - blog posts and card set
// reviews render as batches on shared query-string pages (?year=,
// ?blogType=, ?pageName=, ?blogCat=), not one URL per item (see
// Documentation/FRONTEND.md). So this sitemap lists every real
// *entry-point* page rather than every individual post/review - a hosted
// crawler (Algolia) still extracts one searchable record per item within
// each page via its own extraction config, so batch-level URLs are what
// it actually needs to discover.
//
// The year ranges below are deliberately
// duplicated from scripts/helper.js's categoryRanges rather
// than imported (helper.js is a browser script, not a Node module) -
// keep this in sync by hand when a new year is added there. Same
// established pattern as tools/checklistParser/'s parsing-logic
// duplication from Lambdas/parseChecklistPdf/.
//
// Usage: node generate.mjs (writes ../../sitemap.xml, repo root)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://www.junkwaxhockey.com";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Mirrors categoryRanges in scripts/helper.js's renderSetPicker().
const CARD_SET_RANGES = [
  { blogCat: "reg", pageName: "classicWax", start: 1981, end: 1986 },
  { blogCat: "reg", pageName: "junkWax", start: 1987, end: 1993 },
  { blogCat: "mcd", pageName: "mcd", start: 1991, end: 2006 },
  { blogCat: "tims", pageName: "timmies", start: 2020, end: 2025 }
];

// waxReviews.html special-cases exactly this one year+category
// combination to redirect straight to lockout.html instead of rendering
// (there was no 2004-05 McDonald's set - the season was cancelled) - so
// it's excluded here and lockout.html is listed separately below instead.
const REDIRECTED_COMBOS = new Set(["2004|mcd"]);

function buildUrls() {
  const urls = [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/playerSearch.html`];

  for (const { blogCat, pageName, start, end } of CARD_SET_RANGES) {
    for (let year = start; year <= end; year++) {
      if (REDIRECTED_COMBOS.has(`${year}|${blogCat}`)) continue;
      urls.push(`${SITE_ORIGIN}/waxReviews.html?year=${year}&pageName=${pageName}&blogCat=${blogCat}`);
    }
  }

  urls.push(`${SITE_ORIGIN}/lockout.html`);
  urls.push(`${SITE_ORIGIN}/theJunkWaxYears.html`);

  return urls;
}

function escapeXml(url) {
  return url.replace(/&/g, "&amp;");
}

function buildSitemapXml(urls) {
  const entries = urls.map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

const urls = buildUrls();
const xml = buildSitemapXml(urls);
const outPath = path.join(REPO_ROOT, "sitemap.xml");

fs.writeFileSync(outPath, xml);
console.log(`Wrote ${urls.length} URLs to ${outPath}`);
