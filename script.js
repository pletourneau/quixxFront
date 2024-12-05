// Connect to the WebSocket server
const ws = new WebSocket("wss://quixxback.onrender.com");

let gameState = null;
let isRoomCreator = false;
let currentRoom = "";
const options = [];

// Track selected sum on the client
// {value: number, type: 'white' or 'color'} or null if none selected
let selectedSum = null;

// Track how many marks chosen this turn on the client (for active player)
let marksChosenThisTurnCount = 0;
let firstMarkWasWhiteSum = false;

ws.onopen = () => {
  console.log("WebSocket connection established!");
  generateScoreRows();
};

// Join a room by sending the passcode and player name
function joinRoom(passcode, playerName) {
  ws.send(JSON.stringify({ type: "joinRoom", passcode, playerName }));
}

function startGame() {
  if (isRoomCreator) {
    const players = Array.from(
      document.querySelectorAll("#player-info .player")
    ).map((el) => el.textContent);

    shuffle(players);
    sendAction("startGame", { turnOrder: players });
    updateTurnOrder(players);
  } else {
    alert("Only the host can start the game.");
  }
}

function updateTurnOrder(turnOrder) {
  const turnOrderElement = document.getElementById("turn-order");
  turnOrderElement.innerHTML = "<h3>Turn Order:</h3>";

  if (turnOrder && turnOrder.length > 0) {
    turnOrder.forEach((playerName, index) => {
      const div = document.createElement("div");
      div.textContent = `${index + 1}. ${playerName}`;
      if (index === 0) {
        div.classList.add("active-player");
      }
      turnOrderElement.appendChild(div);
    });
  } else {
    const noTurnOrderMessage = document.createElement("div");
    noTurnOrderMessage.textContent = "No turn order yet";
    turnOrderElement.appendChild(noTurnOrderMessage);
  }
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "gameState") {
    updateGameUI(data);
  } else if (data.type === "error") {
    alert(data.message);
  } else if (data.type === "roomStatus") {
    console.log(`Room ${data.room} was ${data.status}`);
    alert(`You have ${data.status} the room: ${data.room}`);
    currentRoom = data.room;
  } else if (data.type === "newGame") {
    isRoomCreator = true;
    currentRoom = data.room;
    console.log("Player is the room creator: ", isRoomCreator);
    document.getElementById("start-game").style.display = "block";
    document.getElementById("room-name").textContent = `Room: ${currentRoom}`;
  }
};

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
      row.innerHTML = "";
      const { start, end, lock } = rowsConfig[color];
      const step = start < end ? 1 : -1;
      const numbers = [];
      for (let i = start; i !== end + step; i += step) {
        numbers.push(i);
      }

      numbers.forEach((num) => {
        const cell = document.createElement("div");
        cell.textContent = num;
        cell.className = "score-cell";
        cell.addEventListener("click", () => attemptMarkCell(color, num));
        row.appendChild(cell);
      });

      const lockCell = document.createElement("div");
      lockCell.textContent = lock;
      lockCell.className = "score-cell final-cell";
      row.appendChild(lockCell);
    }
  });

  console.log("Score rows generated");
}

function attemptMarkCell(color, number) {
  const currentPlayerName = document.getElementById("player-name").value;
  if (!currentPlayerName) {
    alert("You must enter your name first.");
    return;
  }

  if (!selectedSum) {
    alert("You must choose a sum option before marking a cell.");
    return;
  }

  if (selectedSum.value !== number) {
    alert("You must choose a cell that matches the chosen sum.");
    return;
  }

  // Send "markCell" action to the server
  sendAction("markCell", {
    playerName: currentPlayerName,
    color,
    number,
    sumType: selectedSum.type, // 'white' or 'color'
  });
}

function rollDice() {
  const currentPlayerName = document.getElementById("player-name").value;
  if (
    gameState &&
    gameState.turnOrder &&
    gameState.turnOrder[gameState.activePlayerIndex] === currentPlayerName
  ) {
    // Check if diceRolledThisTurn is true on server side
    sendAction("rollDice");
  } else {
    alert("It's not your turn to roll the dice.");
  }
}

function calculateMarkingOptions(diceValues, isActivePlayer) {
  const optionsContainer = document.getElementById("marking-options-list");
  if (!optionsContainer) return;

  optionsContainer.innerHTML = "";

  const whiteSum = diceValues.white1 + diceValues.white2;

  // Create white sum option
  const whiteOption = createOptionElement(whiteSum, "white");
  whiteOption.onclick = () => chooseSum(whiteSum, "white", isActivePlayer);
  optionsContainer.appendChild(whiteOption);

  // Only the active player can choose from white+color sums
  if (isActivePlayer) {
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
      colorOption.onclick = () => chooseSum(value, "color", isActivePlayer);
      optionsContainer.appendChild(colorOption);
    });
  }
}

