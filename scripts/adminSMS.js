// admin-sms.js
console.log("Amplify global:", window.aws_amplify);

// Configure Amplify
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

document.getElementById("sendBtn").addEventListener("click", sendBroadcast);

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
  console.log("Broadcast results:", data);
}
