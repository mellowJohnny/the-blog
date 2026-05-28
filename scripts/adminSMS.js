document.getElementById("sendBtn").addEventListener("click", sendBroadcast);

const textarea = document.getElementById("message");
const statsEl = document.getElementById("sms-stats");
const gsmSafeMode = document.getElementById("gsmSafeMode");

// GSM‑7 character set
const GSM_7 = new Set([
  "@", "£", "$", "¥", "è", "é", "ù", "ì", "ò", "Ç",
  "\n", "Ø", "ø", "\r", "Å", "å", "Δ", "_", "Φ", "Γ",
  "Λ", "Ω", "Π", "Ψ", "Σ", "Θ", "Ξ",
  " ", "!", "\"", "#", "¤", "%", "&", "'", "(", ")",
  "*", "+", ",", "-", ".", "/", "0", "1", "2", "3",
  "4", "5", "6", "7", "8", "9", ":", ";", "<", "=",
  ">", "?", "¡", "A", "B", "C", "D", "E", "F", "G",
  "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q",
  "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "Ä",
  "Ö", "Ñ", "Ü", "§", "¿", "a", "b", "c", "d", "e",
  "f", "g", "h", "i", "j", "k", "l", "m", "n", "o",
  "p", "q", "r", "s", "t", "u", "v", "w", "x", "y",
  "z", "ä", "ö", "ñ", "ü", "à"
]);

// Replace curly quotes & smart punctuation
function applyGsmSafeMode(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/…/g, "...");
}

// Detect encoding + segments
function updateSmsStats() {
  let text = textarea.value;

  if (gsmSafeMode.checked) {
    text = applyGsmSafeMode(text);
    textarea.value = text;
  }

  let isGsm7 = true;
  for (const ch of text) {
    if (!GSM_7.has(ch)) {
      isGsm7 = false;
      break;
    }
  }

  const encoding = isGsm7 ? "GSM‑7" : "Unicode";
  const limit = isGsm7 ? 160 : 70;
  const segLimit = isGsm7 ? 153 : 67;

  const chars = text.length;
  const segments = chars <= limit ? 1 : Math.ceil(chars / segLimit);

  statsEl.innerHTML = `Characters: ${chars} &nbsp; Encoding: ${encoding} &nbsp; Segments: ${segments}`;
}

// Attach listeners
textarea.addEventListener("input", updateSmsStats);
gsmSafeMode.addEventListener("change", updateSmsStats);

// INITIALIZE COUNTER
updateSmsStats();


// ---------------------------------------------------------
// SEND BROADCAST
// ---------------------------------------------------------
async function sendBroadcast(event) {
  event.preventDefault();

  const message = textarea.value.trim();
  const table = document.getElementById("resultsTable");
  const tbody = table.querySelector("tbody");
  const overlay = document.getElementById("autobus-spinner-overlay");

  // Determine mode
  const mode = document.getElementById("testMode").checked ? "test" : "live";

  // Confirmation dialog for LIVE mode
  if (mode === "live") {
    const ok = confirm(
      "⚠️ LIVE MODE\n\nThis will send your message to ALL subscribed users.\n\nAre you absolutely sure you want to proceed?"
    );
    if (!ok) return;
  }

  if (!message) {
    alert("Please enter a message");
    return;
  }

  // Show spinner
  if (overlay) overlay.style.display = "flex";

  // Clear previous results
  tbody.innerHTML = "";
  table.style.display = "none";
  document.getElementById("autobus-sent-message").style.display = "none";

  try {
    const res = await fetch("https://yzivv3xuw2.execute-api.us-east-2.amazonaws.com/prod/admin/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, mode })
    });

    const data = await res.json();
    console.log("Broadcast results:", data);

    if (data.results && Array.isArray(data.results)) {
      let successCount = 0;
      let failureCount = 0;

      const titleEl = document.getElementById("autobus-sent-message-title");
      const bubbleEl = document.getElementById("autobus-sent-message");

      titleEl.innerHTML = `The following recipients received this message (${mode.toUpperCase()} MODE):`;
      bubbleEl.textContent = message;

      titleEl.style.display = "block";
      bubbleEl.style.display = "inline-block";

      data.results.forEach(item => {
        const row = document.createElement("tr");

        if (item.status === "SUCCESS") successCount++;
        else failureCount++;

        row.innerHTML = `
          <td>${item.firstName || ""}</td>
          <td>${item.phone || ""}</td>
          <td>${item.status || ""}</td>
          <td>${item.error || ""}</td>
        `;

        tbody.appendChild(row);
      });

      const summaryRow = document.createElement("tr");
      summaryRow.classList.add("autobus-summary-row");

      summaryRow.innerHTML = `
        <td colspan="4">
          Summary: ${successCount} successful, ${failureCount} failed
        </td>
      `;

      tbody.appendChild(summaryRow);

      table.style.display = "table";

      // Clear textarea + reset counter
      textarea.value = "";
      textarea.dispatchEvent(new Event("input"));
    }

  } catch (err) {
    console.error("Error sending broadcast:", err);

    tbody.innerHTML = `
      <tr><td colspan="4" style="color:red;">Error sending message</td></tr>
    `;
    table.style.display = "table";

  } finally {
    if (overlay) overlay.style.display = "none";
  }
}

