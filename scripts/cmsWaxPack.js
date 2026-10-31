/** Wax Pack Museum CMS: newWaxPack.html (add), pickWaxPack.html (list as links) and waxPackEdit.html (update/delete). */

const WAX_PACK_SAVE_URL = "https://b3qn1kny99.execute-api.us-east-2.amazonaws.com/prod"; // saveWaxPack API
const WAX_PACK_DELETE_URL = "https://y4hs1e712l.execute-api.us-east-2.amazonaws.com/prod"; // deleteWaxPack API
const WAX_PACK_GET_URL = "https://efh9lu4988.execute-api.us-east-2.amazonaws.com/prod"; // getWaxPacks API

const WAX_PACK_REVIEWS_URL = "https://jlpd8ec14j.execute-api.us-east-2.amazonaws.com/prod"; // getPublicCardSets API
const WAX_PACK_IMAGE_UPLOAD_URL = "https://k95rdenpn5.execute-api.us-east-2.amazonaws.com/dev"; // cmsImageUploader API
const WAX_PACK_IMAGE_DIR = "img/wax-packs/";
const WAX_PACK_IMAGE_BASE = `https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/${WAX_PACK_IMAGE_DIR}`;
const WAX_PACK_NEW_VALUE = "__new__";
const WAX_PACK_PICKER_URL = "/cms/pickWaxPack.html";
const WAX_PACK_TYPE_LABELS = { "main": "Main", "fast food": "Fast Food" };

// The same manufacturers createCardSet.html offers, so the dropdown is never empty.
const WAX_PACK_MANUFACTURERS = ["O-Pee-Chee", "Topps", "Upper Deck", "Score", "Pro Set", "Fleer", "Leaf", "Pinnacle", "Pacific", "Ultimate"];
const WAX_PACK_PACKAGING = ["Wax", "Rack", "Cello", "Blister"];

let _waxPacks = [];
let _waxReviews = [];
let _waxPackBeingEdited = null;

function waxPackField(id) {
  return document.getElementById(id);
}

/************************************* Page entry points *************************************/

async function initNewWaxPackPage() {
  renderWaxPackForm("create");
  await loadWaxPackFormData();
}

async function initPickWaxPackPage() {
  const packs = await loadWaxPacks();
  if (!packs) return;
  if (!packs.length) {
    waxPackField("noWaxPacksDiv").textContent = "...no wax packs yet";
    return;
  }

  const container = waxPackField("waxPackLinksDiv");
  Object.keys(WAX_PACK_TYPE_LABELS).forEach((type) => {
    const group = packs
      .filter((pack) => (pack.type || "main") === type)
      .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
    if (!group.length) return;

    const header = document.createElement("h2");
    header.className = "blog-type-divider";
    header.textContent = WAX_PACK_TYPE_LABELS[type];
    container.appendChild(header);
    group.forEach((pack) => container.appendChild(waxPackLink(pack)));
  });
}

async function initEditWaxPackPage() {
  renderWaxPackForm("edit");
  await loadWaxPackFormData();

  const params = new URLSearchParams(document.location.search);
  const year = Number(params.get("year"));
  const packKey = params.get("packKey");
  const pack = _waxPacks.find((item) => item.year === year && item.packKey === packKey);

  if (!pack) {
    waxPackField("errorDiv").textContent = "these aren't the Droids you're looking for...";
    return;
  }
  populateWaxPackForm(pack);
}

/************************************* Loading and listing *************************************/

