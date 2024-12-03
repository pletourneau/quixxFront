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
      showGameScreen(); // Show the game screen when the game starts
      updateGameUI(data); // Populate the board with the game state
    } else if (isRoomCreator) {
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
  alert(`Dice rolled! Use these values for marking.`);
}

// Gameplay rules: Check if a number can be marked based on the left-to-right rule
function canMarkNumber(color, number, markedSpaces) {
  const markedInRow = markedSpaces.filter((space) => space.color === color);
  const maxMarkedNumber = markedInRow.length
    ? Math.max(...markedInRow.map((space) => space.number))
    : -Infinity;

  return number > maxMarkedNumber; // Number must be greater than any previously marked number in the row
}

// Mark a number on the score sheet
function markNumber(color, number, diceValues) {
  if (!isTurnActive && diceValues === undefined) {
    alert(
      "It is not your turn! You can only mark the sum of the two white dice."
    );
    return;
  }

  if (isTurnActive) {
    if (!hasRolledDice) {
      alert("You must roll the dice before marking a number.");
      return;
    }

    if (markedSpaces.length === 0) {
      const sumWhiteDice = diceValues.white1 + diceValues.white2;
      if (number !== sumWhiteDice) {
        alert(
          `First number must be the sum of both white dice: ${sumWhiteDice}`
        );
        return;
      }
    } else if (markedSpaces.length === 1) {
      const validNumbers = [
        diceValues.white1 + diceValues[color],
        diceValues.white2 + diceValues[color],
      ];
      if (!validNumbers.includes(number)) {
        alert(
          "Second number must be valid using one white die and a color die."
        );
        return;
      }
    } else {
      alert("You can only mark up to 2 spaces per turn.");
      return;
    }
  } else {
    const sumWhiteDice = diceValues.white1 + diceValues.white2;
    if (number !== sumWhiteDice) {
      alert("You can only mark the sum of both white dice.");
      return;
    }
  }

  if (!canMarkNumber(color, number, markedSpaces)) {
    alert(`You cannot mark ${number} because of the left-to-right rule.`);
    return;
  }

  markedSpaces.push({ color, number });
  sendAction("markNumber", { color, number, markedSpaces });
}

// End the current turn
function endTurn() {
  if (isTurnActive) {
    if (markedSpaces.length === 0) {
      alert("You didn't mark any numbers. A penalty will be applied.");
      sendAction("penalty", {});
    }

    isTurnActive = false;
    hasRolledDice = false;
    markedSpaces = [];
    alert("Your turn has ended. Waiting for the next player...");
    sendAction("endTurn", {});
  } else {
    alert("It is not your turn!");
  }
}

// Update the UI with the shared game state
function updateGameUI(gameState) {
  // Update player list
  const playerInfo = document.getElementById("player-info");
  if (gameState.players) {
    playerInfo.innerHTML = `<h3>Players in the Room:</h3>`;
    gameState.players.forEach((player, index) => {
      const playerElement = document.createElement("div");
      playerElement.textContent = player.name;
      playerElement.classList.add("player");

      // Highlight the current player if they are the active player
      if (gameState.activePlayerIndex === index) {
        playerElement.classList.add("active-player");

        const currentPlayerName = document.getElementById("player-name").value;
        if (player.name === currentPlayerName) {
          isTurnActive = true; // Enable actions for the active player
          alert("It's your turn! Roll the dice to start.");

          // Load their marked spaces into the local array (for continuity)
          markedSpaces = player.markedSpaces || [];
        }
      }
      playerInfo.appendChild(playerElement);
    });
  }

  // Update the score rows with marked spaces
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

  // Update dice values
  for (const dice in gameState.diceValues) {
    const diceElement = document.getElementById(dice);
    if (diceElement) {
      diceElement.textContent = gameState.diceValues[dice] || "🎲";
    }
  }
}

// Update other players' boards
const otherBoardsContainer = document.getElementById("other-boards-container");

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

  // Add the new marked space
  markedSpaces.push({ color, number });

  // Send the updated list of marked spaces to the server
  sendAction("markNumber", { color, number, markedSpaces });
}

// End the current turn
function endTurn() {
  // Reset turn state
  isTurnActive = false;
  hasRolledDice = false;
  sendAction("endTurn", {});
  alert("Your turn has ended. Waiting for the next player...");
}
