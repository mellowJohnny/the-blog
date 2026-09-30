/*
 * cms/uploadChecklist.html support code. Flow: pick a PDF ->
 * parseChecklistPdf() parses it into an editable table -> user
 * reviews/fixes rows -> saveChecklist() writes them to Checklists.
 */

const PARSE_CHECKLIST_URL = "https://uurjs2v7i0.execute-api.us-east-2.amazonaws.com/dev";
const SAVE_CHECKLIST_URL = "https://w46hwbexed.execute-api.us-east-2.amazonaws.com/dev";

// --- Upload/parse modal - mirrors cms/smsAdmin.html's bulk import modal ---
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
  const importLink = document.getElementById("checklistImportLink");
  if (!importLink) return; // this script also loads on pages without the modal

  const overlay = document.getElementById("checklistImportOverlay");
  const cancelBtn = document.getElementById("checklistCancelBtn");
  const parseBtn = document.getElementById("checklistParseBtn");
  const fileInput = document.getElementById("checklistFileInput");
  const dropZone = document.getElementById("checklistDropZone");
  const fileNameEl = document.getElementById("checklistModalFileName");

  function resetModal() {
    selectedFile = null;
    fileInput.value = "";
    fileNameEl.textContent = "";
    parseBtn.disabled = true;
    parseBtn.textContent = "Parse";
    hideModalFeedback();
  }

  function closeModal() {
    overlay.style.display = "none";
    resetModal();
  }

  importLink.addEventListener("click", (e) => {
    e.preventDefault();
    resetModal();
    overlay.style.display = "flex";
  });

  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFileSelected(fileInput.files[0], fileNameEl, parseBtn);
  });

  dropZone.addEventListener("click", (e) => {
    if (e.target !== fileInput) fileInput.click();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file, fileNameEl, parseBtn);
  });

  parseBtn.addEventListener("click", () => {
    if (!selectedFile) return;
    parseChecklistPdf(selectedFile, { parseBtn, cancelBtn, closeModal });
  });
});

function handleFileSelected(file, fileNameEl, parseBtn) {
  hideModalFeedback();

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showModalFeedback("Please select a PDF file.", "error");
    selectedFile = null;
    parseBtn.disabled = true;
    return;
  }

  selectedFile = file;
  fileNameEl.textContent = file.name;
  parseBtn.disabled = false;
}

function showModalFeedback(msg, type) {
  const feedbackEl = document.getElementById("checklistModalFeedback");
  feedbackEl.textContent = msg;
  feedbackEl.className = `bulk-feedback ${type}`;
  feedbackEl.style.display = "block";
}

