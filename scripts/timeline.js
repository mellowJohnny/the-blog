/**
 * Interactive timeline (cms/timeline.html): builds one flip card per
 * "####" point of a markdown file. See styles.css's .timeline-* rules.
 */

const TIMELINE_MD_URL = "/cms/timeline/timeline.md";

// "###" is the title, each "####" starts a point, "-" bullets are its
// content and a bullet indented two spaces nests under the one above.
function parseTimelineMarkdown(text) {
  const model = { title: "", points: [] };
  let point = null;
  let parent = null;

  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) return;

    if (line.startsWith("#### ")) {
      point = buildTimelinePoint(line.slice(5).trim());
      model.points.push(point);
      parent = null;
      return;
    }
    if (line.startsWith("### ")) {
      model.title = line.slice(4).trim();
      return;
    }

    const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (!bullet || !point) return;
    const item = { text: bullet[2].trim(), children: [] };
    if (bullet[1].length >= 2 && parent) {
      parent.children.push(item);
    } else {
      point.items.push(item);
      parent = item;
    }
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

  // Back: the bullets. Clicking anywhere on it, or its button, flips it shut.
  const back = timelineEl("div", "timeline-face timeline-back");
  const head = timelineEl("div", "timeline-back-head");
  head.appendChild(timelineEl("h3", "timeline-back-title", [point.year, point.title].filter(Boolean).join(" ")));
  const close = timelineEl("button", "timeline-close", "Close");
  close.type = "button";
  close.setAttribute("aria-label", `Close ${point.year} ${point.title}`.replace(/\s+/g, " ").trim());
  head.appendChild(close);
  back.append(head, buildTimelineList(point.items));

  card.append(front, back);
  article.appendChild(card);
  setTimelineCardOpen(card, false);

  toggle.addEventListener("click", () => setTimelineCardOpen(card, true, true));
  back.addEventListener("click", () => setTimelineCardOpen(card, false, true));
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

function setTimelineCardOpen(card, open, moveFocus = false) {
  const front = card.querySelector(".timeline-front");
  const back = card.querySelector(".timeline-back");
  card.classList.toggle("is-flipped", open);
  front.querySelector(".timeline-toggle").setAttribute("aria-expanded", String(open));
  front.setAttribute("aria-hidden", String(open));
  front.inert = open;
  back.setAttribute("aria-hidden", String(!open));
  back.inert = !open;
  syncTimelineCardHeight(card);

  if (!moveFocus) return;
  const target = open ? back.querySelector(".timeline-close") : front.querySelector(".timeline-toggle");
  target.focus({ preventScroll: true });
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
