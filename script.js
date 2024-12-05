// Connect to the WebSocket server
const ws = new WebSocket("wss://quixxback.onrender.com");

let gameState = null;

ws.onopen = () => {
  console.log("WebSocket connection established!");
};

// Cache for player boards
let playerBoardCache = {};
let isRoomCreator = false;
let currentRoom = ""; // Track the current room name
const options = [];

// Join a room by sending the passcode and player name
function joinRoom(passcode, playerName) {
  ws.send(JSON.stringify({ type: "joinRoom", passcode, playerName }));
}

function startGame() {
  if (isRoomCreator) {
    const players = Array.from(
      document.querySelectorAll("#player-info .player")
    ).map((el) => el.textContent);

    shuffle(players); // Shuffle the players to create a random turn order

    // Update turn order on the server and broadcast to players
    sendAction("startGame", { turnOrder: players });

    // Display turn order on the screen
    updateTurnOrder(players);
  } else {
    alert("Only the host can start the game.");
  }
}

// Update the turn order display
function updateTurnOrder(turnOrder) {
  const turnOrderElement = document.getElementById("turn-order");
  turnOrderElement.innerHTML = "<h3>Turn Order:</h3>";
  turnOrder.forEach((playerName, index) => {
    const div = document.createElement("div");
    div.textContent = `${index + 1}. ${playerName}`;
    if (index === 0) {
      div.classList.add("active-player"); // Highlight the active player
    }
    turnOrderElement.appendChild(div);
  });
}

// Listen for updates from the server
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "gameState") {
    updateGameUI(data); // Update UI based on the latest game state
  } else if (data.type === "error") {
    alert(data.message); // Handle errors from the server
  } else if (data.type === "roomStatus") {
    console.log(`Room ${data.room} was ${data.status}`);
    alert(`You have ${data.status} the room: ${data.room}`);
    currentRoom = data.room;
    showGameScreen(); // Ensure the game screen is visible
  } else if (data.type === "newGame") {
    isRoomCreator = true;
    currentRoom = data.room;
    console.log("Player is the room creator: ", isRoomCreator);
    document.getElementById("start-game").style.display = "block"; // Show Start Game button
    document.getElementById("room-name").textContent = `Room: ${currentRoom}`;
  } else if (data.type === "error") {
    console.error(data.message);
    alert(data.message);
  }
};

// UI Helpers
function showGameScreen() {
  console.log("Attempting to show game screen...");
  const joinScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");

  if (joinScreen) joinScreen.style.display = "none";
  if (gameScreen) gameScreen.style.display = "block";

  // Generate score rows (game board) if not already generated
  if (document.getElementById("red-row").children.length === 0) {
    generateScoreRows();
  }
}

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
    if (row) {
      row.innerHTML = ""; // Clear existing rows before re-generating

      const { start, end, lock } = rowsConfig[color];
      const step = start < end ? 1 : -1;

      for (let i = start; i !== end + step; i += step) {
        const cell = document.createElement("div");
        cell.textContent = i;
        cell.className = "score-cell";
        row.appendChild(cell);
      }

      // Add lock column
      const lockCell = document.createElement("div");
      lockCell.textContent = lock;
      lockCell.className = "score-cell final-cell";
      row.appendChild(lockCell);
    }
  });

  console.log("Score rows generated");
}

// REMOVE THIS DUPLICATE rollDice FUNCTION BLOCK THAT RANDOMLY GENERATES DICE
// The server now handles rolling dice and broadcasting results,
// so we only need the version that sends the action to the server.
/*
function rollDice() {
  // This version of rollDice that locally generates dice should be removed.
  // It's conflicting with the server-based logic. 
}
*/

// Keep only the server-based rollDice function
function rollDice() {
  const currentPlayerName = document.getElementById("player-name").value;
  if (
    gameState &&
    gameState.turnOrder &&
    gameState.turnOrder[gameState.activePlayerIndex] === currentPlayerName
  ) {
    sendAction("rollDice"); // Notify server to roll dice
  } else {
    alert("It's not your turn to roll the dice.");
  }
}

