// Connect to the WebSocket server
const ws = new WebSocket("wss://quixxback.onrender.com");

ws.onopen = () => {
  console.log("WebSocket connection established!");
};

// Join a room by sending the passcode
function joinRoom(passcode) {
  ws.send(JSON.stringify({ type: "joinRoom", passcode }));
}

// Listen for updates from the server
ws.onmessage = (event) => {
  const gameState = JSON.parse(event.data);
  console.log("Received updated game state:", gameState);

  // Update the UI with the new game state
  updateGameUI(gameState);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = (event) => {
  console.warn("WebSocket connection closed:", event);
};

// Send an action to the server
function sendAction(type, payload) {
  const message = { type, ...payload };
  ws.send(JSON.stringify(message));
}

// Roll dice action
function rollDice() {
  const diceValues = {
    white1: Math.floor(Math.random() * 6) + 1,
    white2: Math.floor(Math.random() * 6) + 1,
    red: Math.floor(Math.random() * 6) + 1,
    yellow: Math.floor(Math.random() * 6) + 1,
    green: Math.floor(Math.random() * 6) + 1,
    blue: Math.floor(Math.random() * 6) + 1,
  };

  sendAction("rollDice", { diceValues });
}

// Example function to join a game
function joinGame() {
  const passcode = document.getElementById("passcode").value;
  if (passcode) {
    joinRoom(passcode);
    console.log(`Joined room with passcode: ${passcode}`);
  } else {
    alert("Please enter a passcode to join a game.");
  }
}

// Update the UI with the shared game state
function updateGameUI(gameState) {
  // Update dice values
  for (const dice in gameState.diceValues) {
    document.getElementById(dice).textContent =
      gameState.diceValues[dice] || "🎲";
  }

  // Example logic to update score rows
  const scoreSheets = gameState.scoreSheets; // Assuming an object of player scores
  if (scoreSheets) {
    console.log("Score sheets:", scoreSheets);
    // Update the score sheet rows as needed
  }
}
