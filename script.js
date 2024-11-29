// Connect to the WebSocket server
const ws = new WebSocket("wss://quixxback.onrender.com"); // Replace with the actual server URL

ws.onopen = () => {
  console.log("WebSocket connection established!");
};

// Listen for messages from the server
ws.onmessage = (event) => {
  const gameState = JSON.parse(event.data);
  console.log("Received updated game state:", gameState);
  console.log("Message from server:", event.data);

  // Update the UI with the new game state (to be implemented based on game rules)
};

// Send updates to the server
function sendGameStateUpdate(update) {
  ws.send(JSON.stringify(update));
}

// Function to send a custom message to the backend (for testing or other interactions)
function sendMessage(message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ message }));
    console.log("Message sent:", message);
  } else {
    console.error("WebSocket is not open. Cannot send message.");
  }
}

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = (event) => {
  console.warn("WebSocket connection closed:", event);
};

// Example usage for cell clicks (ensure this is defined globally or used in context)
document.querySelectorAll(".score-cell").forEach((cell) => {
  cell.onclick = () => {
    const previousCells = Array.from(cell.parentNode.children).slice(
      0,
      cell.cellIndex
    );
    const allPreviousCrossed = previousCells.every((prev) =>
      prev.classList.contains("crossed")
    );

    if (!cell.classList.contains("crossed") && allPreviousCrossed) {
      cell.classList.add("crossed");

      // Send the update to the server
      sendGameStateUpdate({
        color: cell.parentNode.id, // Assuming parent row ID is the color
        number: parseInt(cell.textContent),
      });
    } else {
      alert("You must cross numbers from left to right!");
    }
  };
});