/** Every pack, or null (after an alert) if the request fails. no-store: the public endpoint is browser-cached for 30 minutes. */
async function loadWaxPacks() {
  try {
    const response = await fetch(WAX_PACK_GET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.log("Wax pack load error:", error);
    await cmsAlert("Could not load the wax packs.");
    return null;
  }
}

/** Loads the packs and the live reviews together, then fills the form's dropdowns from them. */
async function loadWaxPackFormData() {
  const [packs, reviews] = await Promise.all([loadWaxPacks(), loadWaxReviews()]);
  _waxPacks = packs || [];
  _waxReviews = reviews;
  fillWaxPackDropdowns();
}

/** Live reviews for the "Related Review" dropdown; an empty list (form still works) if the request fails. */
async function loadWaxReviews() {
  try {
    const response = await fetch(WAX_PACK_REVIEWS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const sets = await response.json();
    return sets
      .filter((set) => set.seoURLSlug)
      .sort((a, b) => a.year - b.year || a.setName.localeCompare(b.setName));
  } catch (error) {
    console.log("Wax pack review list error:", error);
    return [];
  }
}

/** One picker entry, built like displayCardSets(): a table holding a link to the edit page. */
function waxPackLink(pack) {
  const table = document.createElement("table");
  table.className = "set-details-table-style";
  const cell = table.insertRow().insertCell();
  cell.style.cssText = "width:400px;font-size:20px";

  const link = document.createElement("a");
  link.href = `waxPackEdit.html?year=${pack.year}&packKey=${encodeURIComponent(pack.packKey)}`;
  const label = document.createElement("strong");
  label.textContent = `${pack.name} (${pack.year})`;
  link.appendChild(label);
  cell.appendChild(link);
  return table;
}

/************************************* The form (built once, used by new and edit) *************************************/

function renderWaxPackForm(mode) {
  const buttons = mode === "edit"
    ? `<div style="display:grid; grid-template-columns: 1fr auto; align-items:center;">
         <div style="justify-self:start;">
           <button class="input-button" type="button" onclick="submitWaxPack()">Update Pack</button>&nbsp;&nbsp;&nbsp;&nbsp;
           <button class="input-button btn-secondary" type="button" onclick="cmsCancelEdit('${WAX_PACK_PICKER_URL}')">Cancel</button>
         </div>
         <button class="input-button delete-btn" type="button" style="justify-self:end;" onclick="deleteWaxPack()">Delete Pack</button>
       </div>`
    : `<button class="input-button" type="button" onclick="submitWaxPack()">Save Pack</button>`;

  waxPackField("waxPackFormHost").innerHTML = `
    <form id="waxPackForm">
      <table class="cms-form-table">
        <tr>
          <td colspan="2">
            <label>Year <sup>*</sup></label><br>
            <input type="number" id="wpYear" min="1900" max="2100" required>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <label>Pack Name <sup>*</sup></label><br>
            <input type="text" id="wpName" required>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <label>Related Review</label><br>
            <select id="wpReviewSlug" style="width: 450px;"></select>
          </td>
        </tr>
        <tr>
          <td>
            <label>Manufacturer <sup>*</sup></label><br>
            <select id="wpManufacturer" style="width: 200px;"></select>
            <input type="text" id="wpManufacturerNew" style="display: none;">
          </td>
          <td>
            <label>Packaging <sup>*</sup></label><br>
            <select id="wpPackaging" style="width: 200px;"></select>
            <input type="text" id="wpPackagingNew" style="display: none;">
          </td>
        </tr>
        <tr>
          <td>
            <label>Type <sup>*</sup></label><br>
            <select id="wpType" style="width: 200px;">
              <option value="main">Main</option>
              <option value="fast food">Fast Food</option>
            </select>
          </td>
          <td>
            <label>Format <sup>*</sup></label><br>
            <select id="wpFormat" style="width: 200px;">
              <option value="regular">Regular</option>
              <option value="jumbo">Jumbo</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>
            <label>Cards per Pack <sup>*</sup></label><br>
            <input type="number" id="wpNumCards" min="1" max="200" required>
          </td>
          <td>
            <label>Price <sup>*</sup></label><br>
            <input type="number" id="wpPrice" min="0" max="1000" step="0.01" required>
          </td>
        </tr>
        <tr>
          <td>${waxPackImageBlock("Front")}</td>
          <td>${waxPackImageBlock("Back")}</td>
        </tr>
        <tr>
          <td colspan="2">
            <label>Notes</label><br>
            <textarea id="wpNotes" class="seo-textarea" rows="2"></textarea>
          </td>
        </tr>
        <tr>
          <td colspan="2" align="left">${buttons}</td>
        </tr>
      </table>
    </form>`;

  ["wpManufacturer", "wpPackaging"].forEach((id) => {
    waxPackField(id).addEventListener("change", () => toggleWaxPackNewValue(id));
  });
  ["Front", "Back"].forEach((side) => {
    waxPackField(`wp${side}File`).addEventListener("change", () => uploadWaxPackImage(side));
  });
}

/** Seed values plus every value already saved (case-insensitive), then "Add new...". */
function fillWaxPackDropdowns() {
  fillWaxPackDropdown("wpManufacturer", WAX_PACK_MANUFACTURERS, "manufacturer");
  fillWaxPackDropdown("wpPackaging", WAX_PACK_PACKAGING, "packaging");

  const reviews = waxPackField("wpReviewSlug");
  reviews.innerHTML = "";
  reviews.add(new Option("None", ""));
  _waxReviews.forEach((set) => reviews.add(new Option(`${set.setName} (${set.year})`, set.seoURLSlug)));
}

function fillWaxPackDropdown(selectId, seeds, field) {
  const select = waxPackField(selectId);
  const seen = new Map();

  [...seeds, ..._waxPacks.map((pack) => pack[field])].forEach((value) => {
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  });

  select.innerHTML = "";
  select.add(new Option("Choose...", ""));
  [...seen.values()].sort((a, b) => a.localeCompare(b)).forEach((value) => select.add(new Option(value, value)));
  select.add(new Option("Add new...", WAX_PACK_NEW_VALUE));
  toggleWaxPackNewValue(selectId);
}

function toggleWaxPackNewValue(selectId) {
  const isNew = waxPackField(selectId).value === WAX_PACK_NEW_VALUE;
  waxPackField(`${selectId}New`).style.display = isNew ? "" : "none";
}

/** The chosen dropdown value, or the typed one when "Add new..." is selected. */
function waxPackDropdownValue(selectId) {
  const select = waxPackField(selectId);
  return select.value === WAX_PACK_NEW_VALUE ? waxPackField(`${selectId}New`).value.trim() : select.value;
}

function setWaxPackDropdown(selectId, value) {
  const select = waxPackField(selectId);
  const match = [...select.options].find((option) => option.value.toLowerCase() === value.toLowerCase());
  select.value = match ? match.value : WAX_PACK_NEW_VALUE;
  waxPackField(`${selectId}New`).value = match ? "" : value;
  toggleWaxPackNewValue(selectId);
}

/** Fills the edit form from a saved pack; only the year (the table's partition key) is locked. */
function populateWaxPackForm(pack) {
  _waxPackBeingEdited = pack;

  waxPackField("wpYear").value = pack.year;
  waxPackField("wpName").value = pack.name;
  setWaxPackReview(pack.reviewSlug || "");
  setWaxPackDropdown("wpManufacturer", pack.manufacturer);
  setWaxPackDropdown("wpPackaging", pack.packaging);
  waxPackField("wpType").value = pack.type || "main";
  waxPackField("wpFormat").value = pack.format;
  waxPackField("wpNumCards").value = pack.numCards;
  waxPackField("wpPrice").value = pack.price;
  waxPackField("wpFrontImg").value = pack.frontImg || "";
  waxPackField("wpBackImg").value = pack.backImg || "";
  waxPackField("wpNotes").value = pack.notes || "";

  waxPackField("wpYear").disabled = true;
  showWaxPackImage("Front");
  showWaxPackImage("Back");
}

/** Selects the pack's review; one that is no longer a live review is kept as an extra option so saving doesn't drop it. */
function setWaxPackReview(slug) {
  const select = waxPackField("wpReviewSlug");
  if (slug && ![...select.options].some((option) => option.value === slug)) {
    select.add(new Option(`${slug} (not a live review)`, slug));
  }
  select.value = slug;
}

/************************************* Front and back images *************************************/

/** The form block for one side ("Front" or "Back"): file name, chooser, status and preview. */
function waxPackImageBlock(side) {
  return `
    <label>${side} Image</label><br>
    <input type="text" id="wp${side}Img" readonly><br>
    <input type="file" id="wp${side}File" accept="image/*">
    <span id="wp${side}Status"></span><br>
    <img id="wp${side}Preview" alt="${side} of the pack" style="display: none; max-width: 160px;">`;
}

function showWaxPackImage(side) {
  const name = waxPackField(`wp${side}Img`).value;
  const img = waxPackField(`wp${side}Preview`);
  img.style.display = name ? "" : "none";
  img.src = name ? WAX_PACK_IMAGE_BASE + encodeURIComponent(name) : "";
}

/** Gets a presigned URL from cmsImageUploader, PUTs the file to S3 under img/wax-packs/, then fills that side's field. */
async function uploadWaxPackImage(side) {
  const file = waxPackField(`wp${side}File`).files[0];
  const status = waxPackField(`wp${side}Status`);
  if (!file) return;

  const fileName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  status.textContent = "Uploading...";

  try {
    const response = await fetch(WAX_PACK_IMAGE_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, directory: WAX_PACK_IMAGE_DIR, contentType: file.type })
    });
    const data = await response.json();
    if (!data.uploadUrl) throw new Error("No upload URL returned");

    const upload = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!upload.ok) throw new Error(`S3 returned ${upload.status}`);

    waxPackField(`wp${side}Img`).value = fileName;
    status.textContent = "Uploaded.";
    showWaxPackImage(side);
  } catch (error) {
    console.log("Wax pack image upload error:", error);
    status.textContent = "Upload failed.";
  }
}

