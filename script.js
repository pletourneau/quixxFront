// Connect to the WebSocket server
const ws = new WebSocket("wss://quixxback.onrender.com");

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
    showGameScreen(); // Ensure the game screen is visible
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
      showGameScreen(); // Display the game board
    }
  } else if (data.type === "error") {
    alert(data.message);
  }
};

// UI Helpers
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

function rollDice() {
  // Randomly generate dice values
  const diceValues = {
    white1: Math.floor(Math.random() * 6) + 1,
    white2: Math.floor(Math.random() * 6) + 1,
    red: Math.floor(Math.random() * 6) + 1,
    yellow: Math.floor(Math.random() * 6) + 1,
    green: Math.floor(Math.random() * 6) + 1,
    blue: Math.floor(Math.random() * 6) + 1,
  };

  // Display the dice values on the screen
  for (const dice in diceValues) {
    const diceElement = document.getElementById(dice);
    if (diceElement) {
      diceElement.textContent = diceValues[dice];
    }
  }

  // Determine if the player is the active player
  const isActivePlayer = true; // Replace with actual logic to check active player

  // Calculate and display marking options
  calculateMarkingOptions(diceValues, isActivePlayer);

  // Notify the server about the dice roll
  sendAction("rollDice", diceValues);
  console.log("Dice rolled:", diceValues);
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

    // Add the sequence for marking both numbers (first sum + second sum)
    // const firstMarkOption = document.createElement("div");
    // firstMarkOption.textContent = `First mark: ${sumWhiteDice}, then choose a second option.`;
    // firstMarkOption.style.marginTop = "10px";
    // optionsContainer.appendChild(firstMarkOption);
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
optionsList.innerHTML = ""; // Clear previous options
options.forEach((option) => {
  const li = document.createElement("li");
  li.textContent = option;
  optionsList.appendChild(li);
});