function calculateMarkingOptions(diceValues, isActivePlayer) {
  const optionsContainer = document.getElementById("marking-options-list");
  optionsContainer.innerHTML = ""; // Clear previous options

  // Create the sum of white dice option (available for everyone)
  const sumWhiteDice = diceValues.white1 + diceValues.white2;
  const whiteOption = createOptionElement(sumWhiteDice, "white");
  optionsContainer.appendChild(whiteOption);

  if (isActivePlayer) {
    // Create options for the active player: sum of one white die and each colored die
    const whiteAndColorSums = [
      { color: "red", value: diceValues.white1 + diceValues.red },
      { color: "red", value: diceValues.white2 + diceValues.red },
      { color: "yellow", value: diceValues.white1 + diceValues.yellow },
      { color: "yellow", value: diceValues.white2 + diceValues.yellow },
      { color: "green", value: diceValues.white1 + diceValues.green },
      { color: "green", value: diceValues.white2 + diceValues.green },
      { color: "blue", value: diceValues.white1 + diceValues.blue },
      { color: "blue", value: diceValues.white2 + diceValues.blue },
    ];

    whiteAndColorSums.forEach(({ color, value }) => {
      const colorOption = createOptionElement(value, color);
      optionsContainer.appendChild(colorOption);
    });
  }
}

// Helper to create colored square option elements
function createOptionElement(value, color) {
  const option = document.createElement("div");
  option.className = `dice ${color}`;
  option.textContent = value;
  option.style.margin = "5px";
  option.style.display = "inline-block";
  return option;
}

// Display the options in the UI
const optionsList = document.getElementById("marking-options-list");
optionsList.innerHTML = "";
options.forEach((option) => {
  const li = document.createElement("li");
  li.textContent = option;
  optionsList.appendChild(li);
});

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Update the UI with the shared game state
function updateGameUI(newState) {
  gameState = newState;

  // Get currentPlayerName at the start, before using it
  const currentPlayerName = document.getElementById("player-name").value;

  // Update the dice display if diceValues are present
  if (gameState.diceValues) {
    Object.entries(gameState.diceValues).forEach(([dice, value]) => {
      const diceElement = document.getElementById(dice);
      if (diceElement) {
        diceElement.textContent = value;
      }
    });
  }

  // Update player list
  const playerInfo = document.getElementById("player-info");
  if (gameState.players) {
    playerInfo.innerHTML = `<h3>Players in the Room:</h3>`;
    gameState.players.forEach((player) => {
      const playerElement = document.createElement("div");
      playerElement.classList.add("player");
      playerElement.textContent = player.name;

      // Check if turnEndedBy exists and if player is included
      if (
        gameState.turnEndedBy &&
        gameState.turnEndedBy.includes(player.name)
      ) {
        playerElement.style.textDecoration = "line-through";
      }

      playerInfo.appendChild(playerElement);
    });
  }

  // Update turn order
  const turnOrderElement = document.getElementById("turn-order");
  if (gameState.turnOrder) {
    turnOrderElement.innerHTML = `<h3>Turn Order:</h3>`;
    gameState.turnOrder.forEach((playerName, index) => {
      const playerElement = document.createElement("div");
      playerElement.textContent = `${index + 1}. ${playerName}`;

      // Highlight the active player
      if (index === gameState.activePlayerIndex) {
        playerElement.classList.add("active-player");
      }

      turnOrderElement.appendChild(playerElement);
    });
  }

  // Update buttons
  const rollDiceButton = document.querySelector("button[onclick='rollDice()']");
  if (rollDiceButton) {
    rollDiceButton.disabled =
      gameState.turnOrder[gameState.activePlayerIndex] !== currentPlayerName;
  }

  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    // Check if started and turnEndedBy exist before using them
    const hasEndedTurn =
      (gameState.turnEndedBy &&
        gameState.turnEndedBy.includes(currentPlayerName)) ||
      false;
    if (
      gameState.turnOrder[gameState.activePlayerIndex] === currentPlayerName &&
      gameState.started &&
      !hasEndedTurn
    ) {
      endTurnButton.disabled = false; // Enable if the player hasn't ended their turn
    } else {
      endTurnButton.disabled = true; // Disable otherwise
    }
  }
}

function endTurn() {
  const currentPlayerName = document.getElementById("player-name").value;

  // Notify the server that the player has ended their turn
  sendAction("endTurn", { playerName: currentPlayerName });

  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    endTurnButton.disabled = true;
  }

  alert("You have ended your turn!");
}