// Bulk Import Stuff

const BULK_IMPORT_API = 'https://05b6ofo7i1.execute-api.us-east-2.amazonaws.com/prod/subscribers/bulk-upload';

const overlay      = document.getElementById('bulkImportOverlay');
const navLink      = document.getElementById('bulkImportLink');
const cancelBtn    = document.getElementById('bulkCancelBtn');
const uploadBtn    = document.getElementById('bulkUploadBtn');
const closeBtn     = document.getElementById('bulkCloseBtn');
const fileInput    = document.getElementById('bulkFileInput');
const dropZone     = document.getElementById('bulkDropZone');
const fileNameEl   = document.getElementById('bulkFileName');
const feedbackEl   = document.getElementById('bulkFeedback');

let parsedItems = null;

// --- Open / close modal ---
navLink.addEventListener('click', (e) => {
  e.preventDefault();
  resetModal();
  overlay.style.display = 'flex';
});

cancelBtn.addEventListener('click', closeModal);

closeBtn.addEventListener('click', closeModal);

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

function closeModal() {
  overlay.style.display = 'none';
  resetModal();
}

function resetModal() {
  parsedItems = null;
  fileInput.value = '';
  fileNameEl.textContent = '';
  uploadBtn.disabled = true;
  hideFeedback();
}

// --- File selection ---
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// Allow clicking the drop zone to trigger file browse
dropZone.addEventListener('click', (e) => {
  if (e.target !== fileInput) fileInput.click();
});

// --- Drag and drop ---
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// --- Parse and validate the JSON file ---
function handleFile(file) {
  hideFeedback();
  parsedItems = null;
  uploadBtn.disabled = true;

  if (!file.name.endsWith('.json')) {
    showFeedback('Please select a .json file.', 'error');
    return;
  }

  fileNameEl.textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data) || data.length === 0) {
        showFeedback('Invalid format: file must contain a non-empty JSON array.', 'error');
        return;
      }
      parsedItems = data;
      uploadBtn.disabled = false;
      showFeedback(`${data.length} record(s) ready to import.`, 'success');
    } catch {
      showFeedback('Could not parse JSON. Please check the file and try again.', 'error');
    }
  };
  reader.readAsText(file);
}

// --- Upload ---
uploadBtn.addEventListener('click', async () => {
  if (!parsedItems) return;

  uploadBtn.disabled = true;
  cancelBtn.disabled = true;
  showFeedback('Uploading...', 'success');

  try {
    const res = await fetch(BULK_IMPORT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedItems),
    });

    const json = await res.json();

    if (res.ok) {
        showFeedback(`✓ Successfully imported ${json.count} subscriber(s).`, 'success');
        uploadBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        closeBtn.style.display = 'inline-block';
    } else {
      showFeedback(`Upload failed: ${json.message || 'Unknown error.'}`, 'error');
      uploadBtn.disabled = false;
    }
  } catch (err) {
    showFeedback(`Network error: ${err.message}`, 'error');
    uploadBtn.disabled = false;
  } finally {
    cancelBtn.disabled = false;
  }
});

// --- Feedback helpers ---
function showFeedback(msg, type) {
  feedbackEl.textContent = msg;
  feedbackEl.className = `bulk-feedback ${type}`;
  feedbackEl.style.display = 'block';
}

function hideFeedback() {
  feedbackEl.style.display = 'none';
  feedbackEl.className = 'bulk-feedback';
}