/** Rink Runner: the CMS home page's 8-bit hockey runner (cms/wlcms.html). A skater jumps the
 * obstacles that slide in on the ice; Space, Up or a click jumps (hold for a higher jump).
 * Everything is drawn from the pixel grids below; initRinkRunner() is the only entry point. */

// Full-colour sprites: one character per pixel, "." is transparent. Each colour has a light, mid
// and dark tone (red A-C, blue D-F, white G-I, skin J-M, wood N-P, black Q-S, steel T-V, glove W-Y,
// orange Z-b, net c-e, tyre f-h), and "k" is the dark outline around every sprite.
const RINK_PALETTE = {
  A: "#e8444b", B: "#b8182e", C: "#7c0f22", D: "#4f78e0", E: "#2a45a8", F: "#19296b",
  G: "#ffffff", H: "#e3e7ef", I: "#a9b2c4", J: "#ffd8ad", L: "#f2b27e", M: "#c97f4e",
  N: "#f1c477", O: "#d39a4b", P: "#9a6528", Q: "#5a5c68", R: "#33343d", S: "#1d1e24",
  T: "#ffffff", U: "#c5ccd6", V: "#8792a3", W: "#8a5a3c", X: "#5e3a26", Y: "#3d2418",
  Z: "#ffb347", a: "#f28c1e", b: "#b85f0c", c: "#ffffff", d: "#f1f3f7", e: "#cfd5df",
  f: "#4a4b55", g: "#2b2c33", h: "#18191e", k: "#1a1420"
};
const RINK_INK = "#535353";                    // the ice line, scratches and score text

