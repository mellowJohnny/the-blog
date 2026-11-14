/** Sportspicks CMS: newSportspick.html (add), pickSportspick.html (list as links) and sportspickEdit.html (update/delete). */

const SPORTSPICK_SAVE_URL = "https://ogga6wveok.execute-api.us-east-2.amazonaws.com/prod"; // saveSportspick API
const SPORTSPICK_DELETE_URL = "https://4ucf8sbc65.execute-api.us-east-2.amazonaws.com/prod"; // deleteSportspick API
const SPORTSPICK_GET_URL = "https://j35hpf8jb8.execute-api.us-east-2.amazonaws.com/prod"; // getSportspicks API

const SPORTSPICK_IMAGE_DIR = "img/sportspicks/";
const SPORTSPICK_IMAGE_BASE = `https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/${SPORTSPICK_IMAGE_DIR}`;
const SPORTSPICK_PICKER_URL = "/cms/pickSportspick.html";
const SPORTSPICK_HOME_URL = "/cms/wlcms.html";
const SPORTSPICK_NOTES_SOFT_MAX = 110; // fills two lines of a desktop shelf card (initCharCount(), cmsFormUI.js)

let _sportspicks = [];
let _sportspickBeingEdited = null;

function sportspickField(id) {
  return document.getElementById(id);
}

/************************************* Page entry points *************************************/

async function initNewSportspickPage() {
  renderSportspickForm("create");
  _sportspicks = await loadSportspicks() || [];
  fillSportspickSeriesList();
}

async function initPickSportspickPage() {
  const figures = await loadSportspicks();
  if (!figures) return;
  if (!figures.length) {
    sportspickField("noSportspicksDiv").textContent = "...no figures yet";
    return;
  }

  const container = sportspickField("sportspickLinksDiv");
  const years = [...new Set(figures.map((figure) => figure.releaseYear))].sort((a, b) => a - b);
  years.forEach((year) => {
    const header = document.createElement("h2");
    header.className = "blog-type-divider";
    header.textContent = year;
    container.appendChild(header);
    figures
      .filter((figure) => figure.releaseYear === year)
      .sort((a, b) => a.series.localeCompare(b.series) || a.playerName.localeCompare(b.playerName) || (a.variant || "").localeCompare(b.variant || ""))
      .forEach((figure) => container.appendChild(sportspickLink(figure)));
  });
}

async function initEditSportspickPage() {
  renderSportspickForm("edit");
  _sportspicks = await loadSportspicks() || [];
  fillSportspickSeriesList();

  const params = new URLSearchParams(document.location.search);
  const releaseYear = Number(params.get("releaseYear"));
  const figureKey = params.get("figureKey");
  const figure = _sportspicks.find((item) => item.releaseYear === releaseYear && item.figureKey === figureKey);

  if (!figure) {
    sportspickField("errorDiv").textContent = "these aren't the Droids you're looking for...";
    return;
  }
  populateSportspickForm(figure);
}

/************************************* Loading and listing *************************************/

