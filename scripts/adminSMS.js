// admin-sms.js
console.log("Amplify global:", window.aws_amplify);

// Configure Amplify (reuse your existing config)
aws_amplify.Amplify.configure({
  Auth: {
    region: "us-east-2",
    userPoolId: "us-east-2_wEdajhS7F",
    userPoolWebClientId: "1m22cfonep7l85th9ut1obk0pe",
  }
});

async function getToken() {
  const session = await aws_amplify.Auth.currentSession();
  return session.getIdToken().getJwtToken();
}



const API_BASE = "https://yzivv3xuw2.execute-api.us-east-2.amazonaws.com/prod/admin/send";

document.getElementById("sendBtn").addEventListener("click", sendBroadcast);

async function getToken() {
  const session = await Amplify.Auth.currentSession();
  return session.getIdToken().getJwtToken();
}

async function sendBroadcast() {
  const message = document.getElementById("message").value.trim();
  if (!message) {
    alert("Please enter a message");
    return;
  }

  const token = await getToken();

  const res = await fetch(`${API_BASE}/admin/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({ message })
  });

  const data = await res.json();
  renderResults(data.results);
}

function renderResults(results) {
  const table = document.getElementById("resultsTable");
  const tbody = table.querySelector("tbody");

  tbody.innerHTML = "";

  results.forEach(r => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${r.phone}</td>
      <td>${r.status}</td>
      <td>${r.error || ""}</td>
    `;

    tbody.appendChild(row);
  });

  table.style.display = "table";
}
