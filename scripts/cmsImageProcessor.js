/** In-browser processing for the CMS image browser: a wax pack photo or a Sportspicks figure becomes a 900 x 1200 WebP. */

const CMS_IMG_W = 900;
const CMS_IMG_H = 1200;
const CMS_IMG_MARGIN = 36;
const CMS_IMG_ANALYSIS_SIDE = 1200;
const CMS_IMG_MAX_BYTES = 250 * 1024;
const WAX_PACK_IMG_DIFF = 45;
const WAX_PACK_IMG_MIN_BACKDROP = 150; // an underexposed white backdrop reads about 175-215, so 200 left it grey
const SPORTSPICK_IMG_MIN_ALPHA = 16;

/************************************* Wax packs: photo on a white backdrop *************************************/

/** Resolves to { blob, fileName, contentType, width, height, warning }; rejects with a message fit to show the user. */
async function processWaxPackImage(file) {
  const bitmap = await decodeCmsImage(file);
  const found = findWaxPackBounds(bitmap);
  const { canvas, ctx } = drawCmsImageCentred(bitmap, found.crop, "#fff");

  whitenWaxPackBackdrop(ctx, found.backdrop);
  const blob = await encodeCmsWebp(canvas);
  return await cmsProcessedImage(blob, file.name, "pack", found.warning);
}

/** Finds the pack's bounding box (full-size pixels) by how far each pixel is from the backdrop colour at the photo's edge. */
function findWaxPackBounds(bitmap) {
  const { data, aw, ah, scale } = cmsImageAnalysis(bitmap);
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

  const box = cmsImageBounds(rows, cols, scale, "Couldn't find a pack in that photo. Shoot it on a plain white background.");
  const warnings = [];
  if (Math.min(...backdrop) < WAX_PACK_IMG_MIN_BACKDROP) warnings.push("the backdrop doesn't look white");
  if (box.w > aw * 0.97 && box.h > ah * 0.97) warnings.push("the pack fills the whole photo");

  return {
    backdrop,
    crop: box.crop,
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

/** Scales each channel so the backdrop becomes 255 (undoes a grey camera cast), then snaps near-white to pure white. */
function whitenWaxPackBackdrop(ctx, backdrop) {
  // A backdrop that isn't close to white (marble, say) is left alone: boosting it would tint the whole image.
  if (Math.min(...backdrop) < WAX_PACK_IMG_MIN_BACKDROP) return;

  const image = ctx.getImageData(0, 0, CMS_IMG_W, CMS_IMG_H);
  const px = image.data;
  const gain = backdrop.map((v) => 255 / v);

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

/************************************* Sportspicks: figure on a transparent background *************************************/

/** Same result shape as processWaxPackImage; the figure is found by its alpha and the transparency is kept. */
async function processSportspickImage(file) {
  const bitmap = await decodeCmsImage(file);
  const { data, aw, ah, scale } = cmsImageAnalysis(bitmap);
  const rows = new Uint32Array(ah);
  const cols = new Uint32Array(aw);
  let clear = 0;

  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const alpha = data[(y * aw + x) * 4 + 3];
      if (alpha < 128) clear++;
      if (alpha > SPORTSPICK_IMG_MIN_ALPHA) { rows[y]++; cols[x]++; }
    }
  }
  // Fewer than 1% see-through pixels means the background wasn't removed.
  if (clear < aw * ah * 0.01) throw new Error("This image has no transparent background. Export a PNG or WebP with the background removed.");

  const box = cmsImageBounds(rows, cols, scale, "Couldn't find a figure in that image.");
  const { canvas } = drawCmsImageCentred(bitmap, box.crop, null);
  const blob = await encodeCmsWebp(canvas);
  return await cmsProcessedImage(blob, file.name, "figure", "");
}

/************************************* Shared steps *************************************/

async function decodeCmsImage(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    console.log("CMS image decode error:", error);
    throw new Error("This browser can't read that image. For an iPhone HEIC photo, export a JPEG first.");
  }
}

