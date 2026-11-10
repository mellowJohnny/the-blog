/** Wax Pack Museum CMS: newWaxPack.html (add), pickWaxPack.html (list as links) and waxPackEdit.html (update/delete). */

const WAX_PACK_SAVE_URL = "https://b3qn1kny99.execute-api.us-east-2.amazonaws.com/prod"; // saveWaxPack API
const WAX_PACK_DELETE_URL = "https://y4hs1e712l.execute-api.us-east-2.amazonaws.com/prod"; // deleteWaxPack API
const WAX_PACK_GET_URL = "https://efh9lu4988.execute-api.us-east-2.amazonaws.com/prod"; // getWaxPacks API

const WAX_PACK_REVIEWS_URL = "https://jlpd8ec14j.execute-api.us-east-2.amazonaws.com/prod"; // getPublicCardSets API
const WAX_PACK_IMAGE_DIR = "img/wax-packs/";
const WAX_PACK_IMAGE_BASE = `https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/${WAX_PACK_IMAGE_DIR}`;
const WAX_PACK_PICKER_URL = "/cms/pickWaxPack.html";
const WAX_PACK_HOME_URL = "/cms/wlcms.html";
const WAX_PACK_TYPE_LABELS = { "main": "Main", "fast food": "Fast Food" };

// The form's fixed dropdown lists, as [value, label]. Manufacturer and packaging keep the owner's chosen order; type is A to Z.
const WAX_PACK_MANUFACTURERS = ["O-Pee-Chee", "Topps", "Upper Deck", "Pinnacle", "Score", "Pro Set", "Fleer", "Leaf", "Pacific"].map((name) => [name, name]);
const WAX_PACK_PACKAGING = ["Wax Pack", "Flow Pack", "Jumbo Flow Pack", "Foil Pack", "Cello Pack", "Blister Pack"].map((name) => [name, name]);
const WAX_PACK_TYPES = [["main", "Main"], ["fast food", "Fast Food"]];

let _waxPacks = [];
let _waxReviews = [];
let _waxPackBeingEdited = null;

function waxPackField(id) {
  return document.getElementById(id);
}

/************************************* Page entry points *************************************/

