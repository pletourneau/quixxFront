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
  const data = JSON.parse(event.data);

  if (data.type === "roomStatus") {
    // Handle room creation or joining confirmation
    console.log(`Room ${data.room} was ${data.status}`);
    alert(`You have ${data.status} the room: ${data.room}`);
  } else {
    // Update the UI with the game state
    console.log("Received updated game state:", data);
    updateGameUI(data);
  }
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

// Join a game when the passcode is submitted
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

  // Update score sheets
  const scoreSheets = gameState.scoreSheets; // Assuming an object of player scores
  if (scoreSheets) {
    console.log("Score sheets:", scoreSheets);
    Object.keys(scoreSheets).forEach((playerId) => {
      const playerScores = scoreSheets[playerId];
      Object.keys(playerScores).forEach((color) => {
        const row = document.getElementById(`${color}-row`);
        row.querySelectorAll(".score-cell").forEach((cell, index) => {
          if (playerScores[color].includes(index + 2)) {
            cell.classList.add("crossed");
          }
        });
      });
    });
  }
}
