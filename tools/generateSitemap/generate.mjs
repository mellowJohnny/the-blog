#!/usr/bin/env node
// Generates sitemap.xml at the repo root.
//
// Every card set review has its own URL: waxReviews.html opens the set named
// by ?setID=, and a year with several sets rewrites its address bar and
// canonical to that set's URL (see scripts/wax.js). So the review entries
// come from the live site's own data - the public getPublicCardSets endpoint
// - and need regenerating whenever a set is added or removed:
//   - a year with ONE set is listed as the bare year URL (that is its canonical);
//   - a year with SEVERAL sets is listed as one ?setID= URL per set (the bare
//     year URL canonicalises to the top-rated set, so it isn't listed).
//
// The year ranges below are only used to work out each set's pageName; they
// are deliberately duplicated from categoryRanges in scripts/helper.js
// (a browser script, not a Node module) - keep them in sync by hand. A live
// set outside every range stops the run, so drift can't go unnoticed.
//
// Usage: node generate.mjs (writes ../../sitemap.xml, repo root). If the
// endpoint is unreachable or the data is unusable, sitemap.xml is left alone.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://www.junkwaxhockey.com";
const SETS_URL = "https://jlpd8ec14j.execute-api.us-east-2.amazonaws.com/prod";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Mirrors categoryRanges in scripts/helper.js's renderSetPicker().
const CARD_SET_RANGES = [
  { blogCat: "reg", pageName: "classicWax", start: 1981, end: 1986 },
  { blogCat: "reg", pageName: "junkWax", start: 1987, end: 1993 },
  { blogCat: "mcd", pageName: "mcd", start: 1991, end: 2007 },
  { blogCat: "tims", pageName: "timmies", start: 2019, end: 2026 }
];

// waxReviews.html special-cases exactly this one year+category
// combination to redirect straight to lockout.html instead of rendering
// (there was no 2004-05 McDonald's set - the season was cancelled) - so
// it's excluded here and lockout.html is listed separately below instead.
const REDIRECTED_COMBOS = new Set(["2004|mcd"]);

const STATIC_PAGES = [
  "/",
  "/playerSearch.html",
  "/lockout.html",
  "/theJunkWaxYears.html",
  "/timeline.html",
  "/browseBySet.html",
  "/about.html"
];

async function fetchLiveSets() {
  const res = await fetch(SETS_URL);
  if (!res.ok) throw new Error(`${SETS_URL} answered ${res.status}`);
  const sets = await res.json();
  if (!Array.isArray(sets) || sets.length === 0) throw new Error("The sets endpoint returned no sets");
  return sets;
}

function pageNameFor(set) {
  const range = CARD_SET_RANGES.find((r) => r.blogCat === set.blogCat && set.year >= r.start && set.year <= r.end);
  if (!range) throw new Error(`No year range covers "${set.setName}" (${set.blogCat} ${set.year}) - update CARD_SET_RANGES`);
  return range.pageName;
}

function buildUrls(sets) {
  const urls = STATIC_PAGES.map((page) => `${SITE_ORIGIN}${page}`);

  const groups = new Map();
  for (const set of sets) {
    if (!set.setID || !set.setName || !Number.isFinite(set.year)) throw new Error(`Unusable set record: ${JSON.stringify(set)}`);
    if (REDIRECTED_COMBOS.has(`${set.year}|${set.blogCat}`)) continue;
    const key = `${set.blogCat}|${set.year}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(set);
  }

  const orderedGroups = [...groups.values()].sort((a, b) =>
    a[0].blogCat.localeCompare(b[0].blogCat) || a[0].year - b[0].year);
  for (const group of orderedGroups) {
    const { blogCat, year } = group[0];
    const base = `${SITE_ORIGIN}/waxReviews.html?year=${year}&pageName=${pageNameFor(group[0])}&blogCat=${blogCat}`;
    if (group.length === 1) {
      urls.push(base);
    } else {
      group.sort((a, b) => a.setName.localeCompare(b.setName));
      for (const set of group) urls.push(`${base}&setID=${encodeURIComponent(set.setID)}`);
    }
  }

  if (new Set(urls).size !== urls.length) throw new Error("Duplicate URLs generated");
  return urls;
}

function escapeXml(url) {
  return url.replace(/&/g, "&amp;");
}

function buildSitemapXml(urls) {
  const entries = urls.map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

try {
  const sets = await fetchLiveSets();
  const urls = buildUrls(sets);
  const outPath = path.join(REPO_ROOT, "sitemap.xml");
  fs.writeFileSync(outPath, buildSitemapXml(urls));
  console.log(`Wrote ${urls.length} URLs (${sets.length} live sets) to ${outPath}`);
} catch (err) {
  console.error(`sitemap.xml not changed: ${err.message}`);
  process.exit(1);
}
