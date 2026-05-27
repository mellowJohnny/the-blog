document.addEventListener("DOMContentLoaded", () => {

    const textarea = document.getElementById("message");
    const stats = document.getElementById("sms-stats");

    function isGsm7(str) {
        const gsm7Regex = /^[\x00-\x7F€£¥èéùìòÇØøÅåΔΦΓΛΩΠΨΣΘΞÆæßÉ!"#$%&'()*+,\-./0-9:;<=>?@A-ZÄÖÑÜ§¿a-zäöñüà^{}\[~\]|€£¥]*$/;
        return gsm7Regex.test(str);
    }

    function smsSegments(str) {
        const length = str.length;
        const gsm7 = isGsm7(str);

        if (gsm7) {
            if (length <= 160) return 1;
            return Math.ceil(length / 153);
        } else {
            if (length <= 70) return 1;
            return Math.ceil(length / 67);
        }
    }

    textarea.addEventListener("input", () => {
    let text = textarea.value;

    // If GSM-Safe Mode is enabled, sanitize the text
    if (document.getElementById("gsmSafeMode").checked) {
        const cleaned = gsmSafe(text);
        if (cleaned !== text) {
            text = cleaned;
            textarea.value = cleaned; // update the textarea live
        }
    }

    const length = text.length;
    const gsm7 = isGsm7(text);
    const segments = smsSegments(text);

    let warning = "";
    if (gsm7 && length > 160) {
        warning = `<span style="color:#c00; font-weight:bold;">Warning: exceeds 160 characters</span><br>`;
    }

    stats.innerHTML = `
        Characters: ${length} &nbsp; Encoding: ${gsm7 ? "GSM‑7" : "Unicode"} &nbsp; Segments: ${segments}<br>
        ${warning}
    `;
});


});

function gsmSafe(str) {
    return str
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/–/g, "-")
        .replace(/—/g, "-")
        .replace(/…/g, "...")
        .replace(/•/g, "*")
        .replace(/\u00A0/g, " "); // non-breaking space
}

document.getElementById("sendBtn").addEventListener("click", sendBroadcast);

async function sendBroadcast(event) {
  event.preventDefault(); // <-- stops form submission

  const textarea = document.getElementById("message");
  const message = textarea.value.trim();
  const table = document.getElementById("resultsTable");
  const tbody = table.querySelector("tbody");
  const overlay = document.getElementById("autobus-spinner-overlay");

  if (!message) {
    alert("Please enter a message");
    return;
  }

  // Show spinner
  if (overlay) {
    overlay.style.display = "flex";
  }

  // Clear previous results
  tbody.innerHTML = "";
  table.style.display = "none";
  document.getElementById("autobus-sent-message").style.display = "none";

  try {
    const res = await fetch("https://yzivv3xuw2.execute-api.us-east-2.amazonaws.com/prod/admin/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    console.log("Broadcast results:", data);

    if (data.results && Array.isArray(data.results)) {
      let successCount = 0;
      let failureCount = 0;

      // New functionality to display the actual message we sent...
      const titleEl = document.getElementById("autobus-sent-message-title");
      const bubbleEl = document.getElementById("autobus-sent-message");

      titleEl.innerHTML = `The following message was sent to:`;
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

      // ✅ Clear textarea on success and reset counter
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
    // Hide spinner no matter what
    if (overlay) {
      overlay.style.display = "none";
    }
  }
}


// Character count helper functions
function countCharacters(str) {
    return str.length;
}

function isGsm7(str) {
    const gsm7Regex = /^[\x00-\x7F€£¥èéùìòÇØøÅåΔΦΓΛΩΠΨΣΘΞÆæßÉ!"#$%&'()*+,\-./0-9:;<=>?@A-ZÄÖÑÜ§¿a-zäöñüà^{}\[~\]|€£¥]+$/;
    return gsm7Regex.test(str);
}

function smsSegments(str) {
    const length = str.length;
    const gsm7 = isGsm7(str);

    if (gsm7) {
        if (length <= 160) return 1;
        return Math.ceil(length / 153);
    } else {
        if (length <= 70) return 1;
        return Math.ceil(length / 67);
    }
}
