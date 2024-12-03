// Connect to the WebSocket server
const ws = new WebSocket("wss://quixxback.onrender.com");

ws.onopen = () => {
  console.log("WebSocket connection established!");
};

// Cache for player boards
let playerBoardCache = {};

// Track if the current player is the room creator
let isRoomCreator = false;
let currentRoom = ""; // Track the current room name
let hasRolledDice = false;
let markedSpaces = [];
let isTurnActive = false;

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
    currentRoom = data.room;
    showGameScreen(); // Ensure the game screen (score rows) is visible
  } else if (data.type === "newGame") {
    isRoomCreator = true;
    currentRoom = data.room;
    console.log("Player is the room creator: ", isRoomCreator);
    document.getElementById("start-game").style.display = "block";
    document.getElementById("room-name").textContent = `Room: ${currentRoom}`;
  } else if (data.type === "gameState") {
    console.log("Received game state:", data);

    if (data.started) {
      document.getElementById("start-game").style.display = "none";
      showGameScreen();
      updateGameUI(data);
    } else if (isRoomCreator) {
      document.getElementById("start-game").style.display = "block";
    } else {
      alert("Waiting for the game to start...");
    }
  } else if (data.type === "error") {
    alert(data.message);
  } else if (data.diceValues || data.scoreSheets || data.players) {
    console.log("Received updated game state:", data);
    updateGameUI(data);
  }
};

// Show the game screen and generate the score rows
function showGameScreen() {
  const joinScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");

  if (joinScreen) joinScreen.style.display = "none";
  if (gameScreen) gameScreen.style.display = "block";

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
  if (!isTurnActive) {
    alert("It is not your turn!");
    return;
  }

  if (hasRolledDice) {
    alert("You can only roll the dice once per turn.");
    return;
  }

  const diceValues = {
    white1: Math.floor(Math.random() * 6) + 1,
    white2: Math.floor(Math.random() * 6) + 1,
    red: Math.floor(Math.random() * 6) + 1,
    yellow: Math.floor(Math.random() * 6) + 1,
    green: Math.floor(Math.random() * 6) + 1,
    blue: Math.floor(Math.random() * 6) + 1,
  };

  sendAction("rollDice", { diceValues });
  hasRolledDice = true;
}

// Update the UI with the shared game state
function updateGameUI(gameState) {
  const playerInfo = document.getElementById("player-info");
  if (gameState.players) {
    playerInfo.innerHTML = `<h3>Players in the Room:</h3>`;
    gameState.players.forEach((player, index) => {
      const playerElement = document.createElement("div");
      playerElement.textContent = player.name;
      playerElement.classList.add("player");

      if (gameState.activePlayerIndex === index) {
        playerElement.classList.add("active-player");
        const currentPlayerName = document.getElementById("player-name").value;

        if (player.name === currentPlayerName) {
          isTurnActive = true;
          alert("It's your turn! Roll the dice to start.");
          markedSpaces = player.markedSpaces || [];
        }
      }
      playerInfo.appendChild(playerElement);
    });
  }

  const colors = ["red", "yellow", "green", "blue"];
  colors.forEach((color) => {
    const row = document.getElementById(`${color}-row`);
    row.childNodes.forEach((cell) => {
      const number = parseInt(cell.textContent, 10);
      if (
        gameState.players.some((player) =>
          player.markedSpaces.some(
            (space) => space.color === color && space.number === number
          )
        )
      ) {
        cell.classList.add("crossed");
      }
    });
  });

  for (const dice in gameState.diceValues) {
    const diceElement = document.getElementById(dice);
    if (diceElement) {
      diceElement.textContent = gameState.diceValues[dice] || "🎲";
    }
  }
}

// Generate score rows
function generateScoreRows() {
  const rowsConfig = {
    red: { start: 2, end: 12, lock: "LOCK" },
    yellow: { start: 2, end: 12, lock: "LOCK" },
    green: { start: 12, end: 2, lock: "LOCK" },
    blue: { start: 12, end: 2, lock: "LOCK" },
  };

  Object.keys(rowsConfig).forEach((color) => {
    const row = document.getElementById(`${color}-row`);
    row.innerHTML = "";

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

    const lockCell = document.createElement("div");
    lockCell.textContent = lock;
    lockCell.className = "score-cell final-cell";
    row.appendChild(lockCell);
  });

  console.log("Score rows generated");
}

// Mark a number on the score sheet
function markNumber(color, number) {
  if (!isTurnActive) {
    alert("It is not your turn!");
    return;
  }

  if (
    markedSpaces.some(
      (space) => space.color === color && space.number === number
    )
  ) {
    alert("You have already marked this space.");
    return;
  }

  markedSpaces.push({ color, number });
  sendAction("markNumber", { color, number, markedSpaces });
}

// End the current turn
function endTurn() {
  isTurnActive = false;
  hasRolledDice = false;
  sendAction("endTurn", {});
  alert("Your turn has ended. Waiting for the next player...");
}
