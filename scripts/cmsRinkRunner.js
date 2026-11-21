/** Rink Runner: the CMS home page's 8-bit hockey runner (cms/wlcms.html). A skater jumps the
 * obstacles that slide in on the ice; Space, Up or a click jumps (hold for a higher jump).
 * Everything is drawn from the pixel grids below; initRinkRunner() is the only entry point. */

// One character per pixel; "." is transparent. Monochrome: "S" and "o" are cut-outs in the page
// colour (faces, stripes), every other letter is drawn in the one dark ink.
const RINK_INK = "#535353";
const RINK_CUTOUTS = "So";

const RINK_SPRITES = {
  skaterA: [
    "....BBBB......", "...BBBBBB.....", "...BBSSSS.....", "....SSSKS.....", "....SSSS......",
    "...RRRRRR.....", "..RRooooRR....", "..RRRRRRRRS...", "..RRRRRRR.SK..", "..WWWWWWW...K.",
    "...BBBBBB....K", "...BBBBBB....K", "...RR..RR....K", "...RR..RR....K", "...WW..WW...KK",
    "...KK..KK.....", "..GGGG.GGGG..."
  ],
  skaterB: [
    "....BBBB......", "...BBBBBB.....", "...BBSSSS.....", "....SSSKS.....", "....SSSS......",
    "...RRRRRR.....", "..RRooooRR....", "..RRRRRRRRS...", "..RRRRRRR.SK..", "..WWWWWWW...K.",
    "...BBBBBB....K", "...BBBBBB....K", "..RR....RR...K", ".RR......RR..K", ".WW......WW.KK",
    ".KK.......KK..", "GGGG.....GGGG."
  ],
  puck: [".KKKKKK.", "KKKKKKKK", ".KKKKKK."],
  net: [
    "RRRRRRRRRRRRRRRR", "R.W.W.W.W.W.W.WR", "RW.W.W.W.W.W.W.R", "R.W.W.W.W.W.W.WR",
    "RW.W.W.W.W.W.W.R", "R.W.W.W.W.W.W.WR", "RW.W.W.W.W.W.W.R", "R.W.W.W.W.W.W.WR",
    "RW.W.W.W.W.W.W.R", "R..............R"
  ],
  referee: [
    "...KKKK...", "..KKKKKK..", "...SSSS...", "...SKSK...", "...SSSS...",
    "..KoKoKoK.", ".SKoKoKoKS", ".SKoKoKoKS", "..KoKoKoK.", "..KoKoKoK.",
    "..KKKKKKK.", "..KKK.KKK.", "..KKK.KKK.", "..KKK.KKK.", "..KK...KK.",
    "..WW...WW.", ".GGG..GGG."
  ],
  goalie: [
    ".......WWWW.........", "......WoWoWW........", "......WWWWWW........", ".....RRRRRRRR....KK.",
    "...BBRRooooRRBB..BBB", "..BBBRRRRRRRRBBB.BBB", ".BBB.RRRRRRRR.BBB...", ".....RRRRRRRR.......",
    "...WWWWWW..WWWWWW...", "..WWooWWW..WWWooWW..", ".WWWooWWW..WWWooWWW.", "WWWWWWWW....WWWWWWWW",
    "WWWWWWW......WWWWWWW"
  ],
  zamboni: [
    ".........KK...................", "........KSSK..................", "........KSSK..................",
    ".....KKKKKKKKKK...............", ".....K........K...............", ".....K........K...............",
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW.", "WoooooooooooooooooooooooooooWW", "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    "WRRRRRRRRRRRRRRRRRRRRRRRRRRRRW", "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW", ".WW.KKK.WWWWWWWWWWWW.KKK.WWWW.",
    "....KKK..............KKK......"
  ],
  sticks: [
    "K..........K", ".K........K.", "..K......K..", "...K....K...", "....K..K....",
    ".....KK.....", "....K..K....", "...K....K...", ".KK......KK.", "KK........KK"
  ]
};

const RINK_OBSTACLES = ["puck", "net", "referee", "goalie", "zamboni", "sticks"];
const RINK_PIXEL = 3;                          // each grid cell is a 3x3 block on the 600x180 canvas
const RINK_W = 600, RINK_H = 180, RINK_ICE_Y = 165;
const RINK_BEST_KEY = "rinkRunnerBest";

// A grid turned into an offscreen canvas once, drawn from then on with drawImage.
function rinkSprite(rows, paper) {
  const canvas = document.createElement("canvas");
  canvas.width = rows[0].length * RINK_PIXEL;
  canvas.height = rows.length * RINK_PIXEL;
  const ctx = canvas.getContext("2d");
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === ".") return;
    ctx.fillStyle = RINK_CUTOUTS.includes(cell) ? paper : RINK_INK;
    ctx.fillRect(x * RINK_PIXEL, y * RINK_PIXEL, RINK_PIXEL, RINK_PIXEL);
  }));
  return canvas;
}

function rinkBest() {
  try { return Number(localStorage.getItem(RINK_BEST_KEY)) || 0; } catch { return 0; }
}

function saveRinkBest(score) {
  try { localStorage.setItem(RINK_BEST_KEY, String(score)); } catch { /* private window: keep it for this visit only */ }
}