function hideModalFeedback() {
  const feedbackEl = document.getElementById("checklistModalFeedback");
  feedbackEl.style.display = "none";
  feedbackEl.className = "bulk-feedback";
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a data: URL ("data:application/pdf;base64,....") -
      // strip everything up to and including the comma
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setChecklistStatus(message, isError) {
  const statusDiv = document.getElementById("checklistStatus");
  statusDiv.textContent = message;
  statusDiv.style.color = isError ? "rgb(150, 30, 30)" : "rgb(7, 62, 126)";
}

function buildChecklistRow(card) {
  const tr = document.createElement("tr");

  const numTd = document.createElement("td");
  numTd.className = "checklist-num-col";
  numTd.innerHTML = `<input type="text" class="checklist-cardnumber-input" value="${escapeAttr(card.cardNumber || "")}">`;

  const nameTd = document.createElement("td");
  nameTd.innerHTML = `<input type="text" class="checklist-playername-input" value="${escapeAttr(card.playerName || "")}">`;

  const notesTd = document.createElement("td");
  notesTd.innerHTML = `<input type="text" class="checklist-notes-input" value="${escapeAttr(card.notes || "")}">`;

  const deleteTd = document.createElement("td");
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "checklist-row-delete-btn";
  deleteBtn.innerHTML = "&times;";
  deleteBtn.title = "Remove this row";
  deleteBtn.onclick = () => tr.remove();
  deleteTd.appendChild(deleteBtn);

  tr.append(numTd, nameTd, notesTd, deleteTd);
  return tr;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function renderChecklistTable(cards) {
  const tbody = document.getElementById("checklistTableBody");
  tbody.innerHTML = "";
  cards.forEach((card) => tbody.appendChild(buildChecklistRow(card)));
}

function addChecklistRow() {
  const tbody = document.getElementById("checklistTableBody");
  tbody.appendChild(buildChecklistRow({ cardNumber: "", playerName: "", notes: "" }));
}

function parseChecklistPdf(file, { parseBtn, cancelBtn, closeModal }) {
  parseBtn.disabled = true;
  cancelBtn.disabled = true;
  parseBtn.textContent = "Parsing...";
  hideModalFeedback();

  document.getElementById("checklistReviewSection").style.display = "none";
  setChecklistStatus("", false);

  readFileAsBase64(file)
    .then((fileContent) =>
      getAuthToken().then((token) =>
        fetch(PARSE_CHECKLIST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": token },
          body: JSON.stringify({ fileName: file.name, fileContent })
        })
      )
    )
    .then(async (response) => {
      let data;
      try {
        data = await response.json();
      } catch {
        showModalFeedback("Unexpected server response.", "error");
        return;
      }

      if (!response.ok) {
        showModalFeedback(data.error || "Failed to parse PDF.", "error");
        return;
      }

      document.getElementById("checklistSetName").value = data.setName || "";
      document.getElementById("checklistInsertSetName").value = data.insertSetName || "";
      renderChecklistTable(data.cards || []);
      document.getElementById("checklistReviewSection").style.display = "block";

      let statusMsg = `Parsed ${data.cards.length} cards. Review below, then save.`;
      if (data.skippedDuplicates?.length > 0) {
        statusMsg += ` (Skipped ${data.skippedDuplicates.length} duplicate-numbered line(s) - check the source PDF if that's unexpected.)`;
      }
      setChecklistStatus(statusMsg, false);
      closeModal();
    })
    .catch((error) => {
      console.log("Parse error:", error);
      showModalFeedback("Network error parsing the PDF.", "error");
    })
    .finally(() => {
      parseBtn.disabled = false;
      cancelBtn.disabled = false;
      parseBtn.textContent = "Parse";
    });
}

function collectChecklistRows() {
  const rows = document.querySelectorAll("#checklistTableBody tr");
  const cards = [];
  rows.forEach((row) => {
    const cardNumber = row.querySelector(".checklist-cardnumber-input").value.trim();
    const playerName = row.querySelector(".checklist-playername-input").value.trim();
    const notes = row.querySelector(".checklist-notes-input").value.trim();
    if (cardNumber || playerName) {
      cards.push({ cardNumber, playerName, notes });
    }
  });
  return cards;
}

async function saveChecklist() {
  const setName = document.getElementById("checklistSetName").value.trim();
  if (!setName) {
    await cmsAlert("Set Name is required.");
    document.getElementById("checklistSetName").focus();
    return;
  }

  const insertSetName = document.getElementById("checklistInsertSetName").value.trim();

  const cards = collectChecklistRows();
  if (cards.length === 0) {
    await cmsAlert("At least one card row is required.");
    return;
  }

  const missingRow = cards.find((c) => !c.cardNumber || !c.playerName);
  if (missingRow) {
    await cmsAlert("Every row needs both a Card # and a Player Name.");
    return;
  }

  const saveButton = document.getElementById("cmsSubmitButton");
  saveButton.style.backgroundColor = "#36a5e6";
  saveButton.innerHTML = "Saving...";

  getAuthToken()
    .then((token) =>
      fetch(SAVE_CHECKLIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token },
        body: JSON.stringify({ setName, insertSetName, cards })
      })
    )
    .then(async (response) => {
      let data;
      try {
        data = await response.json();
      } catch {
        await cmsAlert("Unexpected server response.");
        return;
      }

      if (!response.ok) {
        await cmsAlert(data.error || "Failed to save checklist.");
        return;
      }

      await cmsAlert(data.message || "Saved.");
      window.location.href = "/cms/uploadChecklist.html";
    })
    .catch(async (error) => {
      console.log("Save error:", error);
      await cmsAlert("Network error saving the checklist.");
    })
    .finally(() => {
      saveButton.style.backgroundColor = "rgb(2, 70, 153)";
      saveButton.innerHTML = "Save to DynamoDB";
    });
}

