/*
 * cms/uploadChecklist.html support code.
 * Flow: pick a PDF -> parseChecklistPdf() sends it to the parsing Lambda
 * and renders the result as an editable table -> the user reviews/fixes
 * rows by hand -> saveChecklist() sends the (possibly edited) rows to
 * the save Lambda, which writes them to the Checklists table.
 */

const PARSE_CHECKLIST_URL = "https://uurjs2v7i0.execute-api.us-east-2.amazonaws.com/dev";
const SAVE_CHECKLIST_URL = "https://w46hwbexed.execute-api.us-east-2.amazonaws.com/dev";

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("checklistFileInput");
  if (!fileInput) return;

  fileInput.addEventListener("change", () => {
    const fileNameSpan = document.getElementById("checklistFileName");
    fileNameSpan.textContent = fileInput.files[0]?.name || "No file chosen";
  });
});

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

function parseChecklistPdf() {
  const fileInput = document.getElementById("checklistFileInput");
  const file = fileInput.files[0];

  if (!file) {
    setChecklistStatus("Choose a PDF file first.", true);
    return;
  }

  setChecklistStatus("Parsing...", false);
  document.getElementById("checklistReviewSection").style.display = "none";

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
        setChecklistStatus("Unexpected server response.", true);
        return;
      }

      if (!response.ok) {
        setChecklistStatus(data.error || "Failed to parse PDF.", true);
        return;
      }

      document.getElementById("checklistSetName").value = data.setName || "";
      renderChecklistTable(data.cards || []);
      document.getElementById("checklistReviewSection").style.display = "block";

      let statusMsg = `Parsed ${data.cards.length} cards. Review below, then save.`;
      if (data.skippedDuplicates?.length > 0) {
        statusMsg += ` (Skipped ${data.skippedDuplicates.length} duplicate-numbered line(s) - check the source PDF if that's unexpected.)`;
      }
      setChecklistStatus(statusMsg, false);
    })
    .catch((error) => {
      console.log("Parse error:", error);
      setChecklistStatus("Network error parsing the PDF.", true);
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
    setChecklistStatus("Set Name is required.", true);
    document.getElementById("checklistSetName").focus();
    return;
  }

  const cards = collectChecklistRows();
  if (cards.length === 0) {
    setChecklistStatus("At least one card row is required.", true);
    return;
  }

  const missingRow = cards.find((c) => !c.cardNumber || !c.playerName);
  if (missingRow) {
    setChecklistStatus("Every row needs both a Card # and a Player Name.", true);
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
        body: JSON.stringify({ setName, cards })
      })
    )
    .then(async (response) => {
      let data;
      try {
        data = await response.json();
      } catch {
        setChecklistStatus("Unexpected server response.", true);
        return;
      }

      if (!response.ok) {
        setChecklistStatus(data.error || "Failed to save checklist.", true);
        return;
      }

      setChecklistStatus(data.message || "Saved.", false);
      window.location.href = "/cms/wlcms.html";
    })
    .catch((error) => {
      console.log("Save error:", error);
      setChecklistStatus("Network error saving the checklist.", true);
    })
    .finally(() => {
      saveButton.style.backgroundColor = "rgb(2, 70, 153)";
      saveButton.innerHTML = "Save to DynamoDB";
    });
}
