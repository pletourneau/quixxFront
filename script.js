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
    showGameScreen(); // Ensure the game screen (score rows) is visible
  } else if (data.type === "newGame") {
    console.log("New game created for room:", data.room);
    showGameScreen(); // Show the game screen for a new game
  } else if (data.diceValues || data.scoreSheets || data.players) {
    console.log("Received updated game state:", data);
    updateGameUI(data); // Update the game board (score rows)
  }
};

// Show the game screen and generate the score rows
function showGameScreen() {
  const joinScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");

  if (joinScreen) joinScreen.style.display = "none";
  if (gameScreen) gameScreen.style.display = "block";

  // Generate score rows (game board) if not already generated
  if (document.getElementById("red-row").children.length === 0) {
    generateScoreRows();
  }
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
    const diceElement = document.getElementById(dice);
    if (diceElement) {
      diceElement.textContent = gameState.diceValues[dice] || "🎲";
    }
  }

  // Update other players' boards
  const otherBoardsContainer = document.getElementById(
    "other-boards-container"
  );
  otherBoardsContainer.innerHTML = ""; // Clear existing boards

  const currentPlayerName = document.getElementById("player-name").value;

  gameState.players.forEach((player, index) => {
    if (player.name !== currentPlayerName) {
      const boardContainer = document.createElement("div");
      boardContainer.className = "player-board";
      if (index === 0) boardContainer.classList.add("active");

      const playerNameElement = document.createElement("div");
      playerNameElement.className = "player-name";
      playerNameElement.textContent = player.name;
      boardContainer.appendChild(playerNameElement);

      const colors = ["red", "yellow", "green", "blue"];
      colors.forEach((color) => {
        const row = document.createElement("div");
        row.className = `score-row other-score-row ${color}`;

        for (let i = 2; i <= 12; i++) {
          const cell = document.createElement("div");
          cell.className = "score-cell";
          cell.textContent = i;
          if (player.scoreSheet[color].includes(i)) {
            cell.classList.add("crossed");
          }
          row.appendChild(cell);
        }

        boardContainer.appendChild(row);
      });

      otherBoardsContainer.appendChild(boardContainer);
    }
  });
}

// Generate the score rows (game board)
function generateScoreRows() {
  const rowsConfig = {
    red: { start: 2, end: 12, lock: "LOCK" },
    yellow: { start: 2, end: 12, lock: "LOCK" },
    green: { start: 12, end: 2, lock: "LOCK" },
    blue: { start: 12, end: 2, lock: "LOCK" },
  };

  Object.keys(rowsConfig).forEach((color) => {
    const row = document.getElementById(`${color}-row`);
    row.innerHTML = ""; // Clear existing rows before re-generating

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

// Slider navigation
let currentBoardIndex = 0;

// Show the previous player's board
function showPreviousBoard() {
  const boards = document.querySelectorAll(".player-board");
  if (boards.length === 0) return;

  boards[currentBoardIndex].classList.remove("active");
  currentBoardIndex = (currentBoardIndex - 1 + boards.length) % boards.length;
  boards[currentBoardIndex].classList.add("active");
}

// Show the next player's board
function showNextBoard() {
  const boards = document.querySelectorAll(".player-board");
  if (boards.length === 0) return;

  boards[currentBoardIndex].classList.remove("active");
  currentBoardIndex = (currentBoardIndex + 1) % boards.length;
  boards[currentBoardIndex].classList.add("active");
}