const RINK_SPRITES = {
  // Side view, leaning into the stride, stick out in front with the blade on the ice.
  // A: back leg pushing out behind. B: legs gathered under him for the next push.
  skaterA: [
    "........................kkk..................", "......................kkAAAkk................",
    ".....................kAABBBAAk...............", "....................kABBBBBBBAk..............",
    "....................kACCCCCCCCk..............", "....................kDDDDDDDDDDk.............",
    ".................kkkkAAAAAJJkJk..............", "...............kkDDDABBBBCJLJMk..............",
    "..............kDDFFABBBBBCJLLMk..............", "..............kDFAABBBBBBCJMMMk..............",
    "..............kAABBBBBBBCCkkkk...............", ".............kABBBBBBBBCCk...................",
    "............kABBBBBBBBBCGGk..................", "...........kABBBBBBBBCCCGHGk.................",
    "..........kABBBBBBBBBCkAAGIAk................", ".........kABBBBBBBBBCCkkAAABAk...............",
    "........kACCBBBBBBBCCk..kABCCWk..............", "........kDGGACCBBBBCk....kACWXWk.............",
    "........kDGIGGGACCCCk.....kWXXYWk............", ".......kkDDDGIIGGGADk......kWYYk.............",
    "......kDDEEEDDDGIIGGDkk.....kWNNk............", ".....kDFFEEEEEEDDDGIDDDk.....kkNNk...........",
    "....kDAAADEFFFFFFEDDAAADk......kNNk..........", "...kAACBCDFFkkkkkDFFACCDk.......kNNk.........",
    "..kAGGGACDFk.....kDGGGGDk........kNNk........", ".kACGIIADkk.......kGIIIk..........kNNk.......",
    "kQQQQQQkk........kQQQQQQk..........kNNk......", "kQSSSSSQk........kQSSSSSQk..........kNNk.....",
    ".kkkkkkk..........kkkkkkk...........kNONkkkk.", ".kTkkkTk..........kTkkkTk............kNONNNNk",
    ".kTTTTVTk.........kTTTTVTk...........kNPPPPPk", "..kkkkkk...........kkkkkk.............kkkkkk."
  ],
  skaterB: [
    "........................kkk..................", "......................kkAAAkk................",
    ".....................kAABBBAAk...............", "....................kABBBBBBBAk..............",
    "....................kACCCCCCCCk..............", "....................kDDDDDDDDDDk.............",
    ".................kkkkAAAAAJJkJk..............", "...............kkDDDABBBBCJLJMk..............",
    "..............kDDFFABBBBBCJLLMk..............", "..............kDFAABBBBBBCJMMMk..............",
    "..............kAABBBBBBBCCkkkk...............", ".............kABBBBBBBBCCk...................",
    "............kABBBBBBBBBCGGk..................", "...........kABBBBBBBBCCCGHGk.................",
    "..........kABBBBBBBBBCkAAGIAk................", ".........kABBBBBBBBBCCkkAAABAk...............",
    "........kACCBBBBBBBCCk..kABCCWk..............", "........kDGGACCBBBBCk....kACWXWk.............",
    "........kDGIGGGACCCCk.....kWXXYWk............", "........kDDDGIIGGGADk......kWYYk.............",
    ".........kDEDDDGIIGGk.......kWNNk............", ".........kDFFEEDDDGIDk.......kkNNk...........",
    "........kDAAADFFFFAAADk........kNNk..........", "........kACCCDkkDACCCDk.........kNNk.........",
    ".......kGGGGADk.kGGGADk..........kNNk........", "......kAGIIIDk.kAGIIDk............kNNk.......",
    ".....kQQQQQQk.kQQQQQQk.............kNNk......", ".....kQSSSSSQkkQSSSSSQk.............kNNk.....",
    "......kkkkkkk..kkkkkkk..............kNONkkkk.", "......kTkkkTk..kTkkkTk...............kNONNNNk",
    "......kTTTTVTk.kTTTTVTk..............kNPPPPPk", ".......kkkkkk...kkkkkk................kkkkkk."
  ],
  puck: [
    ".kkkkkkkkkkk.", "kQQQQQQQQQQQk", "kRRRRRRRRRRRk", "kSSSSSSSSSSSk", ".kkkkkkkkkkk."
  ],
  // A real net is 6' wide and 4' tall, so the frame keeps that 3:2 shape.
  net: [
    ".kkkkkkkkkkkkkkkkkkkkkkkkkk.", "kAAAAAAAAAAAAAAAAAAAAAAAAAAk", "kACCCCCCCCCCCCCCCCCCCCCCCBCk",
    "kACcccGccGccGccGccGccGcccACk", "kACcdeGceGceGceGceGceGcdeACk", "kACceeGceGceGceGceGceGceeACk",
    "kACGGGIGGIGGIGGIGGIGGIGGGACk", "kACcccGccGccGccGccGccGcccACk", "kACceeGceGceGceGceGceGceeACk",
    "kACGGGIGGIGGIGGIGGIGGIGGGACk", "kACcccGccGccGccGccGccGcccACk", "kACceeGceGceGceGceGceGceeACk",
    "kACGGGIGGIGGIGGIGGIGGIGGGACk", "kACcccGccGccGccGccGccGcccACk", "kACceeGceGceGceGceGceGceeACk",
    "kACGGGIGGIGGIGGIGGIGGIGGGACk", "kACcccGccGccGccGccGccGcccACk", "kACkkkkkkkkkkkkkkkkkkkkkkACk",
    ".kk......................kk."
  ],
  referee: [
    "......kkkk.....", "....kkQQQQk....", "...kQQRRRRQk...", "...kQSRRRSSk...", "....kJQSSSJk...", "....kJJJJJkk...",
    "....kJLLLMJk...", "....kJMLMMkk...", "...kGQGJMGQGk..", "..kGIQGQGHGIk..", ".kkGIQGQGIIHGk.", "kZZZGQGQGIQGIk.",
    ".kGGIQGQGIQGHGk", ".kGHIQGQGIQGHIk", "kGIIIQGQGIQGHIk", "kGIkGQGQGIQGIIk", "kJkkGQGQGIQGkJk", ".k.kGQGQGIQGkk.",
    "...kGQGQGIQGk..", "...kQRQkQQSk...", "...kQRSkQRSk...", "...kQRSkQRRQk..", "..kkQRSkkQRSkk.", ".kQQRRRQQRRRQQk",
    ".kQSSSSSSSSSSSk", "..kkTkkTkkTkkTk", "...kTTTVkkTTTVk", "...kTVVVkkTVVVk", "....kkkk..kkkk."
  ],
  goalie: [
    "...........kkkk...........", "..........kGGGGk..........", ".........kGHHHHGk.........", ".........kGIIIIIGk........",
    ".........kGIQGQQGk........", ".........kGIQGQSGk........", "......kkkkGIQGQSkkk.......", ".....kAAAAAGGIGAAAAkk.....",
    "....kDDDABBAAAABBCDDDk....", "...kDEFFABBBBBBBBCDEEDk...", "...kDEFABBBBBBBBBBADFFDk..", ".kkDFFFACCCCCCCCCCCADWWWk.",
    "kGGGGDGGGGGGGGGGGGGAWXXXWk", "kGHHIkAAAAAAAAAAAAACWXXXYk", "kGHHIABBBBBBBBBBBBBCWXXXYk", "kGHHIACCCCCCCCCCCCCCkWYYYk",
    "kGIIIkDDDDDDDDDDDDDk.kkkk.", "kGNNGkDFFFFEEFFFFFFk......", ".kNPkGGGGGGDFFGGGGGGk.....", ".kNPkGIIIIIkkkGIIIIIk.....",
    "..kNkAAAAAAk.kAAAAAAk.....", "..kNNACCCCCk.kACCCCCk.....", "..kNPGGGGGGk.kGGGGGGk.....", "..kNPAAAAAAkkkAAAAAAk.....",
    "..kNONNNNNNNNkGGGGGGk.....", "...kNPPPPPPPPkTTTTTTk.....", "....kkkkkkkkk.kkkkkk......"
  ],
  // Side view, driving left: the snow tank up front, the seat and wheel behind it, and the
  // conditioner box trailing on the ice at the back.
  zamboni: [
    "..kkkkkkkkkkkkkkkkkkkkkkkkk......kQQk....", ".kGGGGGGGGGGGGGGGGGGGGGGGGGkk..kkkQSk....",
    "kGHHHHHHHHHHHHHHHHHHHHHHHHIkQkkQQQRSk....", "kGHHHHHHHHHHHHHHHHHHHHHHHHIkQkkQRRRSk....",
    "kGHHHHHHHHHHHHHHHHHHHHHHHHHGQkDQSSSSk....", "kGHHHHHHHHHHHHHHHHHHHHHHHHHIQQDDkkkk.....",
    "kGIIIIIIIIIIIIIIIIIIIIIIIIIIGQDFkkkk.....", "kDDDDDDDDDDDDDDDDDDDDDDDDDDDDDEEDDDDk....",
    "kDEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEFk....", "kDEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEFk....",
    "kDEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEFk....", "kDEEFFFFFFEEEEEEEEEEEEFFFFFFEEEEEEEFk....",
    "kDEFFfffffDEEEEEEEEEEFFfffffDEEEEEEFk....", "kDFFfghhhgfDFFFFFFFFFFfghhhgfDFFFFFFkkkk.",
    ".kkkfhhTTfgfkkkkkkkkkkfhhTTfgfkkQQQQQQQQk", "...kfhTUVfghk........kfhTUVfghkkQRRRRRRSk",
    "...kfgfTVfhhk........kfgfTVfhhkkQRRRRRRSk", "...kfggffhhk.........kfggffhhk.kQSSSSSSSk",
    "....kfhhhhk...........kfhhhhk..kTTTTTTTTk", ".....kkfkk.............kkfkk....kkkkkkkk."
  ],
  sticks: [
    ".kQQQk.........kQQk.", ".kQSSk.........kQSk.", "..kNNk........kNNk..", "...kNNk......kNPk...", "....kNNk....kNPk....",
    ".....kNNk..kNPk.....", "......kNNkkNPPk.....", ".......kNNNPPk......", "........kNOPk.......", ".......kNPPPk.......",
    "......kNPPkNNk......", ".....kNPPk.kNNk.....", ".kkkkNPPk...kNNkkkk.", "kNNNNOPk....kNONNNNk", "kNOOOOPk....kNOOOOPk",
    "kNPPPPPk....kNPPPPPk", ".kkkkkk......kkkkkk."
  ]
};

