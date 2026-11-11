/**
 * McFarlane's Shelf (cms/mcfarlanesShelf.html, dark-deployed): one card per Sportspicks figure, in the Wax Museum's
 * three-up grid, oldest release first. Same card style as the museum's packs, with one face (figures don't flip).
 */

// Same values as in cmsSportspicks.js (the CMS script isn't loaded here).
const SPORTSPICK_GET_URL = "https://j35hpf8jb8.execute-api.us-east-2.amazonaws.com/prod"; // getSportspicks API
const SPORTSPICK_IMAGE_BASE = "https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/img/sportspicks/";

// The "Chase!" sticker's 24-point star (fill and stroke come from styles.css).
const STARBURST_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><polygon points="50,0 59.3,15.2 75,6.7 75.5,24.5 93.3,25 84.8,40.7 100,50 84.8,59.3 93.3,75 75.5,75.5 75,93.3 59.3,84.8 50,100 40.7,84.8 25,93.3 24.5,75.5 6.7,75 15.2,59.3 0,50 15.2,40.7 6.7,25 24.5,24.5 25,6.7 40.7,15.2"/></svg>';

function shelfEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Oldest release first, then series ("Series 2" before "Series 10"), player and variant. */
function sortFigures(figures) {
  const compare = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base", numeric: true });
  return [...figures].sort((a, b) =>
    a.releaseYear - b.releaseYear ||
    compare(a.series, b.series) ||
    compare(a.playerName, b.playerName) ||
    compare(a.variant, b.variant));
}

/** [label, value] rows for the caption, leaving out anything empty (notes are optional). A variant gets a starburst instead. */
function figureDetails(figure) {
  return [
    ["Series", figure.series],
    ["Released", figure.releaseYear],
    ["Notes", figure.notes]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
}

function buildFigureCard(figure) {
  const item = shelfEl("article", "wax-museum-item");
  const card = shelfEl("div", "wax-museum-card");
  const front = shelfEl("div", "wax-museum-face wax-museum-front");

  // Comic-style "Chase!" starburst on the top corner; focusable so a tap shows the variant's name too
  if (figure.variant && String(figure.variant).trim()) {
    const burst = shelfEl("span", "mcfarlanes-variant");
    burst.tabIndex = 0;
    const star = shelfEl("span", "mcfarlanes-variant-star");
    star.innerHTML = STARBURST_SVG;
    star.appendChild(shelfEl("span", "mcfarlanes-variant-text", "Chase!"));
    burst.append(star, shelfEl("span", "mcfarlanes-variant-tip", figure.variant));
    front.appendChild(burst);
  }

  if (figure.image) {
    const img = shelfEl("img", "wax-museum-img");
    img.src = SPORTSPICK_IMAGE_BASE + encodeURIComponent(figure.image);
    img.alt = `${figure.playerName} McFarlane Sportspicks figure, ${figure.series}${figure.variant ? `, ${figure.variant}` : ""}`;
    img.width = 900;
    img.height = 1200;
    img.loading = "lazy";
    img.decoding = "async";
    front.appendChild(img);
  } else {
    front.appendChild(shelfEl("div", "wax-museum-noimg", "No image yet"));
  }

  const caption = shelfEl("div", "wax-museum-caption");
  caption.appendChild(shelfEl("h2", "wax-museum-name", figure.playerName));
  const list = shelfEl("dl", "wax-museum-details");
  figureDetails(figure).forEach(([label, value]) => {
    const row = shelfEl("div", label === "Notes" ? "wax-museum-detail wax-museum-detail-wide" : "wax-museum-detail");
    row.append(shelfEl("dt", "", label), shelfEl("dd", "", String(value)));
    list.appendChild(row);
  });
  caption.appendChild(list);
  front.appendChild(caption);

  card.appendChild(front);
  item.appendChild(card);
  return item;
}

async function initMcfarlanesShelf() {
  const status = document.getElementById("mcfarlanesShelfStatus");
  const hideSpinner = showSpinner(); // helper.js
  try {
    // no-store while dark, so a figure saved a moment ago shows up; drop it at go-live to use the 30-minute cache.
    const response = await fetch(SPORTSPICK_GET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const figures = await response.json();
    if (!Array.isArray(figures) || !figures.length) {
      status.textContent = "No figures yet.";
      return;
    }
    renderLazyGrid(document.getElementById("mcfarlanesShelf"), sortFigures(figures), buildFigureCard); // helper.js
    status.textContent = "";
  } catch (error) {
    console.log("McFarlane's Shelf load error:", error);
    status.textContent = "Couldn't load the figures. Please try again.";
  } finally {
    hideSpinner();
  }
}
