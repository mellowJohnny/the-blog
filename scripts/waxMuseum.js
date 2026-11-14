/**
 * Wax Pack Museum (waxMuseum.html): one flip card per wax pack, in one grid, oldest year first.
 * Front = front image plus the saved details (year and type are left out), back = back image.
 */

// Same values as in cmsWaxPack.js (the CMS script can't load on a public page).
// waxMuseum.html preloads this exact URL so the request starts with the HTML; keep the two identical.
const WAX_PACK_GET_URL = "https://efh9lu4988.execute-api.us-east-2.amazonaws.com/prod"; // getWaxPacks API
const WAX_PACK_IMAGE_BASE = "https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/img/wax-packs/";

function waxMuseumEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// index: the card's place in the grid. The first row's fronts load eagerly and the very first one at high
// priority (it's the page's LCP); backs and later cards stay lazy. Omit it for an image that's never on screen at load.
function waxMuseumImage(fileName, alt, className, index = Infinity) {
  const img = waxMuseumEl("img", className);
  if (index >= lazyGridEagerCount()) img.loading = "lazy"; // helper.js; set before src, which starts the request
  if (index === 0) img.fetchPriority = "high";
  img.decoding = "async";
  img.alt = alt;
  img.width = 900;
  img.height = 1200;
  img.src = WAX_PACK_IMAGE_BASE + encodeURIComponent(fileName);
  return img;
}

const WAX_PACK_SERIES = /\bseries\s*(\d+)\b/i;

/** The number in a name like "... Series 2 ...", or 0 for a pack with no series. */
function waxPackSeries(pack) {
  const match = WAX_PACK_SERIES.exec(pack.name);
  return match ? Number(match[1]) : 0;
}

const WAX_PACK_LOW = /\blow\b/i;
const WAX_PACK_HIGH = /\bhigh\b/i;

/** 0 for a "Low" pack, 2 for a "High" pack, 1 for neither: Low packs came out before High packs. */
function waxPackRelease(pack) {
  if (WAX_PACK_LOW.test(pack.name)) return 0;
  return WAX_PACK_HIGH.test(pack.name) ? 2 : 1;
}

/** The set a pack belongs to: its name without the season ("1992-93"), without "Low", "High" or "Jumbo", and without "Series 2" or anything after it, so "1992-93 Parkhurst Series 2 Jumbo" is "Parkhurst". */
function waxPackSet(pack) {
  const withoutSeason = pack.name.replace(/^\s*\d{4}\s*-\s*\d{2,4}\s+/, "");
  const match = WAX_PACK_SERIES.exec(withoutSeason);
  const setName = match ? withoutSeason.slice(0, match.index) : withoutSeason;
  return setName.replace(/\b(low|high|jumbo)\b/gi, "").replace(/\s+/g, " ").trim();
}

/** Oldest year first, then one set at a time (A to Z), each with its packs in series order (none, 1, 2...), then Low before High, then A to Z by name. The API orders by key, which isn't always the name's order. */
function sortWaxPacks(packs) {
  const compare = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });
  return [...packs].sort((a, b) =>
    a.year - b.year ||
    compare(waxPackSet(a), waxPackSet(b)) ||
    waxPackSeries(a) - waxPackSeries(b) ||
    waxPackRelease(a) - waxPackRelease(b) ||
    compare(a.name, b.name));
}

