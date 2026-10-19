/**
 * Interactive timeline (timeline.html): builds one flip card per
 * "####" point of a markdown file. See styles.css's .timeline-* rules.
 */

const TIMELINE_MD_URL = "/timeline/timeline.md";

// "###" is the title, each "####" starts a point, "-" bullets are its
// content, and each two spaces of indent nests a bullet one level deeper,
// under the nearest bullet above it that is shallower.
function parseTimelineMarkdown(text) {
  const model = { title: "", points: [] };
  let point = null;
  let stack = [];

  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) return;

    if (line.startsWith("#### ")) {
      point = buildTimelinePoint(line.slice(5).trim());
      model.points.push(point);
      stack = [];
      return;
    }
    if (line.startsWith("### ")) {
      model.title = line.slice(4).trim();
      return;
    }

    const bullet = line.replace(/\t/g, "  ").match(/^(\s*)[-*]\s+(.*)$/);
    if (!bullet || !point) return;
    const item = { text: bullet[2].trim(), children: [] };
    const level = Math.floor(bullet[1].length / 2);
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    const siblings = stack.length ? stack[stack.length - 1].item.children : point.items;
    siblings.push(item);
    stack.push({ level, item });
  });

  return model;
}

// A leading season such as "1984-85" is split off so it can be a badge.
function buildTimelinePoint(heading) {
  const match = heading.match(/^(\d{4}-\d{2})(?:\s+(.*))?$/);
  return {
    year: match ? match[1] : "",
    title: match ? (match[2] || "") : heading,
    items: []
  };
}

function timelineEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function buildTimelineList(items) {
  const list = timelineEl("ul", "timeline-list");
  items.forEach((item) => {
    const li = timelineEl("li", "", item.text);
    if (item.children.length) li.appendChild(buildTimelineList(item.children));
    list.appendChild(li);
  });
  return list;
}

function buildTimelineCard(point, index) {
  const side = index % 2 ? "timeline-item-right" : "timeline-item-left";
  const article = timelineEl("article", `timeline-item ${side}`);
  const card = timelineEl("div", "timeline-card");

  // Front: a real button (a button can't hold the bullet list).
  const front = timelineEl("div", "timeline-face timeline-front");
  const toggle = timelineEl("button", "timeline-toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  if (point.year) toggle.appendChild(timelineEl("span", "timeline-year", point.year));
  if (point.title) toggle.appendChild(timelineEl("span", "timeline-heading", point.title));
  front.appendChild(toggle);

  // Back: the bullets. Clicking anywhere on it flips it shut; the title row
  // is the real button, for keyboard and screen-reader users.
  const back = timelineEl("div", "timeline-face timeline-back");
  const title = timelineEl("h3", "timeline-back-title");
  const label = [point.year, point.title].filter(Boolean).join(" ");
  const close = timelineEl("button", "timeline-close", label);
  close.type = "button";
  close.setAttribute("aria-label", `Close ${label}`);
  title.appendChild(close);
  back.append(title, buildTimelineList(point.items));

  card.append(front, back);
  article.appendChild(card);
  setTimelineCardOpen(card, false);

  toggle.addEventListener("click", () => setTimelineCardOpen(card, true, true));
  back.addEventListener("click", () => setTimelineCardOpen(card, false, true));
  back.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setTimelineCardOpen(card, false, true);
  });
  return article;
}

// The card is as tall as whichever face is showing, so a short front and
// a long back both fit without empty space.
function syncTimelineCardHeight(card) {
  const face = card.classList.contains("is-flipped")
    ? card.querySelector(".timeline-back")
    : card.querySelector(".timeline-front");
  card.style.height = `${face.offsetHeight}px`;
}

// Greys the card's front once it has been opened. Page memory only, so a
// reload starts fresh. Screen readers get the same cue as text.
function markTimelineCardViewed(card, front) {
  if (card.classList.contains("is-viewed")) return;
  card.classList.add("is-viewed");
  front.querySelector(".timeline-toggle").appendChild(timelineEl("span", "timeline-sr", " (viewed)"));
}

// Closing a tall card leaves the page scrolled to where its bottom was, far
// below the card. If the card's top is out of sight, scroll back up to it.
function scrollTimelineCardIntoView(card) {
  const top = card.getBoundingClientRect().top;
  if (top >= 0 && top < window.innerHeight - 120) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: window.scrollY + top - 80, behavior: reduced ? "auto" : "smooth" });
}

function setTimelineCardOpen(card, open, moveFocus = false) {
  const front = card.querySelector(".timeline-front");
  const back = card.querySelector(".timeline-back");
  card.classList.toggle("is-flipped", open);
  if (open) markTimelineCardViewed(card, front);
  front.querySelector(".timeline-toggle").setAttribute("aria-expanded", String(open));
  front.setAttribute("aria-hidden", String(open));
  front.inert = open;
  back.setAttribute("aria-hidden", String(!open));
  back.inert = !open;
  syncTimelineCardHeight(card);

  if (!moveFocus) return;
  const target = open ? back.querySelector(".timeline-close") : front.querySelector(".timeline-toggle");
  target.focus({ preventScroll: true });
  if (!open) scrollTimelineCardIntoView(card);
}

function renderTimeline(model, container) {
  const titleEl = document.getElementById("timelineTitle");
  if (titleEl && model.title) titleEl.textContent = model.title;

  const line = timelineEl("div", "timeline-line");
  model.points.forEach((point, i) => line.appendChild(buildTimelineCard(point, i)));
  container.replaceChildren(line);

  // Wrapping changes with the window width and the web font loading.
  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => syncTimelineCardHeight(entry.target.closest(".timeline-card")));
  });
  container.querySelectorAll(".timeline-face").forEach((face) => observer.observe(face));

  // Animate card heights only after the first layout, not from zero.
  requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add("timeline-ready")));
}

async function initTimeline() {
  const container = document.getElementById("timeline");
  const status = document.getElementById("timelineStatus");
  if (!container || !status) return;

  status.textContent = "Loading the timeline...";
  try {
    const res = await fetch(TIMELINE_MD_URL);
    if (!res.ok) throw new Error(`Timeline file request failed: ${res.status}`);
    const model = parseTimelineMarkdown(await res.text());
    if (!model.points.length) throw new Error("The timeline file has no points");
    renderTimeline(model, container);
    status.hidden = true;
  } catch (err) {
    console.log("Timeline:", err);
    status.textContent = "The timeline couldn't be loaded right now. Please try again later.";
  }
}
