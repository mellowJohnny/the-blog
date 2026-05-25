document.getElementById("sendBtn").addEventListener("click", sendBroadcast);

async function sendBroadcast() {
  const message = document.getElementById("message").value.trim();
  const table = document.getElementById("resultsTable");
  const tbody = table.querySelector("tbody");

  if (!message) {
    alert("Please enter a message");
    return;
  }

  // Clear previous results
  tbody.innerHTML = "";
  table.style.display = "none";

  try {
    const res = await fetch("https://yzivv3xuw2.execute-api.us-east-2.amazonaws.com/prod/admin/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    console.log("Broadcast results:", data);

    // Expecting: data.results = [ { phone, status, error }, ... ]
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${item.phone || ""}</td>
          <td>${item.status || ""}</td>
          <td>${item.error || ""}</td>
        `;

        tbody.appendChild(row);
      });

      table.style.display = "table";
    } else {
      // If the backend returns something unexpected
      tbody.innerHTML = `
        <tr><td colspan="3">Unexpected response format</td></tr>
      `;
      table.style.display = "table";
    }

  } catch (err) {
    console.error("Error sending broadcast:", err);

    tbody.innerHTML = `
      <tr><td colspan="3" style="color:red;">Error sending message</td></tr>
    `;
    table.style.display = "table";
  }
}