/** [label, value] rows for the front, leaving out anything empty (price and notes are optional). */
function waxPackDetails(pack) {
  return [
    ["Manufacturer", pack.manufacturer],
    ["Packaging", pack.packaging],
    ["Cards per pack", pack.numCards],
    ["Price", pack.price],
    ["Notes", pack.notesFront || pack.notes] // "notes" is the old single field, shown as the front note until the pack is next saved
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
}

function buildWaxPackCaption(pack) {
  const caption = waxMuseumEl("div", "wax-museum-caption");
  const list = waxMuseumEl("dl", "wax-museum-details");
  waxPackDetails(pack).forEach(([label, value]) => {
    const row = waxMuseumEl("div", label === "Notes" ? "wax-museum-detail wax-museum-detail-wide" : "wax-museum-detail");
    row.append(waxMuseumEl("dt", "", label), waxMuseumEl("dd", "", String(value)));
    list.appendChild(row);
  });
  caption.appendChild(list);

  if (pack.reviewSlug) {
    const link = waxMuseumEl("a", "wax-museum-review", "Read the review");
    link.href = `/reviews/${encodeURIComponent(pack.reviewSlug)}/`;
    caption.appendChild(link);
  }
  return caption;
}

function buildWaxPackCard(pack, index) {
  const item = waxMuseumEl("article", "wax-museum-item");
  const card = waxMuseumEl("div", "wax-museum-card");

  // The pack's name in a navy band across the top: the card's heading on the front, repeated on the back so the photo doesn't move on a flip
  const front = waxMuseumEl("div", "wax-museum-face wax-museum-front");
  front.appendChild(waxMuseumEl("h2", "wax-museum-band", pack.name));
  if (pack.frontImg) {
    const picture = waxMuseumImage(pack.frontImg, `${pack.name} wax pack, front`, "wax-museum-img", index);
    if (pack.backImg) {
      const flip = waxMuseumEl("button", "wax-museum-flip");
      flip.type = "button";
      flip.setAttribute("aria-expanded", "false");
      flip.setAttribute("aria-label", `Show the back of the ${pack.name} pack`);
      flip.append(picture, waxMuseumEl("span", "wax-museum-hint", "Flip"));
      front.appendChild(flip);
    } else {
      front.appendChild(picture);
    }
  } else {
    front.appendChild(waxMuseumEl("div", "wax-museum-noimg", "No image yet"));
  }
  front.appendChild(buildWaxPackCaption(pack));
  card.appendChild(front);

  // A pack with no back photo simply doesn't flip.
  if (pack.backImg) {
    const back = waxMuseumEl("div", "wax-museum-face wax-museum-back");
    back.appendChild(waxMuseumEl("p", "wax-museum-band", pack.name));
    const close = waxMuseumEl("button", "wax-museum-flip");
    close.type = "button";
    close.setAttribute("aria-label", `Show the front of the ${pack.name} pack`);
    close.appendChild(waxMuseumImage(pack.backImg, `${pack.name} wax pack, back`, "wax-museum-img"));
    back.appendChild(close);
    if (pack.notesBack) {
      const notes = waxMuseumEl("div", "wax-museum-caption");
      const row = waxMuseumEl("div", "wax-museum-detail");
      row.append(waxMuseumEl("dt", "", "Notes"), waxMuseumEl("dd", "", pack.notesBack));
      const list = waxMuseumEl("dl", "wax-museum-details");
      list.appendChild(row);
      notes.appendChild(list);
      back.appendChild(notes);
    }
    card.appendChild(back);

    front.querySelector(".wax-museum-flip")?.addEventListener("click", () => setWaxPackCardFlipped(card, true, true));
    close.addEventListener("click", () => setWaxPackCardFlipped(card, false, true));
    back.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setWaxPackCardFlipped(card, false, true);
    });
    setWaxPackCardFlipped(card, false);
  }

  item.appendChild(card);
  return item;
}

/** The hidden face is inert so keyboard and screen-reader users only reach the one showing. */
function setWaxPackCardFlipped(card, flipped, moveFocus = false) {
  const front = card.querySelector(".wax-museum-front");
  const back = card.querySelector(".wax-museum-back");
  card.classList.toggle("is-flipped", flipped);
  front.inert = flipped;
  front.setAttribute("aria-hidden", String(flipped));
  front.querySelector(".wax-museum-flip")?.setAttribute("aria-expanded", String(flipped));
  back.inert = !flipped;
  back.setAttribute("aria-hidden", String(!flipped));
  if (moveFocus) (flipped ? back : front).querySelector(".wax-museum-flip").focus({ preventScroll: true });
}

/** Lazy-loads the sorted cards as the page scrolls (renderLazyGrid() in helper.js). */
function renderWaxMuseum(packs) {
  renderLazyGrid(document.getElementById("waxMuseum"), sortWaxPacks(packs), buildWaxPackCard);
}

async function initWaxMuseum() {
  const status = document.getElementById("waxMuseumStatus");
  const hideSpinner = showSpinner(); // helper.js
  try {
    const response = await fetch(WAX_PACK_GET_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const packs = await response.json();
    if (!Array.isArray(packs) || !packs.length) {
      status.textContent = "No wax packs yet.";
      return;
    }
    renderWaxMuseum(packs);
    status.textContent = "";
  } catch (error) {
    console.log("Wax museum load error:", error);
    status.textContent = "Couldn't load the wax packs. Please try again.";
  } finally {
    hideSpinner();
    document.getElementById("waxMuseum").setAttribute("aria-busy", "false"); // drops the space reserved while loading
  }
}