async function initNewWaxPackPage() {
  renderWaxPackForm("create");
  _waxReviews = await loadWaxReviews();
  fillWaxPackDropdowns();
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
  const [packs, reviews] = await Promise.all([loadWaxPacks(), loadWaxReviews()]);
  _waxPacks = packs || [];
  _waxReviews = reviews;
  fillWaxPackDropdowns();

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

/** Live reviews for the "Related Review" dropdown; an empty list (form still works) if the request fails. */
async function loadWaxReviews() {
  try {
    const response = await fetch(WAX_PACK_REVIEWS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const sets = await response.json();
    return sets
      .filter((set) => set.seoURLSlug)
      .sort((a, b) => a.setName.localeCompare(b.setName) || a.year - b.year);
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
  label.textContent = pack.name;
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
            <label>Season <sup>*</sup></label> <small>e.g. 1989 for the 1989-90 season</small><br>
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
          </td>
          <td>
            <label>Packaging <sup>*</sup></label><br>
            <select id="wpPackaging" style="width: 200px;"></select>
          </td>
        </tr>
        <tr>
          <td>
            <label>Type <sup>*</sup></label><br>
            <select id="wpType" style="width: 200px;"></select>
          </td>
        </tr>
        <tr>
          <td>
            <label>Cards per Pack <sup>*</sup></label><br>
            <input type="number" id="wpNumCards" min="1" max="200" required>
          </td>
          <td>
            <label>Price</label><br>
            <input type="text" id="wpPrice" maxlength="20" style="width: 200px;">
          </td>
        </tr>
        <tr>
          <td>${waxPackImageBlock("Front")}</td>
          <td>${waxPackImageBlock("Back")}</td>
        </tr>
        <tr>
          <td>
            <label>Notes - Pack Front</label><br>
            <textarea id="wpNotesFront" class="seo-textarea" rows="2"></textarea>
          </td>
          <td>
            <label>Notes - Pack Reverse</label><br>
            <textarea id="wpNotesBack" class="seo-textarea" rows="2"></textarea>
          </td>
        </tr>
        <tr>
          <td colspan="2" align="left">${buttons}</td>
        </tr>
      </table>
    </form>`;
}

/** Fills every dropdown: the fixed lists, and the live reviews (alphabetical, "None" first). */
function fillWaxPackDropdowns() {
  fillWaxPackSelect("wpManufacturer", WAX_PACK_MANUFACTURERS, "Choose...");
  fillWaxPackSelect("wpPackaging", WAX_PACK_PACKAGING, "Choose...");
  fillWaxPackSelect("wpType", WAX_PACK_TYPES, "Choose...");
  fillWaxPackSelect("wpReviewSlug", _waxReviews.map((set) => [set.seoURLSlug, set.setName]), "None");
}

function fillWaxPackSelect(selectId, options, placeholder) {
  const select = waxPackField(selectId);
  select.innerHTML = "";
  select.add(new Option(placeholder, ""));
  options.forEach(([value, label]) => select.add(new Option(label, value)));
}

/** Selects a saved value; one that is no longer in the list (older data) is kept as an extra option so saving doesn't drop it. */
function setWaxPackSelect(selectId, value) {
  const select = waxPackField(selectId);
  if (value && ![...select.options].some((option) => option.value === value)) {
    select.add(new Option(value, value));
  }
  select.value = value;
}

/** Fills the edit form from a saved pack; only the year (the table's partition key) is locked. */
function populateWaxPackForm(pack) {
  _waxPackBeingEdited = pack;

  waxPackField("wpYear").value = pack.year;
  waxPackField("wpName").value = pack.name;
  setWaxPackSelect("wpReviewSlug", pack.reviewSlug || "");
  setWaxPackSelect("wpManufacturer", pack.manufacturer);
  setWaxPackSelect("wpPackaging", pack.packaging);
  setWaxPackSelect("wpType", pack.type || "");
  waxPackField("wpNumCards").value = pack.numCards;
  waxPackField("wpPrice").value = pack.price || "";
  waxPackField("wpFrontImg").value = pack.frontImg || "";
  waxPackField("wpBackImg").value = pack.backImg || "";
  // Packs saved before the notes were split have only "notes", which counts as the front note.
  waxPackField("wpNotesFront").value = pack.notesFront || pack.notes || "";
  waxPackField("wpNotesBack").value = pack.notesBack || "";

  waxPackField("wpYear").disabled = true;
  showWaxPackImage("Front");
  showWaxPackImage("Back");
}

/************************************* Front and back images *************************************/

/** The form block for one side ("Front" or "Back"): file name, Browse button and preview. */
function waxPackImageBlock(side) {
  return `
    <label>${side} Image</label><br>
    <input type="text" id="wp${side}Img" readonly><br>
    <button class="input-button" type="button" onclick="browseWaxPackImage('${side}')">Browse</button><br>
    <img id="wp${side}Preview" alt="${side} of the pack" style="display: none; max-width: 160px;">`;
}

/** Opens the shared image browser (cmsImageBrowser.js) on the wax pack folder and fills that side with the pick. */
function browseWaxPackImage(side) {
  openImageBrowser(`wp${side}Img`, (fileName) => {
    waxPackField(`wp${side}Img`).value = fileName;
    showWaxPackImage(side);
  }, WAX_PACK_IMAGE_DIR, processWaxPackImage);
}

function showWaxPackImage(side) {
  const name = waxPackField(`wp${side}Img`).value;
  const img = waxPackField(`wp${side}Preview`);
  img.style.display = name ? "" : "none";
  img.src = name ? WAX_PACK_IMAGE_BASE + encodeURIComponent(name) : "";
}

/************************************* Save and delete *************************************/

/** Creates a pack (new page) or updates the loaded one (edit page); both return to the picker. */
async function submitWaxPack() {
  const payload = {
    year: parseInt(waxPackField("wpYear").value, 10),
    name: waxPackField("wpName").value.trim(),
    reviewSlug: waxPackField("wpReviewSlug").value,
    manufacturer: waxPackField("wpManufacturer").value,
    packaging: waxPackField("wpPackaging").value,
    type: waxPackField("wpType").value,
    numCards: parseInt(waxPackField("wpNumCards").value, 10),
    price: waxPackField("wpPrice").value.trim(),
    frontImg: waxPackField("wpFrontImg").value.trim(),
    backImg: waxPackField("wpBackImg").value.trim(),
    notesFront: waxPackField("wpNotesFront").value.trim(),
    notesBack: waxPackField("wpNotesBack").value.trim()
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
    window.location.href = _waxPackBeingEdited ? WAX_PACK_PICKER_URL : WAX_PACK_HOME_URL;
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