const RINK_OBSTACLES = ["puck", "net", "referee", "goalie", "zamboni", "sticks"];
const RINK_PIXEL = 2;                          // each grid cell is a 2x2 block on the 600x180 canvas
const RINK_REACH = 32;                         // grid columns from the skater's back to his glove; the stick beyond doesn't collide
const RINK_W = 600, RINK_H = 180, RINK_ICE_Y = 165;
const RINK_MIN_GAP = 36;                       // frames; a simulation of back-to-back jumps fails below about 27
const RINK_BEST_KEY = "rinkRunnerBest";
const RINK_MUSIC_KEY = "rinkRunnerMusic";
const RINK_MUSIC_REST = 8;                     // seconds of quiet between one "Charge!" and the next build-up

// One organ note: the pitch plus its octave and twelfth (like a Hammond's drawbars), with a little
// vibrato and a quick attack and release. Times are on the audio clock, in seconds.
function rinkOrganNote(audio, out, freq, start, length, level) {
  const env = audio.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(level, start + 0.012);
  env.gain.setValueAtTime(level, Math.max(start + 0.012, start + length - 0.04));
  env.gain.linearRampToValueAtTime(0, start + length);
  env.connect(out);
  const lfo = audio.createOscillator(), depth = audio.createGain();
  lfo.frequency.value = 6.5;
  depth.gain.value = freq * 0.004;
  lfo.connect(depth);
  [[1, 0.56], [2, 0.28], [3, 0.16]].forEach(([harmonic, mix]) => {
    const osc = audio.createOscillator(), amp = audio.createGain();
    osc.frequency.value = freq * harmonic;
    depth.connect(osc.frequency);
    amp.gain.value = mix;
    osc.connect(amp).connect(env);
    osc.start(start); osc.stop(start + length + 0.05);
  });
  lfo.start(start); lfo.stop(start + length + 0.05);
}

