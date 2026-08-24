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
// The year ranges and blogType/pageName pairs below are deliberately
// duplicated from scripts/helper.js's categoryRanges/NAV_ITEMS rather
// than imported (helper.js is a browser script, not a Node module) -
// keep this in sync by hand when a new year is added there. Same
// established pattern as tools/checklistParser/'s parsing-logic
// duplication from Lambdas/parseChecklistPdf/.
//
// Usage: node generate.mjs (writes ../../sitemap.xml, repo root)

import fs from "node:fs";
import path from "node:path";

const SITE_ORIGIN = "https://www.mellowjohnny.cc";
const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

// Mirrors categoryRanges in scripts/helper.js's renderSetPicker().
const CARD_SET_RANGES = [
  { blogCat: "reg", pageName: "classicWax", start: 1981, end: 1986 },
  { blogCat: "reg", pageName: "junkWax", start: 1987, end: 1993 },
  { blogCat: "mcd", pageName: "mcd", start: 1991, end: 2005 },
  { blogCat: "tims", pageName: "timmies", start: 2020, end: 2025 }
];

// waxReviews.html special-cases exactly this one year+category
// combination to redirect straight to lockout.html instead of rendering
// (there was no 2004-05 McDonald's set - the season was cancelled) - so
// it's excluded here and lockout.html is listed separately below instead.
const REDIRECTED_COMBOS = new Set(["2004|mcd"]);

// Mirrors NAV_ITEMS in scripts/helper.js for the blogTypes tech.html
// serves. blogType 1 (Tech) and 3 (Mach-E) are linked from the site's
// own nav; 4 (SYNC Updates) and 5 (Raspberry Pi) are real, published
// blogTypes (confirmed live via getBlogs) that currently have NO
// crawlable link path anywhere on the site - exactly the kind of page a
// sitemap exists to surface. Their pageName values are arbitrary slugs
// (tech.html only uses pageName to look up a nav table that doesn't yet
// have entries for these two types either) - the URL itself works
// regardless.
const TECH_BLOG_TYPES = [
  { blogType: 1, pageName: "tech" },
  { blogType: 3, pageName: "ev" },
  { blogType: 4, pageName: "sync" },
  { blogType: 5, pageName: "pi" }
];

function buildUrls() {
  const urls = [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/playerSearch.html`];

  for (const { blogType, pageName } of TECH_BLOG_TYPES) {
    urls.push(`${SITE_ORIGIN}/tech.html?blogType=${blogType}&pageName=${pageName}`);
  }

  for (const { blogCat, pageName, start, end } of CARD_SET_RANGES) {
    for (let year = start; year <= end; year++) {
      if (REDIRECTED_COMBOS.has(`${year}|${blogCat}`)) continue;
      urls.push(`${SITE_ORIGIN}/waxReviews.html?year=${year}&pageName=${pageName}&blogCat=${blogCat}`);
    }
  }

  urls.push(`${SITE_ORIGIN}/lockout.html`);

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
