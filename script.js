const ws = new WebSocket("wss://quixxback.onrender.com");

let gameState = null;
let isRoomCreator = false;
let currentRoom = "";
let pendingMarks = [];

function joinRoom(passcode, playerName) {
  ws.send(JSON.stringify({ type: "joinRoom", passcode, playerName }));
}

ws.onopen = () => {
  console.log("WebSocket connection established!");
  generateScoreRows();
  generatePenaltyBoxes();
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
    // Re-enable End Turn button on error
    const endTurnButton = document.querySelector("button[onclick='endTurn()']");
    if (endTurnButton) {
      endTurnButton.disabled = false;
    }
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

function sendAction(type, payload = {}) {
  const message = { type, ...payload };
  ws.send(JSON.stringify(message));
}

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
        cell.addEventListener("click", () => toggleMarkCell(cell, color, num));
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

function generatePenaltyBoxes() {
  const penaltiesContainer = document.getElementById("penalties-container");
  penaltiesContainer.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const box = document.createElement("div");
    box.className = "penalty-box";
    penaltiesContainer.appendChild(box);
  }
}

function toggleMarkCell(cell, color, number) {
  if (!gameState || !gameState.diceRolledThisTurn) {
    alert("You cannot mark before dice are rolled this turn.");
    return;
  }

  const index = pendingMarks.findIndex(
    (m) => m.color === color && m.number === number
  );
  if (index === -1) {
    pendingMarks.push({ color, number });
    cell.classList.add("pending");
  } else {
    pendingMarks.splice(index, 1);
    cell.classList.remove("pending");
  }
}

function rollDice() {
  const currentPlayerName = document.getElementById("player-name").value;
  if (
    gameState &&
    gameState.turnOrder &&
    gameState.turnOrder[gameState.activePlayerIndex] === currentPlayerName
  ) {
    if (gameState.diceRolledThisTurn) {
      alert("Dice have already been rolled this turn.");
      return;
    }
    sendAction("rollDice");
  } else {
    alert("It's not your turn to roll the dice.");
  }
}

function endTurn() {
  const currentPlayerName = document.getElementById("player-name").value;
  sendAction("endTurn", { playerName: currentPlayerName, marks: pendingMarks });

  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    endTurnButton.disabled = true;
  }
  alert("Ending turn...");
}

function calculateMarkingOptions(diceValues, isActivePlayer) {
  const optionsContainer = document.getElementById("marking-options-list");
  if (!optionsContainer) return;

  optionsContainer.innerHTML = "";

  const whiteSum = diceValues.white1 + diceValues.white2;

  const whiteOption = createOptionElement(whiteSum, "white");
  optionsContainer.appendChild(whiteOption);

  if (isActivePlayer) {
    const whiteAndColorSums = [];
    if (diceValues.red !== undefined) {
      whiteAndColorSums.push(
        { color: "red", value: diceValues.white1 + diceValues.red },
        { color: "red", value: diceValues.white2 + diceValues.red }
      );
    }
    if (diceValues.yellow !== undefined) {
      whiteAndColorSums.push(
        { color: "yellow", value: diceValues.white1 + diceValues.yellow },
        { color: "yellow", value: diceValues.white2 + diceValues.yellow }
      );
    }
    if (diceValues.green !== undefined) {
      whiteAndColorSums.push(
        { color: "green", value: diceValues.white1 + diceValues.green },
        { color: "green", value: diceValues.white2 + diceValues.green }
      );
    }
    if (diceValues.blue !== undefined) {
      whiteAndColorSums.push(
        { color: "blue", value: diceValues.white1 + diceValues.blue },
        { color: "blue", value: diceValues.white2 + diceValues.blue }
      );
    }

    whiteAndColorSums.forEach(({ color, value }) => {
      const colorOption = createOptionElement(value, color);
      optionsContainer.appendChild(colorOption);
    });
  }
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

function displayScoreboard(scoreboard) {
  const scoreboardDiv = document.getElementById("scoreboard");
  scoreboardDiv.innerHTML = "<h3>Final Scores:</h3>";
  const table = document.createElement("table");
  const header = document.createElement("tr");
  ["Player", "Red", "Yellow", "Green", "Blue", "Penalties", "Total"].forEach(
    (h) => {
      const th = document.createElement("th");
      th.textContent = h;
      header.appendChild(th);
    }
  );
  table.appendChild(header);

  scoreboard.forEach((s) => {
    const row = document.createElement("tr");
    [
      s.player,
      s.redScore,
      s.yellowScore,
      s.greenScore,
      s.blueScore,
      s.penaltiesScore,
      s.totalScore,
    ].forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      row.appendChild(td);
    });
    table.appendChild(row);
  });

  scoreboardDiv.appendChild(table);
  scoreboardDiv.style.display = "block";
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
          cell.classList.remove("crossed", "pending");
          if (boardArray[i]) {
            cell.classList.add("crossed");
          }
        }
      }
    });
  }

  // Clear pending marks if turn changed or game ended
  if (
    gameState.gameOver ||
    (gameState.turnOrder &&
      currentPlayerName &&
      gameState.turnOrder[gameState.activePlayerIndex] !== currentPlayerName)
  ) {
    pendingMarks = [];
    document
      .querySelectorAll(".score-cell.pending")
      .forEach((c) => c.classList.remove("pending"));
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
    if (!gameState.started || gameState.gameOver) {
      rollDiceButton.disabled = true;
    } else {
      rollDiceButton.disabled = !isActivePlayer || gameState.diceRolledThisTurn;
    }
  }

  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    if (!gameState.started || gameState.gameOver) {
      endTurnButton.disabled = true;
    } else {
      const alreadyEnded =
        gameState.turnEndedBy &&
        gameState.turnEndedBy.includes(currentPlayerName);
      endTurnButton.disabled = alreadyEnded;
    }
  }

  // Update marking options
  if (gameState.diceValues && gameState.started && !gameState.gameOver) {
    calculateMarkingOptions(gameState.diceValues, isActivePlayer);
  } else {
    const optionsContainer = document.getElementById("marking-options-list");
    if (optionsContainer) {
      optionsContainer.innerHTML = "";
    }
  }

  // Update penalties
  if (
    gameState.penalties &&
    gameState.penalties[currentPlayerName] !== undefined
  ) {
    const penaltyCount = gameState.penalties[currentPlayerName];
    const penaltiesContainer = document.getElementById("penalties-container");
    if (penaltiesContainer) {
      for (let i = 0; i < 4; i++) {
        const box = penaltiesContainer.children[i];
        if (i < penaltyCount) {
          box.classList.add("crossed");
        } else {
          box.classList.remove("crossed");
        }
      }
    }
  }

  // If game over, show message and scoreboard
  if (gameState.gameOver) {
    document.getElementById("game-over-message").style.display = "block";
    if (gameState.scoreboard) {
      displayScoreboard(gameState.scoreboard);
    }
  }
}