// One cycle of the arena classic: a climb that gets quicker and louder, then "da da da DUM, da DUM!"
// and a full chord for the crowd's "Charge!". Returns the cycle's length in seconds.
function rinkChargeCycle(audio, out, start) {
  const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
  let t = start;
  for (let step = 0; step <= 12; step++) {                       // G3 up a semitone at a time to G4
    const beat = 0.5 - step * 0.016, level = 0.12 + step * 0.019;
    [0, beat / 2].forEach((offset) => {
      rinkOrganNote(audio, out, hz(55 + step), t + offset, beat * 0.35, level);
      rinkOrganNote(audio, out, hz(67 + step), t + offset, beat * 0.35, level * 0.7);
    });
    t += beat;
  }
  t += 0.25;
  [[67, 0, 0.13], [72, 0.15, 0.13], [76, 0.3, 0.13], [79, 0.45, 0.45], [76, 0.95, 0.15], [79, 1.12, 0.8]]
    .forEach(([note, at, length]) => {
      rinkOrganNote(audio, out, hz(note), t + at, length, 0.4);
      rinkOrganNote(audio, out, hz(note - 12), t + at, length, 0.18);
    });
  [48, 60, 64, 67, 72].forEach((note) => rinkOrganNote(audio, out, hz(note), t + 2.1, 0.6, 0.2));   // Charge!
  return t + 2.7 - start;
}

// A grid turned into an offscreen canvas once, drawn from then on with drawImage.
function rinkSprite(rows) {
  const canvas = document.createElement("canvas");
  canvas.width = rows[0].length * RINK_PIXEL;
  canvas.height = rows.length * RINK_PIXEL;
  const ctx = canvas.getContext("2d");
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === ".") return;
    ctx.fillStyle = RINK_PALETTE[cell];
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

function rinkMusicOn() {
  try { return localStorage.getItem(RINK_MUSIC_KEY) !== "off"; } catch { return true; }
}

function saveRinkMusic(on) {
  try { localStorage.setItem(RINK_MUSIC_KEY, on ? "on" : "off"); } catch { /* private window: this visit only */ }
}

