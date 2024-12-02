// script.js - Client-Side JavaScript

// Connect to the WebSocket server
const ws = new WebSocket("wss://quixxback.onrender.com");

ws.onopen = () => {
  console.log("WebSocket connection established!");
};

// Cache for player boards
let playerBoardCache = {};

// Track if the current player is the room creator
let isRoomCreator = false;

// Join a room by sending the passcode and player name
function joinRoom(passcode, playerName) {
  ws.send(JSON.stringify({ type: "joinRoom", passcode, playerName }));
}

// Start the game
function startGame() {
  sendAction("startGame", {});
}

// Listen for updates from the server
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "roomStatus") {
    console.log(`Room ${data.room} was ${data.status}`);
    alert(`You have ${data.status} the room: ${data.room}`);
    showGameScreen(); // Ensure the game screen (score rows) is visible
  } else if (data.type === "newGame") {
    // The current player is the creator of the room
    isRoomCreator = true;
    // Show the "Start Game" button for the room creator
    document.getElementById("start-game").style.display = "block";
  } else if (data.type === "gameState") {
    console.log("Received game state:", data);

    if (data.started) {
      document.getElementById("start-game").style.display = "none";
      showGameScreen(); // Show the game screen when the game starts
      updateGameUI(data); // Populate the board with the game state
    } else if (isRoomCreator) {
      // If the player is the room creator, keep the button visible until the game starts
      document.getElementById("start-game").style.display = "block";
    } else {
      alert("Waiting for the game to start...");
    }
  } else if (data.type === "error") {
    alert(data.message);
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
function sendAction(type, payload = {}) {
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
  // Update player list
  const playerInfo = document.getElementById("player-info");
  if (gameState.players) {
    playerInfo.innerHTML = `<h3>Players in the Room:</h3>`;
    gameState.players.forEach((player) => {
      const playerElement = document.createElement("div");
      playerElement.textContent = player;
      playerInfo.appendChild(playerElement);
    });
  }

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

  // Cache player data for consistency
  if (gameState.players && gameState.scoreSheets) {
    gameState.players.forEach((player) => {
      if (player in gameState.scoreSheets) {
        playerBoardCache[player] = gameState.scoreSheets[player];
      }
    });
  }

  // Clear the container only if new players exist or boards need regeneration
  otherBoardsContainer.innerHTML = "";

  const currentPlayerName = document.getElementById("player-name").value;

  Object.keys(playerBoardCache).forEach((player) => {
    if (player !== currentPlayerName) {
      const boardContainer = document.createElement("div");
      boardContainer.className = "player-board";

      const playerNameElement = document.createElement("div");
      playerNameElement.className = "player-name";
      playerNameElement.textContent = player;
      boardContainer.appendChild(playerNameElement);

      const colors = ["red", "yellow", "green", "blue"];
      colors.forEach((color) => {
        const row = document.createElement("div");
        row.className = `score-row other-score-row ${color}`;

        for (let i = 2; i <= 12; i++) {
          const cell = document.createElement("div");
          cell.className = "score-cell";
          cell.textContent = i;

          if (
            playerBoardCache[player][color] &&
            playerBoardCache[player][color].includes(i)
          ) {
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

// Slider logic for other players' boards
let currentBoardIndex = 0;

function showNextBoard() {
  const boards = document.querySelectorAll(".player-board");
  if (boards.length > 0) {
    boards[currentBoardIndex].classList.remove("active");
    currentBoardIndex = (currentBoardIndex + 1) % boards.length;
    boards[currentBoardIndex].classList.add("active");
  }
}

function showPreviousBoard() {
  const boards = document.querySelectorAll(".player-board");
  if (boards.length > 0) {
    boards[currentBoardIndex].classList.remove("active");
    currentBoardIndex = (currentBoardIndex - 1 + boards.length) % boards.length;
    boards[currentBoardIndex].classList.add("active");
  }
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
