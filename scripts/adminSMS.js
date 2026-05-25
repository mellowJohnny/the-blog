document.getElementById("sendBtn").addEventListener("click", sendBroadcast);

async function sendBroadcast() {
    console.log("Send button has been clicked!");
  const message = document.getElementById("message").value.trim();
  if (!message) {
    alert("Please enter a message");
    return;
  }

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
    alert("Message sent successfully");
  } catch (err) {
    console.error("Error sending broadcast:", err);
    alert("Failed to send message");
  }
}
