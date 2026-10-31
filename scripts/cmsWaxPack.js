/** Wax Pack Museum CMS (cms/waxPacks.html): list, add, edit and delete packs in the WaxPacks table. */

const WAX_PACK_SAVE_URL = "https://b3qn1kny99.execute-api.us-east-2.amazonaws.com/prod"; // saveWaxPack API
const WAX_PACK_DELETE_URL = "https://y4hs1e712l.execute-api.us-east-2.amazonaws.com/prod"; // deleteWaxPack API
const WAX_PACK_GET_URL = "https://efh9lu4988.execute-api.us-east-2.amazonaws.com/prod"; // getWaxPacks API

const WAX_PACK_IMAGE_UPLOAD_URL = "https://k95rdenpn5.execute-api.us-east-2.amazonaws.com/dev"; // cmsImageUploader API
const WAX_PACK_IMAGE_BASE = "https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/img/museum/";
const WAX_PACK_NEW_VALUE = "__new__";

// The same manufacturers createCardSet.html offers, so the dropdown is never empty.
const WAX_PACK_MANUFACTURERS = ["O-Pee-Chee", "Topps", "Upper Deck", "Score", "Pro Set", "Fleer", "Leaf", "Pinnacle", "Pacific", "Ultimate"];
const WAX_PACK_PACKAGING = ["Wax", "Rack", "Cello", "Blister"];

let _waxPacks = [];
let _waxPackEditing = false;

function waxPackField(id) {
  return document.getElementById(id);
}

/** Entry point: loads the packs, fills the dropdowns and wires the form. */
function initWaxPacksPage() {
  ["wpManufacturer", "wpPackaging"].forEach((id) => {
    waxPackField(id).addEventListener("change", () => toggleWaxPackNewValue(id));
  });
  waxPackField("wpImageFile").addEventListener("change", uploadWaxPackImage);
  loadWaxPacks();
}