/************************************* Save and delete *************************************/

/** Creates a pack (new page) or updates the loaded one (edit page); both return to the picker. */
async function submitWaxPack() {
  const payload = {
    year: parseInt(waxPackField("wpYear").value, 10),
    name: waxPackField("wpName").value.trim(),
    reviewSlug: waxPackField("wpReviewSlug").value,
    manufacturer: waxPackDropdownValue("wpManufacturer"),
    packaging: waxPackDropdownValue("wpPackaging"),
    type: waxPackField("wpType").value,
    format: waxPackField("wpFormat").value,
    numCards: parseInt(waxPackField("wpNumCards").value, 10),
    price: parseFloat(waxPackField("wpPrice").value),
    frontImg: waxPackField("wpFrontImg").value.trim(),
    backImg: waxPackField("wpBackImg").value.trim(),
    notes: waxPackField("wpNotes").value.trim()
  };
  if (_waxPackBeingEdited) payload.packKey = _waxPackBeingEdited.packKey;

  try {
    const token = await getAuthToken();
    const response = await fetch(WAX_PACK_SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      await cmsAlert(data.error || "An unknown error occurred.");
      return;
    }
    await cmsAlert(_waxPackBeingEdited ? "Wax pack updated." : "Wax pack saved.");
    window.location.href = WAX_PACK_PICKER_URL;
  } catch (error) {
    console.log("Wax pack save error:", error);
    await cmsAlert("Network error saving the wax pack.");
  }
}

async function deleteWaxPack() {
  if (!_waxPackBeingEdited) return;
  if (!await cmsConfirm("Delete this wax pack? This cannot be undone.")) return;

  try {
    const token = await getAuthToken();
    const response = await fetch(WAX_PACK_DELETE_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify({ year: _waxPackBeingEdited.year, packKey: _waxPackBeingEdited.packKey })
    });
    const data = await response.json();

    if (!response.ok) {
      await cmsAlert(data.error || "An unknown error occurred.");
      return;
    }
    await cmsAlert(data.message || "Wax pack deleted.");
    window.location.href = WAX_PACK_PICKER_URL;
  } catch (error) {
    console.log("Wax pack delete error:", error);
    await cmsAlert("Network error deleting the wax pack.");
  }
}
