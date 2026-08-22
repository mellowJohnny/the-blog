/*
 * cms/uploadChecklist.html support code.
 * Flow: pick a PDF -> parseChecklistPdf() sends it to the parsing Lambda
 * and renders the result as an editable table -> the user reviews/fixes
 * rows by hand -> saveChecklist() sends the (possibly edited) rows to
 * the save Lambda, which writes them to the Checklists table.
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
  notesTd.className = "checklist-notes-col";
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

function saveChecklist() {
  const setName = document.getElementById("checklistSetName").value.trim();
  if (!setName) {
    alert("Set Name is required.");
    document.getElementById("checklistSetName").focus();
    return;
  }

  const insertSetName = document.getElementById("checklistInsertSetName").value.trim();

  const cards = collectChecklistRows();
  if (cards.length === 0) {
    alert("At least one card row is required.");
    return;
  }

  const missingRow = cards.find((c) => !c.cardNumber || !c.playerName);
  if (missingRow) {
    alert("Every row needs both a Card # and a Player Name.");
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
        alert("Unexpected server response.");
        return;
      }

      if (!response.ok) {
        alert(data.error || "Failed to save checklist.");
        return;
      }

      alert(data.message || "Saved.");
      window.location.href = "/cms/wlcms.html";
    })
    .catch((error) => {
      console.log("Save error:", error);
      alert("Network error saving the checklist.");
    })
    .finally(() => {
      saveButton.style.backgroundColor = "rgb(2, 70, 153)";
      saveButton.innerHTML = "Save to DynamoDB";
    });
}