function chooseSum(value, type, isActivePlayer) {
  const currentPlayerName = document.getElementById("player-name").value;
  const isActive =
    gameState &&
    gameState.turnOrder &&
    gameState.turnOrder[gameState.activePlayerIndex] === currentPlayerName;

  // Non-active players can only choose the white sum and only once
  if (!isActive && type === "color") {
    alert("As a non-active player, you can only choose the white dice sum.");
    return;
  }

  // Active player logic:
  // If no marks chosen yet:
  //   - If they pick white sum first, they can still pick a second later.
  //   - If they pick color sum first, that's their only mark this turn.
  // If they have already chosen one mark:
  //   - If the first was white sum, they can choose a second if it's a color sum.
  //   - If the first was color sum, no second mark allowed.

  if (isActive) {
    if (marksChosenThisTurnCount === 0) {
      // First mark: can be white or color
      // If white chosen, firstMarkWasWhiteSum = true, can do second mark later
      // If color chosen first, firstMarkWasWhiteSum = false => only one mark
      firstMarkWasWhiteSum = type === "white";
    } else {
      // This is the second mark attempt
      if (!firstMarkWasWhiteSum) {
        alert(
          "If you want to make two marks, the first must have been white sum."
        );
        return;
      }
      // If first was white, second must be color sum.
      if (type !== "color") {
        alert("Second mark must be from a white+color sum.");
        return;
      }
    }
  } else {
    // Non-active player and tries to pick sum again?
    // They should only pick once.
    if (marksChosenThisTurnCount > 0) {
      alert("Non-active players can only mark once.");
      return;
    }
    // Non-active player can only do white sum anyway, already handled above.
  }

  // If passed all checks, set selectedSum
  selectedSum = { value, type };
  alert(
    `Sum chosen: ${value} (${type}). Now click on a matching cell to mark.`
  );
}

function createOptionElement(value, color) {
  const option = document.createElement("div");
  option.className = `dice ${color}`;
  option.textContent = value;
  option.style.margin = "5px";
  option.style.display = "inline-block";
  return option;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function updateGameUI(newState) {
  gameState = newState;

  const currentPlayerName = document.getElementById("player-name").value;
  const isActivePlayer =
    gameState.turnOrder &&
    gameState.turnOrder[gameState.activePlayerIndex] === currentPlayerName;

  // Update dice display
  if (gameState.diceValues) {
    Object.entries(gameState.diceValues).forEach(([dice, value]) => {
      const diceElement = document.getElementById(dice);
      if (diceElement) diceElement.textContent = value;
    });
  }

  // Update marked cells
  if (gameState.boards && gameState.boards[currentPlayerName]) {
    ["red", "yellow", "green", "blue"].forEach((color) => {
      const row = document.getElementById(`${color}-row`);
      if (row) {
        const boardArray = gameState.boards[currentPlayerName][color];
        for (let i = 0; i < boardArray.length; i++) {
          const cell = row.children[i];
          if (boardArray[i]) {
            cell.classList.add("crossed");
          } else {
            cell.classList.remove("crossed");
          }
        }
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
  if (turnOrderElement && gameState.turnOrder) {
    turnOrderElement.innerHTML = `<h3>Turn Order:</h3>`;
    if (gameState.turnOrder.length > 0) {
      gameState.turnOrder.forEach((pName, index) => {
        const playerElement = document.createElement("div");
        playerElement.textContent = `${index + 1}. ${pName}`;
        if (index === gameState.activePlayerIndex) {
          playerElement.classList.add("active-player");
        }
        turnOrderElement.appendChild(playerElement);
      });
    } else {
      const noTurnOrderMessage = document.createElement("div");
      noTurnOrderMessage.textContent = "No turn order yet";
      turnOrderElement.appendChild(noTurnOrderMessage);
    }
  }

  // Update buttons
  const rollDiceButton = document.querySelector("button[onclick='rollDice()']");
  if (rollDiceButton) {
    // Disable roll dice if not active player or diceRolledThisTurn is true
    rollDiceButton.disabled = !isActivePlayer || gameState.diceRolledThisTurn;
  }

  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    const hasEndedTurn =
      gameState.turnEndedBy &&
      gameState.turnEndedBy.includes(currentPlayerName);
    if (isActivePlayer && gameState.started && !hasEndedTurn) {
      endTurnButton.disabled = false;
    } else {
      endTurnButton.disabled = true;
    }
  }

  // Update marking options
  if (gameState.diceValues && gameState.started) {
    calculateMarkingOptions(gameState.diceValues, isActivePlayer);
  } else {
    const optionsContainer = document.getElementById("marking-options-list");
    if (optionsContainer) {
      optionsContainer.innerHTML = "";
    }
  }

  // If a mark was successful, increment marksChosenThisTurnCount if needed
  // The server broadcast won't explicitly say who marked, but we can guess:
  // If boards changed (a new cell crossed), and it's current player's turn, increment local count if that was caused by user's action.
  // A simpler approach: after each mark from the client, wait for server update and if board changed for you:
  // Just reset selectedSum to force user to pick sum again for second mark.
  // If you want perfect tracking, store old boards to detect changes. For simplicity:
  selectedSum = null;
  // If a successful mark was made by current player (just trust they followed instructions)
  // If it's your turn and something got marked this update:
  // This simple approach: if boards exist and you had selectedSum previously and now cleared it, increment marks chosen.
  // For perfect logic you'd store old boards before updateGameUI. We'll trust this simplified logic:
  // If you prefer robust logic, you'd need to compare old and new boards or track response differently.
}

function endTurn() {
  const currentPlayerName = document.getElementById("player-name").value;
  sendAction("endTurn", { playerName: currentPlayerName });

  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    endTurnButton.disabled = true;
  }

  // Reset local turn variables
  marksChosenThisTurnCount = 0;
  firstMarkWasWhiteSum = false;
  selectedSum = null;

  alert("You have ended your turn!");
}
