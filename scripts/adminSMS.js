document.getElementById("sendBtn").addEventListener("click", sendBroadcast);

async function sendBroadcast(event) {
  event.preventDefault(); // <-- stops form submission

  const textarea = document.getElementById("message");
  const message = textarea.value.trim();
  const table = document.getElementById("resultsTable");
  const tbody = table.querySelector("tbody");
  const overlay = document.getElementById("autobus-spinner-overlay");

  // NEW: determine mode
  const mode = document.getElementById("testMode").checked ? "test" : "live";

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
      body: JSON.stringify({ message, mode })   // <-- UPDATED
    });

    const data = await res.json();
    console.log("Broadcast results:", data);

    if (data.results && Array.isArray(data.results)) {
      let successCount = 0;
      let failureCount = 0;

      // Show the message we sent
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
    // Hide spinner
    if (overlay) overlay.style.display = "none";
  }
}
