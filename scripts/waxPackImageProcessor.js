/** Turns a raw wax pack photo (pack on a white backdrop) into a 900 x 1200 white-background WebP, in the browser. */

const WAX_PACK_IMG_W = 900;
const WAX_PACK_IMG_H = 1200;
const WAX_PACK_IMG_MARGIN = 36;
const WAX_PACK_IMG_ANALYSIS_SIDE = 1200;
const WAX_PACK_IMG_DIFF = 45;
const WAX_PACK_IMG_MAX_BYTES = 250 * 1024;

/** Resolves to { blob, fileName, contentType, width, height, warning }; rejects with a message fit to show the user. */
async function processWaxPackImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    console.log("Wax pack image decode error:", error);
    throw new Error("This browser can't read that image. For an iPhone HEIC photo, export a JPEG first.");
  }

  const found = findWaxPackBounds(bitmap);
  const crop = found.crop;
  const inner = { w: WAX_PACK_IMG_W - 2 * WAX_PACK_IMG_MARGIN, h: WAX_PACK_IMG_H - 2 * WAX_PACK_IMG_MARGIN };
  const scale = Math.min(inner.w / crop.w, inner.h / crop.h);
  const dw = Math.round(crop.w * scale);
  const dh = Math.round(crop.h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = WAX_PACK_IMG_W;
  canvas.height = WAX_PACK_IMG_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(waxPackHalved(bitmap, crop, dw, dh), Math.round((WAX_PACK_IMG_W - dw) / 2), Math.round((WAX_PACK_IMG_H - dh) / 2), dw, dh);

  whitenWaxPackBackdrop(ctx, found.backdrop);
  const blob = await encodeWaxPackWebp(canvas);

  return {
    blob,
    fileName: waxPackImageName(file.name),
    contentType: "image/webp",
    width: WAX_PACK_IMG_W,
    height: WAX_PACK_IMG_H,
    warning: found.warning
  };
}

/** Finds the pack's bounding box (full-size pixels) by how far each pixel is from the backdrop colour at the photo's edge. */
function findWaxPackBounds(bitmap) {
  const scale = Math.min(1, WAX_PACK_IMG_ANALYSIS_SIDE / Math.max(bitmap.width, bitmap.height));
  const aw = Math.max(1, Math.round(bitmap.width * scale));
  const ah = Math.max(1, Math.round(bitmap.height * scale));
  const analysis = document.createElement("canvas");
  analysis.width = aw;
  analysis.height = ah;
  const actx = analysis.getContext("2d", { willReadFrequently: true });
  actx.drawImage(bitmap, 0, 0, aw, ah);
  const data = actx.getImageData(0, 0, aw, ah).data;

  const backdrop = waxPackBackdropColour(data, aw, ah);
  const limit = WAX_PACK_IMG_DIFF * WAX_PACK_IMG_DIFF;
  const rows = new Uint32Array(ah);
  const cols = new Uint32Array(aw);

  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const i = (y * aw + x) * 4;
      const dr = data[i] - backdrop[0];
      const dg = data[i + 1] - backdrop[1];
      const db = data[i + 2] - backdrop[2];
      if (dr * dr + dg * dg + db * db > limit) { rows[y]++; cols[x]++; }
    }
  }

  const minCount = Math.max(3, Math.round(Math.min(aw, ah) * 0.006));
  const top = rows.findIndex((n) => n >= minCount);
  const left = cols.findIndex((n) => n >= minCount);
  const bottom = ah - 1 - [...rows].reverse().findIndex((n) => n >= minCount);
  const right = aw - 1 - [...cols].reverse().findIndex((n) => n >= minCount);
  if (top < 0 || left < 0) throw new Error("Couldn't find a pack in that photo. Shoot it on a plain white background.");

  const pad = Math.round(0.01 * Math.max(right - left, bottom - top));
  const x0 = Math.max(0, left - pad);
  const y0 = Math.max(0, top - pad);
  const x1 = Math.min(aw, right + 1 + pad);
  const y1 = Math.min(ah, bottom + 1 + pad);

  const warnings = [];
  if (Math.min(...backdrop) < 200) warnings.push("the backdrop doesn't look white");
  if ((x1 - x0) > aw * 0.97 && (y1 - y0) > ah * 0.97) warnings.push("the pack fills the whole photo");

  return {
    backdrop,
    crop: { x: Math.round(x0 / scale), y: Math.round(y0 / scale), w: Math.round((x1 - x0) / scale), h: Math.round((y1 - y0) / scale) },
    warning: warnings.length ? `Check the photo: ${warnings.join(" and ")}.` : ""
  };
}

/** Median colour of the outer 2% band of the photo. */
function waxPackBackdropColour(data, aw, ah) {
  const band = Math.max(2, Math.round(Math.min(aw, ah) * 0.02));
  const samples = [[], [], []];
  for (let y = 0; y < ah; y += 2) {
    for (let x = 0; x < aw; x += 2) {
      if (x >= band && x < aw - band && y >= band && y < ah - band) continue;
      const i = (y * aw + x) * 4;
      samples[0].push(data[i]);
      samples[1].push(data[i + 1]);
      samples[2].push(data[i + 2]);
    }
  }
  return samples.map((list) => list.sort((a, b) => a - b)[list.length >> 1]);
}

/** Copies the crop of the source into a canvas of dw x dh, halving at most 2x per step so a large photo stays sharp. */
function waxPackHalved(source, crop, dw, dh) {
  let current = document.createElement("canvas");
  current.width = crop.w;
  current.height = crop.h;
  const first = current.getContext("2d");
  first.imageSmoothingQuality = "high";
  first.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

  while (current.width / 2 >= dw && current.height / 2 >= dh) {
    const next = document.createElement("canvas");
    next.width = Math.max(dw, Math.floor(current.width / 2));
    next.height = Math.max(dh, Math.floor(current.height / 2));
    const nctx = next.getContext("2d");
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(current, 0, 0, next.width, next.height);
    current = next;
  }
  return current;
}

/** Scales each channel so the backdrop becomes 255 (undoes a grey camera cast), then snaps near-white to pure white. */
function whitenWaxPackBackdrop(ctx, backdrop) {
  const image = ctx.getImageData(0, 0, WAX_PACK_IMG_W, WAX_PACK_IMG_H);
  const px = image.data;
  const gain = backdrop.map((v) => (v >= 150 ? 255 / v : 1));

  for (let i = 0; i < px.length; i += 4) {
    const r = Math.min(255, px[i] * gain[0]);
    const g = Math.min(255, px[i + 1] * gain[1]);
    const b = Math.min(255, px[i + 2] * gain[2]);
    const white = r > 242 && g > 242 && b > 242;
    px[i] = white ? 255 : r;
    px[i + 1] = white ? 255 : g;
    px[i + 2] = white ? 255 : b;
  }
  ctx.putImageData(image, 0, 0);
}

/** WebP at quality 0.82, stepping down until it is under the size limit; rejects if the browser can't write WebP. */
async function encodeWaxPackWebp(canvas) {
  let blob = null;
  for (const quality of [0.82, 0.7, 0.6]) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") {
      throw new Error("This browser can't save WebP images. Use Chrome, Edge or Firefox.");
    }
    if (blob.size <= WAX_PACK_IMG_MAX_BYTES) break;
  }
  return blob;
}

/** IMG_1234.JPG -> img-1234.webp */
function waxPackImageName(originalName) {
  const base = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "pack"}.webp`;
}
