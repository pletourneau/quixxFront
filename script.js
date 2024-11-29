// Connect to the WebSocket server
const ws = new WebSocket("wss://quixxback.onrender.com");

ws.onopen = () => {
  console.log("WebSocket connection established!");
};

// Join a room by sending the passcode and player name
function joinRoom(passcode, playerName) {
  ws.send(JSON.stringify({ type: "joinRoom", passcode, playerName }));
}

// Listen for updates from the server
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "roomStatus") {
    console.log(`Room ${data.room} was ${data.status}`);
    alert(`You have ${data.status} the room: ${data.room}`);
    toggleScreens(); // Switch screens and generate the game board
  } else if (data.diceValues || data.scoreSheets) {
    console.log("Received updated game state:", data);
    updateGameUI(data);
  }
};

// Toggle between the Join Game and Game screens
function toggleScreens() {
  document.getElementById("join-game-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";
  generateScoreRows(); // Ensure score rows are generated after toggling
}

// Join a game when the passcode and player name are submitted
function joinGame() {
  const passcode = document.getElementById("passcode").value;
  const playerName = document.getElementById("player-name").value;

  if (passcode && playerName) {
    joinRoom(passcode, playerName);
    console.log(
      `Joining room with passcode: ${passcode} as player: ${playerName}`
    );
  } else {
    alert("Enter both a passcode and your name to join the game.");
  }
}

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

// Update the UI with the shared game state
function updateGameUI(gameState) {
  // Update dice values
  for (const dice in gameState.diceValues) {
    document.getElementById(dice).textContent =
      gameState.diceValues[dice] || "🎲";
  }

  // Update score sheets
  const scoreSheets = gameState.scoreSheets;
  if (scoreSheets) {
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

// Generate the score rows
function generateScoreRows() {
  const rowsConfig = {
    red: { start: 2, end: 12, lock: "12" },
    yellow: { start: 2, end: 12, lock: "12" },
    green: { start: 12, end: 2, lock: "2" },
    blue: { start: 12, end: 2, lock: "2" },
  };

  Object.keys(rowsConfig).forEach((color) => {
    const row = document.getElementById(`${color}-row`);
    const { start, end, lock } = rowsConfig[color];
    const step = start < end ? 1 : -1;

    for (let i = start; i !== end + step; i += step) {
      const cell = document.createElement("div");
      cell.textContent = i;
      cell.className = "score-cell";
      cell.onclick = () => {
        if (!cell.classList.contains("crossed")) {
          cell.classList.add("crossed");
          markNumber(color, i);
        }
      };
      row.appendChild(cell);
    }

    // Add lock column
    const lockCell = document.createElement("div");
    lockCell.textContent = lock;
    lockCell.className = "score-cell final-cell";
    row.appendChild(lockCell);
  });

  console.log("Score rows generated");
}

// Mark a number on the score sheet
function markNumber(color, number) {
  sendAction("markNumber", { color, number });
}

// End the current turn
function endTurn() {
  sendAction("endTurn", {});
}
