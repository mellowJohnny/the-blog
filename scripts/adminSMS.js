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