/** Every figure, or null (after an alert) if the request fails. no-store: the public endpoint is browser-cached for 30 minutes. */
async function loadSportspicks() {
  try {
    const response = await fetch(SPORTSPICK_GET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.log("Sportspicks load error:", error);
    await cmsAlert("Could not load the figures.");
    return null;
  }
}

/** One picker entry, built like waxPackLink(): a table holding a link to the edit page. */
function sportspickLink(figure) {
  const table = document.createElement("table");
  table.className = "set-details-table-style";
  const cell = table.insertRow().insertCell();
  cell.style.cssText = "width:400px;font-size:20px";

  const link = document.createElement("a");
  link.href = `sportspickEdit.html?releaseYear=${figure.releaseYear}&figureKey=${encodeURIComponent(figure.figureKey)}`;
  const label = document.createElement("strong");
  label.textContent = `${figure.playerName}${figure.variant ? ` (${figure.variant})` : ""}`;
  link.appendChild(label);
  link.append(` - ${figure.series}`);
  cell.appendChild(link);
  return table;
}

/************************************* The form (built once, used by new and edit) *************************************/

function renderSportspickForm(mode) {
  const buttons = mode === "edit"
    ? `<div style="display:grid; grid-template-columns: 1fr auto; align-items:center;">
         <div style="justify-self:start;">
           <button class="input-button" type="button" onclick="submitSportspick()">Update Figure</button>&nbsp;&nbsp;&nbsp;&nbsp;
           <button class="input-button btn-secondary" type="button" onclick="cmsCancelEdit('${SPORTSPICK_PICKER_URL}')">Cancel</button>
         </div>
         <button class="input-button delete-btn" type="button" style="justify-self:end;" onclick="deleteSportspick()">Delete Figure</button>
       </div>`
    : `<button class="input-button" type="button" onclick="submitSportspick()">Save Figure</button>`;

  sportspickField("sportspickFormHost").innerHTML = `
    <form id="sportspickForm">
      <table class="cms-form-table">
        <tr>
          <td colspan="2">
            <label>Release Year <sup>*</sup></label> <small>the year the figure came out, e.g. 1997</small><br>
            <input type="text" id="spReleaseYear" inputmode="numeric" maxlength="4" required>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <label>Series <sup>*</sup></label> <small>pick one already used, or type a new one</small><br>
            <input type="text" id="spSeries" list="spSeriesList" maxlength="100" style="width: 450px;" required>
            <datalist id="spSeriesList"></datalist>
          </td>
        </tr>
        <tr>
          <td>
            <label>Player Name <sup>*</sup></label><br>
            <input type="text" id="spPlayerName" maxlength="100" required>
          </td>
          <td>
            <label>Variant</label> <small>e.g. Blue jersey, Chase</small><br>
            <input type="text" id="spVariant" maxlength="60">
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <label>Image</label><br>
            <input type="text" id="spImage" readonly><br>
            <button class="input-button" type="button" onclick="browseSportspickImage()">Browse</button><br>
            <img id="spImagePreview" alt="The figure" style="display: none; max-width: 160px;">
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <label for="spNotes">Notes</label>
            <span class="char-count" id="spNotesCount"></span><br>
            <textarea id="spNotes" class="seo-textarea" rows="3"></textarea>
          </td>
        </tr>
        <tr>
          <td colspan="2" align="left">${buttons}</td>
        </tr>
      </table>
    </form>`;
  initCharCount("spNotes", SPORTSPICK_NOTES_SOFT_MAX);
}

/** Suggests every series already saved, A to Z, so new figures reuse the same spelling. */
function fillSportspickSeriesList() {
  const list = sportspickField("spSeriesList");
  list.innerHTML = "";
  [...new Set(_sportspicks.map((figure) => figure.series))]
    .sort((a, b) => a.localeCompare(b))
    .forEach((series) => list.appendChild(new Option(series)));
}

/** Fills the edit form from a saved figure; only the release year (the table's partition key) is locked. */
function populateSportspickForm(figure) {
  _sportspickBeingEdited = figure;

  sportspickField("spReleaseYear").value = figure.releaseYear;
  sportspickField("spPlayerName").value = figure.playerName;
  sportspickField("spVariant").value = figure.variant || "";
  sportspickField("spSeries").value = figure.series;
  sportspickField("spImage").value = figure.image || "";
  sportspickField("spNotes").value = figure.notes || "";
  refreshCharCounts();

  sportspickField("spReleaseYear").disabled = true;
  showSportspickImage();
}

/************************************* Image *************************************/

/** Opens the shared image browser (cmsImageBrowser.js) on the Sportspicks folder, processing uploads to keep their transparency. */
function browseSportspickImage() {
  openImageBrowser("spImage", (fileName) => {
    sportspickField("spImage").value = fileName;
    showSportspickImage();
  }, SPORTSPICK_IMAGE_DIR, processSportspickImage);
}

function showSportspickImage() {
  const name = sportspickField("spImage").value;
  const img = sportspickField("spImagePreview");
  img.style.display = name ? "" : "none";
  img.src = name ? SPORTSPICK_IMAGE_BASE + encodeURIComponent(name) : "";
}

/************************************* Save and delete *************************************/

/** Creates a figure (new page) or updates the loaded one (edit page); both return to the picker. */
async function submitSportspick() {
  const payload = {
    releaseYear: parseInt(sportspickField("spReleaseYear").value, 10),
    playerName: sportspickField("spPlayerName").value.trim(),
    series: sportspickField("spSeries").value.trim(),
    variant: sportspickField("spVariant").value.trim(),
    image: sportspickField("spImage").value.trim(),
    notes: sportspickField("spNotes").value.trim()
  };
  if (_sportspickBeingEdited) payload.figureKey = _sportspickBeingEdited.figureKey;

  try {
    const token = await getAuthToken();
    const response = await fetch(SPORTSPICK_SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      await cmsAlert(data.error || "An unknown error occurred.");
      return;
    }
    await cmsAlert(_sportspickBeingEdited ? "Figure updated." : "Figure saved.");
    window.location.href = _sportspickBeingEdited ? SPORTSPICK_PICKER_URL : SPORTSPICK_HOME_URL;
  } catch (error) {
    console.log("Sportspicks save error:", error);
    await cmsAlert("Network error saving the figure.");
  }
}

async function deleteSportspick() {
  if (!_sportspickBeingEdited) return;
  if (!await cmsConfirm("Delete this figure? This cannot be undone.")) return;

  try {
    const token = await getAuthToken();
    const response = await fetch(SPORTSPICK_DELETE_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify({ releaseYear: _sportspickBeingEdited.releaseYear, figureKey: _sportspickBeingEdited.figureKey })
    });
    const data = await response.json();

    if (!response.ok) {
      await cmsAlert(data.error || "An unknown error occurred.");
      return;
    }
    await cmsAlert(data.message || "Figure deleted.");
    window.location.href = SPORTSPICK_PICKER_URL;
  } catch (error) {
    console.log("Sportspicks delete error:", error);
    await cmsAlert("Network error deleting the figure.");
  }
}