// --- Delete an existing checklist group -------------------------------
// A set's rows are split into groups by insertSetName (the DynamoDB
// sort-key prefix), so a group has to be picked before it can be
// deleted. Reuses the public getChecklistBySetName read - no auth, and
// no new endpoint needed just to list what's there.

const CHECKLIST_READ_URL = "https://xbizlwvad5.execute-api.us-east-2.amazonaws.com/dev";

const MAIN_SET_LABEL = "Main set";

function setDeleteStatus(message) {
  const el = document.getElementById("checklistDeleteStatus");
  if (el) el.textContent = message;
}

async function loadChecklistGroups() {
  const setName = document.getElementById("checklistDeleteSetName").value.trim();
  const list = document.getElementById("checklistDeleteList");
  list.innerHTML = "";

  if (!setName) {
    await cmsAlert("Enter the Set Name whose checklist you want to manage.");
    document.getElementById("checklistDeleteSetName").focus();
    return;
  }

  setDeleteStatus("Loading...");
  try {
    const response = await fetch(`${CHECKLIST_READ_URL}?setName=${encodeURIComponent(setName)}`);
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data = await response.json();
    const items = Array.isArray(data) ? data : data.Items || data.items || [];

    if (items.length === 0) {
      setDeleteStatus(`No checklist found for "${setName}". Check the spelling - it has to match exactly.`);
      return;
    }

    // Group by insertSetName; "" is the main set.
    const groups = new Map();
    items.forEach((item) => {
      const key = item.insertSetName || "";
      groups.set(key, (groups.get(key) || 0) + 1);
    });

    setDeleteStatus(`${items.length} card(s) across ${groups.size} group(s) for "${setName}".`);
    [...groups.keys()].sort().forEach((insertSetName) => {
      list.appendChild(buildChecklistGroupRow(setName, insertSetName, groups.get(insertSetName)));
    });
  } catch (error) {
    console.log("Load checklist groups error:", error);
    setDeleteStatus("Could not load that set's checklist.");
  }
}

function buildChecklistGroupRow(setName, insertSetName, count) {
  const row = document.createElement("div");
  row.className = "checklist-delete-row";

  const label = document.createElement("span");
  label.textContent = `${insertSetName || MAIN_SET_LABEL} - ${count} card${count === 1 ? "" : "s"}`;

  // setName routinely contains apostrophes ("McDonald's ..."), so the
  // values ride on data-* attributes rather than an interpolated
  // onclick string - same reason wax.js's checklist link does it.
  const button = document.createElement("button");
  button.type = "button";
  button.className = "input-button delete-btn";
  button.textContent = "Delete";
  button.dataset.setName = setName;
  button.dataset.insertSetName = insertSetName;
  button.addEventListener("click", () => deleteChecklistGroup(button));

  row.appendChild(label);
  row.appendChild(button);
  return row;
}

async function deleteChecklistGroup(button) {
  const setName = button.dataset.setName;
  const insertSetName = button.dataset.insertSetName;
  const groupLabel = insertSetName || MAIN_SET_LABEL;

  const ok = await cmsConfirm(
    `Delete the "${groupLabel}" checklist for "${setName}"? This cannot be undone.`
  );
  if (!ok) return;

  button.disabled = true;
  button.textContent = "Deleting...";

  try {
    const token = await getAuthToken();
    const response = await fetch(SAVE_CHECKLIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify({ setName, insertSetName, cards: [], confirmDelete: true })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      await cmsAlert("Unexpected server response.");
      return;
    }

    if (!response.ok) {
      await cmsAlert(data.error || "Failed to delete the checklist.");
      return;
    }

    await cmsAlert(data.message || "Checklist deleted.");
    await loadChecklistGroups(); // re-read rather than assume what's left
  } catch (error) {
    console.log("Delete checklist error:", error);
    await cmsAlert("Network error deleting the checklist.");
  } finally {
    button.disabled = false;
    button.textContent = "Delete";
  }
}
