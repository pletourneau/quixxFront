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
    console.log(`Room ${data.room} was ${data.status}`);
    alert(`You have ${data.status} the room: ${data.room}`);
    toggleScreens();
  } else if (data.diceValues) {
    console.log("Received updated game state:", data);
    updateGameUI(data);
  }
};

// Toggle between the Join Game and Game screens
function toggleScreens() {
  document.getElementById("join-game-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";
  generateScoreRows();
}

// Join a game when the passcode is submitted
function joinGame() {
  const passcode = document.getElementById("passcode").value;
  if (passcode) {
    joinRoom(passcode);
    console.log(`Joining room with passcode: ${passcode}`);
  } else {
    alert("Please enter a passcode to join a game.");
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
  for (const dice in gameState.diceValues) {
    document.getElementById(dice).textContent =
      gameState.diceValues[dice] || "🎲";
  }

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
    red: { start: 1, end: 12, lock: "lock" },
    yellow: { start: 1, end: 12, lock: "lock" },
    green: { start: 12, end: 1, lock: "lock" },
    blue: { start: 12, end: 1, lock: "lock" },
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
        }
      };
      row.appendChild(cell);
    }

    // Add lock column
    const lockCell = document.createElement("div");
    lockCell.textContent = lock;
    lockCell.className = "score-cell lock";
    lockCell.onclick = () => {
      if (!lockCell.classList.contains("crossed")) {
        lockCell.classList.add("crossed");
      }
    };
    row.appendChild(lockCell);
  });

  console.log("Score rows generated");
}