function initRinkRunner(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = RINK_W;
  canvas.height = RINK_H;
  ctx.imageSmoothingEnabled = false;
  const status = document.getElementById(`${canvasId}Status`);
  const art = Object.fromEntries(Object.entries(RINK_SPRITES).map(([name, rows]) => [name, rinkSprite(rows)]));
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

  // The organ plays only during a run. The AudioContext is made on the player's first key or click,
  // since browsers won't start sound before that; each cycle gets its own gain so it can fade out.
  let musicOn = rinkMusicOn(), audio = null, musicGain = null, musicTimer = null;

  function startMusic() {
    stopMusic();
    if (!musicOn) return;
    if (!audio) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio = new Context();
    }
    audio.resume();
    const cycle = () => {
      if (musicGain) musicGain.disconnect();                     // the last cycle finished during the rest
      musicGain = audio.createGain();
      musicGain.gain.value = 0.5;
      musicGain.connect(audio.destination);
      const length = rinkChargeCycle(audio, musicGain, audio.currentTime + 0.05);
      musicTimer = setTimeout(cycle, (length + RINK_MUSIC_REST) * 1000);
    };
    cycle();
  }

  function stopMusic() {
    clearTimeout(musicTimer);
    musicTimer = null;
    if (!musicGain) return;
    const fading = musicGain, now = audio.currentTime;
    fading.gain.cancelScheduledValues(now);
    fading.gain.setValueAtTime(fading.gain.value, now);
    fading.gain.linearRampToValueAtTime(0, now + 0.15);
    setTimeout(() => fading.disconnect(), 300);
    musicGain = null;
  }

  function toggleMusic() {
    musicOn = !musicOn;
    saveRinkMusic(musicOn);
    if (musicOn && state === "running") startMusic(); else stopMusic();
  }

  function jump() {
    if (state === "ready" || state === "over") {
      reset(); state = "running"; say("Skating. Space or click to jump."); startMusic(); return;
    }
    if (state === "paused") { state = "running"; startMusic(); return; }
    if (skater.y === 0) skater.vy = 7.5;   // y counts up from the ice
  }

  // Obstacles come at random, closer together as the speed rises, but never nearer than
  // RINK_MIN_GAP frames after the skater has passed the last one, so any two in a row can be jumped.
  function spawn() {
    const kind = RINK_OBSTACLES[Math.floor(Math.random() * RINK_OBSTACLES.length)];
    obstacles.push({ kind, x: RINK_W + 10, img: art[kind] });
    const pace = (speed - 5) / 6;                                     // 0 at the start, 1 at top speed
    const frames = RINK_MIN_GAP + 4 * (1 - pace) + Math.random() * (45 - 30 * pace);
    nextGap = speed * frames + RINK_REACH * RINK_PIXEL + art[kind].width;
  }

  // Forgiving boxes: a few pixels in from each sprite's edge, and the stick out front doesn't count.
  function hits(o) {
    const sx = skater.x + 6, sw = RINK_REACH * RINK_PIXEL - 12, sTop = RINK_ICE_Y - skater.y - skater.h + 4;
    const ox = o.x + 3, ow = o.img.width - 6, oTop = RINK_ICE_Y - o.img.height + 3;
    return sx < ox + ow && sx + sw > ox && RINK_ICE_Y - skater.y > oTop && sTop < RINK_ICE_Y;
  }

  function update(step) {
    distance += speed * step;
    speed = Math.min(11, 5 + distance / 2500);
    // Holding the key while rising means less gravity, so a longer press jumps higher.
    const gravity = held && skater.vy > 0 ? 0.3 : 0.55;
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
      stopMusic();
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
    if (state === "over") {                                                       // tripped: tipped forward over his toes
      ctx.save();
      const toe = 26 * RINK_PIXEL;                                               // front skate's toe, the pivot
      ctx.beginPath(); ctx.rect(0, 0, RINK_W, RINK_ICE_Y); ctx.clip();           // the stick stays above the ice
      ctx.translate(skater.x + toe, RINK_ICE_Y);
      ctx.rotate(0.9);
      ctx.drawImage(frame, -toe, -skater.h);
      ctx.restore();
    } else {
      ctx.drawImage(frame, skater.x, Math.round(top));
    }
    const score = Math.floor((distance || 0) / 10);
    drawText(`HI ${String(best).padStart(5, "0")}  ${String(score).padStart(5, "0")}`, RINK_W - 10, 20, "right");
    drawText(musicOn ? "MUSIC ON" : "MUSIC OFF", 10, 20);
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

  // Keys only count when they aren't meant for a form field; Space/Up jump and M toggles the music.
  const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName));
  document.addEventListener("keydown", (event) => {
    if (typing(event.target)) return;
    if (event.code === "KeyM" && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) { toggleMusic(); return; }
    if (event.code !== "Space" && event.code !== "ArrowUp") return;
    event.preventDefault();
    if (!event.repeat) jump();
    held = true;
  });
  document.addEventListener("keyup", (event) => { if (event.code === "Space" || event.code === "ArrowUp") held = false; });
  canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); jump(); held = true; });
  window.addEventListener("pointerup", () => { held = false; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") { state = "paused"; stopMusic(); }
    last = null;
  });

  reset();
  requestAnimationFrame(loop);
}