/** The image drawn at most 1200px on its long side, with its pixels and the scale back to full size. */
function cmsImageAnalysis(bitmap) {
  const scale = Math.min(1, CMS_IMG_ANALYSIS_SIDE / Math.max(bitmap.width, bitmap.height));
  const aw = Math.max(1, Math.round(bitmap.width * scale));
  const ah = Math.max(1, Math.round(bitmap.height * scale));
  const analysis = document.createElement("canvas");
  analysis.width = aw;
  analysis.height = ah;
  const actx = analysis.getContext("2d", { willReadFrequently: true });
  actx.drawImage(bitmap, 0, 0, aw, ah);
  return { data: actx.getImageData(0, 0, aw, ah).data, aw, ah, scale };
}

/** The subject's box from per-row and per-column counts of subject pixels, padded 1%, as a full-size crop. */
function cmsImageBounds(rows, cols, scale, notFound) {
  const aw = cols.length;
  const ah = rows.length;
  const minCount = Math.max(3, Math.round(Math.min(aw, ah) * 0.006));
  const top = rows.findIndex((n) => n >= minCount);
  const left = cols.findIndex((n) => n >= minCount);
  const bottom = ah - 1 - [...rows].reverse().findIndex((n) => n >= minCount);
  const right = aw - 1 - [...cols].reverse().findIndex((n) => n >= minCount);
  if (top < 0 || left < 0) throw new Error(notFound);

  const pad = Math.round(0.01 * Math.max(right - left, bottom - top));
  const x0 = Math.max(0, left - pad);
  const y0 = Math.max(0, top - pad);
  const x1 = Math.min(aw, right + 1 + pad);
  const y1 = Math.min(ah, bottom + 1 + pad);

  return {
    w: x1 - x0,
    h: y1 - y0,
    crop: { x: Math.round(x0 / scale), y: Math.round(y0 / scale), w: Math.round((x1 - x0) / scale), h: Math.round((y1 - y0) / scale) }
  };
}

/** A 900 x 1200 canvas with the crop scaled to fit inside the margin and centred; fill is a colour, or null to stay transparent. */
function drawCmsImageCentred(bitmap, crop, fill) {
  const inner = { w: CMS_IMG_W - 2 * CMS_IMG_MARGIN, h: CMS_IMG_H - 2 * CMS_IMG_MARGIN };
  const scale = Math.min(inner.w / crop.w, inner.h / crop.h);
  const dw = Math.round(crop.w * scale);
  const dh = Math.round(crop.h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = CMS_IMG_W;
  canvas.height = CMS_IMG_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(halveCmsImage(bitmap, crop, dw, dh), Math.round((CMS_IMG_W - dw) / 2), Math.round((CMS_IMG_H - dh) / 2), dw, dh);
  return { canvas, ctx };
}

/** Copies the crop of the source into a canvas of dw x dh, halving at most 2x per step so a large photo stays sharp. */
function halveCmsImage(source, crop, dw, dh) {
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

/** WebP at quality 0.82, stepping down until it is under the size limit; rejects if the browser can't write WebP. */
async function encodeCmsWebp(canvas) {
  let blob = null;
  for (const quality of [0.82, 0.7, 0.6]) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") {
      throw new Error("This browser can't save WebP images. Use Chrome, Edge or Firefox.");
    }
    if (blob.size <= CMS_IMG_MAX_BYTES) break;
  }
  return blob;
}

/** The result the image browser expects; fallback names the file when the original name has no letters or numbers. */
async function cmsProcessedImage(blob, originalName, fallback, warning) {
  return {
    blob,
    fileName: cmsImageName(originalName, await cmsImageContentCode(blob), fallback),
    contentType: "image/webp",
    width: CMS_IMG_W,
    height: CMS_IMG_H,
    warning
  };
}

/** Six hex characters from the image's own bytes, so a different picture never reuses a (year-cached) file name. */
async function cmsImageContentCode(blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest).slice(0, 3)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** IMG_1234.JPG + a1b2c3 -> img-1234-a1b2c3.webp */
function cmsImageName(originalName, code, fallback) {
  const base = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || fallback}-${code}.webp`;
}