async function loadWaxPacks() {
  try {
    // no-store: the public endpoint is browser-cached for 30 minutes, which would hide a save.
    const response = await fetch(WAX_PACK_GET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    _waxPacks = await response.json();
  } catch (error) {
    console.log("Wax pack load error:", error);
    _waxPacks = [];
    await cmsAlert("Could not load the wax packs.");
  }
  renderWaxPackList();
  fillWaxPackDropdown("wpManufacturer", WAX_PACK_MANUFACTURERS, "manufacturer");
  fillWaxPackDropdown("wpPackaging", WAX_PACK_PACKAGING, "packaging");
}

/** Seed values plus every value already saved (case-insensitive), then "Add new...". */
function fillWaxPackDropdown(selectId, seeds, field) {
  const select = waxPackField(selectId);
  const keep = select.value;
  const seen = new Map();

  [...seeds, ..._waxPacks.map((pack) => pack[field])].forEach((value) => {
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  });

  select.innerHTML = "";
  select.add(new Option("Choose...", ""));
  [...seen.values()].sort((a, b) => a.localeCompare(b)).forEach((value) => select.add(new Option(value, value)));
  select.add(new Option("Add new...", WAX_PACK_NEW_VALUE));
  if (keep && [...select.options].some((option) => option.value === keep)) select.value = keep;
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

function renderWaxPackList() {
  const body = waxPackField("waxPackRows");
  body.innerHTML = "";
  waxPackField("waxPackEmpty").style.display = _waxPacks.length ? "none" : "";

  _waxPacks.forEach((pack, index) => {
    const row = body.insertRow();
    [pack.year, pack.setName, pack.manufacturer, pack.packaging, pack.type, pack.format, pack.numCards, `${pack.price.toFixed(2)} ${pack.currency}`]
      .forEach((value) => { row.insertCell().textContent = value; });

    const actions = row.insertCell();
    actions.append(
      waxPackButton("Edit", () => editWaxPack(index)),
      " ",
      waxPackButton("Delete", () => deleteWaxPack(pack))
    );
  });
}

function waxPackButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "input-button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

/** Fills the form from a saved pack; the four fields that make up its key are locked. */
function editWaxPack(index) {
  const pack = _waxPacks[index];
  _waxPackEditing = true;

  waxPackField("wpYear").value = pack.year;
  waxPackField("wpSetName").value = pack.setName;
  waxPackField("wpSetSlug").value = pack.setSlug;
  setWaxPackDropdown("wpManufacturer", pack.manufacturer);
  setWaxPackDropdown("wpPackaging", pack.packaging);
  waxPackField("wpType").value = pack.type || "main";
  waxPackField("wpFormat").value = pack.format;
  waxPackField("wpNumCards").value = pack.numCards;
  waxPackField("wpPrice").value = pack.price;
  waxPackField("wpCurrency").value = pack.currency;
  waxPackField("wpImgName").value = pack.imgName || "";
  waxPackField("wpNotes").value = pack.notes || "";

  ["wpYear", "wpSetSlug", "wpPackaging", "wpPackagingNew", "wpFormat"].forEach((id) => { waxPackField(id).disabled = true; });
  waxPackField("wpFormTitle").textContent = "...edit a wax pack";
  waxPackField("wpCancelButton").style.display = "";
  showWaxPackImage();
  waxPackField("wpFormTitle").scrollIntoView();
}

function resetWaxPackForm() {
  _waxPackEditing = false;
  waxPackField("waxPackForm").reset();
  waxPackField("wpImgName").value = "";
  waxPackField("wpImageStatus").textContent = "";
  ["wpYear", "wpSetSlug", "wpPackaging", "wpPackagingNew", "wpFormat"].forEach((id) => { waxPackField(id).disabled = false; });
  waxPackField("wpFormTitle").textContent = "...add a wax pack";
  waxPackField("wpCancelButton").style.display = "none";
  ["wpManufacturer", "wpPackaging"].forEach(toggleWaxPackNewValue);
  showWaxPackImage();
}

/** Same rule as the card set slug: lowercase letters, numbers and single hyphens. */
function generateWaxPackSlug() {
  waxPackField("wpSetSlug").value = waxPackField("wpSetName").value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function showWaxPackImage() {
  const name = waxPackField("wpImgName").value;
  const img = waxPackField("wpImgPreview");
  img.style.display = name ? "" : "none";
  img.src = name ? WAX_PACK_IMAGE_BASE + encodeURIComponent(name) : "";
}

/** Gets a presigned URL from cmsImageUploader, PUTs the file to S3 under img/museum/, then fills the image field. */
async function uploadWaxPackImage() {
  const file = waxPackField("wpImageFile").files[0];
  const status = waxPackField("wpImageStatus");
  if (!file) return;

  const fileName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  status.textContent = "Uploading...";

  try {
    const response = await fetch(WAX_PACK_IMAGE_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, directory: "img/museum/", contentType: file.type })
    });
    const data = await response.json();
    if (!data.uploadUrl) throw new Error("No upload URL returned");

    const upload = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!upload.ok) throw new Error(`S3 returned ${upload.status}`);

    waxPackField("wpImgName").value = fileName;
    status.textContent = "Uploaded.";
    showWaxPackImage();
  } catch (error) {
    console.log("Wax pack image upload error:", error);
    status.textContent = "Upload failed.";
  }
}

async function submitWaxPack() {
  const payload = {
    year: parseInt(waxPackField("wpYear").value, 10),
    setSlug: waxPackField("wpSetSlug").value.trim(),
    setName: waxPackField("wpSetName").value.trim(),
    manufacturer: waxPackDropdownValue("wpManufacturer"),
    packaging: waxPackDropdownValue("wpPackaging"),
    type: waxPackField("wpType").value,
    format: waxPackField("wpFormat").value,
    numCards: parseInt(waxPackField("wpNumCards").value, 10),
    price: parseFloat(waxPackField("wpPrice").value),
    currency: waxPackField("wpCurrency").value,
    imgName: waxPackField("wpImgName").value.trim(),
    notes: waxPackField("wpNotes").value.trim()
  };

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
    await cmsAlert(_waxPackEditing ? "Wax pack updated." : "Wax pack saved.");
    resetWaxPackForm();
    await loadWaxPacks();
  } catch (error) {
    console.log("Wax pack save error:", error);
    await cmsAlert("Network error saving the wax pack.");
  }
}

async function deleteWaxPack(pack) {
  if (!await cmsConfirm(`Delete "${pack.setName}" (${pack.packaging}, ${pack.format})?`)) return;

  try {
    const token = await getAuthToken();
    const response = await fetch(WAX_PACK_DELETE_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify({ year: pack.year, packKey: pack.packKey })
    });
    const data = await response.json();

    if (!response.ok) {
      await cmsAlert(data.error || "An unknown error occurred.");
      return;
    }
    await loadWaxPacks();
  } catch (error) {
    console.log("Wax pack delete error:", error);
    await cmsAlert("Network error deleting the wax pack.");
  }
}