function initRinkRunner(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = RINK_W;
  canvas.height = RINK_H;
  ctx.imageSmoothingEnabled = false;
  const status = document.getElementById(`${canvasId}Status`);
  const paper = getComputedStyle(document.body).backgroundColor;   // cut-outs match the page, so no box shows
  const art = Object.fromEntries(Object.entries(RINK_SPRITES).map(([name, rows]) => [name, rinkSprite(rows, paper)]));
  // Skate scratches under the ice line, scattered once and scrolled past like the ground in a runner game.
  const scratches = Array.from({ length: 18 }, () => ({
    x: Math.random() * RINK_W, y: RINK_ICE_Y + 4 + Math.floor(Math.random() * 3) * 4, w: 2 + Math.floor(Math.random() * 3) * 2
  }));

  const skater = { x: 60, y: 0, vy: 0, w: art.skaterA.width, h: art.skaterA.height };
  let state = "ready", speed, distance, obstacles, nextGap, held, best = rinkBest(), last = null, stride = 0;

  function reset() {
    speed = 5; distance = 0; obstacles = []; nextGap = 260;
    skater.y = 0; skater.vy = 0; held = false;
  }

  function say(text) { if (status) status.textContent = text; }

  function jump() {
    if (state === "ready" || state === "over") { reset(); state = "running"; say("Skating. Space or click to jump."); return; }
    if (state === "paused") { state = "running"; return; }
    if (skater.y === 0) skater.vy = 8;   // y counts up from the ice
  }

  // Obstacles come at random, each far enough after the last to be jumpable at the current speed.
  function spawn() {
    const kind = RINK_OBSTACLES[Math.floor(Math.random() * RINK_OBSTACLES.length)];
    obstacles.push({ kind, x: RINK_W + 10, img: art[kind] });
    nextGap = speed * (40 + Math.random() * 45) + art[kind].width;
  }

  // Forgiving boxes: a few pixels in from each sprite's edge.
  function hits(o) {
    const sx = skater.x + 6, sw = skater.w - 12, sTop = RINK_ICE_Y - skater.y - skater.h + 4;
    const ox = o.x + 3, ow = o.img.width - 6, oTop = RINK_ICE_Y - o.img.height + 3;
    return sx < ox + ow && sx + sw > ox && RINK_ICE_Y - skater.y > oTop && sTop < RINK_ICE_Y;
  }

  function update(step) {
    distance += speed * step;
    speed = Math.min(11, 5 + distance / 2500);
    // Holding the key while rising means less gravity, so a longer press jumps higher.
    const gravity = held && skater.vy > 0 ? 0.38 : 0.7;
    if (skater.y > 0 || skater.vy > 0) {
      skater.vy -= gravity * step;
      skater.y = Math.max(0, skater.y + skater.vy * step);
      if (skater.y === 0) skater.vy = 0;
    }
    nextGap -= speed * step;
    if (nextGap <= 0) spawn();
    obstacles.forEach((o) => { o.x -= speed * step; });
    obstacles = obstacles.filter((o) => o.x + o.img.width > -10);
    stride += speed * step;
    if (obstacles.some(hits)) {
      state = "over";
      const score = Math.floor(distance / 10);
      if (score > best) { best = score; saveRinkBest(best); }
      say(`Game over. Score ${score}, best ${best}. Space or click to go again.`);
    }
  }

  // No scenery: a transparent canvas with one ice line and the scratches scrolling beneath it.
  function drawIce() {
    ctx.clearRect(0, 0, RINK_W, RINK_H);
    ctx.fillStyle = RINK_INK;
    ctx.fillRect(0, RINK_ICE_Y, RINK_W, 2);
    const offset = (distance || 0) % RINK_W;
    scratches.forEach((s) => {
      const x = (s.x - offset + RINK_W) % RINK_W;
      ctx.fillRect(Math.round(x), s.y, s.w, 2);
    });
  }

  function drawText(text, x, y, align = "left", size = 12) {
    ctx.fillStyle = RINK_INK;
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  function draw() {
    drawIce();
    obstacles.forEach((o) => ctx.drawImage(o.img, Math.round(o.x), RINK_ICE_Y - o.img.height));
    const frame = skater.y > 0 || state !== "running" ? art.skaterA : (Math.floor(stride / 40) % 2 ? art.skaterB : art.skaterA);
    const top = RINK_ICE_Y - skater.y - skater.h;
    if (state === "over") {                                                       // knocked flat on the ice
      ctx.save();
      ctx.translate(skater.x + skater.h, RINK_ICE_Y - skater.w);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(frame, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(frame, skater.x, Math.round(top));
    }
    const score = Math.floor((distance || 0) / 10);
    drawText(`HI ${String(best).padStart(5, "0")}  ${String(score).padStart(5, "0")}`, RINK_W - 10, 20, "right");
    if (state === "ready") drawText("PRESS SPACE TO SKATE", RINK_W / 2, 80, "center", 16);
    if (state === "paused") drawText("PAUSED: PRESS SPACE", RINK_W / 2, 80, "center", 16);
    if (state === "over") {
      drawText("GAME OVER", RINK_W / 2, 70, "center", 18);
      drawText("PRESS SPACE TO GO AGAIN", RINK_W / 2, 92, "center", 12);
    }
  }

  function loop(now) {
    const step = last === null ? 1 : Math.min(3, (now - last) / (1000 / 60));   // in 60fps frames, capped after a stall
    last = now;
    if (state === "running") update(step);
    draw();
    requestAnimationFrame(loop);
  }

  // Keys only count when they aren't meant for a form field, and only Space/Up are taken from the page.
  const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName));
  document.addEventListener("keydown", (event) => {
    if ((event.code !== "Space" && event.code !== "ArrowUp") || typing(event.target)) return;
    event.preventDefault();
    if (!event.repeat) jump();
    held = true;
  });
  document.addEventListener("keyup", (event) => { if (event.code === "Space" || event.code === "ArrowUp") held = false; });
  canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); jump(); held = true; });
  window.addEventListener("pointerup", () => { held = false; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") state = "paused";
    last = null;
  });

  reset();
  requestAnimationFrame(loop);
}
