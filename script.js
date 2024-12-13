const ws = new WebSocket("wss://quixxback.onrender.com");

let gameState = null;
let isRoomCreator = false;
let currentRoom = "";

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
  turnOrderElement.innerHTML =
    "<h3 class='text-xl font-semibold mb-2'>Turn Order:</h3>";

  if (turnOrder && turnOrder.length > 0) {
    turnOrder.forEach((playerName, index) => {
      const div = document.createElement("div");
      div.textContent = `${index + 1}. ${playerName}`;
      if (index === 0) {
        div.classList.add(
          "text-green-700",
          "font-bold",
          "border",
          "border-black",
          "rounded",
          "p-1"
        );
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
  if (ws.readyState === WebSocket.OPEN) {
    const message = { type, ...payload };
    ws.send(JSON.stringify(message));
  } else {
    console.warn("WebSocket not open, cannot send message:", type);
  }
}

function generateScoreRows() {
  const rowsConfig = {
    red: { start: 2, end: 12, lock: "LOCK", bg: "bg-red-500", ascending: true },
    yellow: {
      start: 2,
      end: 12,
      lock: "LOCK",
      bg: "bg-yellow-300",
      ascending: true,
    },
    green: {
      start: 12,
      end: 2,
      lock: "LOCK",
      bg: "bg-green-500",
      ascending: false,
    },
    blue: {
      start: 12,
      end: 2,
      lock: "LOCK",
      bg: "bg-blue-500",
      ascending: false,
    },
  };

  Object.keys(rowsConfig).forEach((color) => {
    const rowContainer = document.getElementById(`${color}-row`);
    if (rowContainer) {
      rowContainer.innerHTML = "";

      const { start, end, lock, bg, ascending } = rowsConfig[color];
      // Set the row container's classes for background and layout
      rowContainer.className = `flex justify-center items-end space-x-1 ${bg} rounded-lg py-2 mb-2`;

      const step = start < end ? 1 : -1;
      const numbers = [];
      for (let i = start; i !== end + step; i += step) {
        numbers.push(i);
      }

      const lastNumber = numbers[numbers.length - 1];
      const normalNumbers = numbers.slice(0, -1);

      // Create normal cells
      normalNumbers.forEach((num) => {
        const cell = document.createElement("div");
        cell.textContent = num;
        cell.className =
          "w-10 h-10 bg-white border border-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer";
        cell.addEventListener("click", () => attemptMarkCell(cell, color, num));
        rowContainer.appendChild(cell);
      });

      // Create the final section with label and final cells
      const finalSection = document.createElement("div");
      finalSection.className = "flex flex-col items-center space-y-1";

      const label = document.createElement("span");
      label.className = "text-xs font-semibold text-white";
      label.textContent = "At least 5 X's";
      finalSection.appendChild(label);

      const box = document.createElement("div");
      box.className =
        "flex space-x-1 border border-black rounded px-1 py-1 bg-white";

      // Final number cell
      const finalNumberCell = document.createElement("div");
      finalNumberCell.textContent = lastNumber;
      finalNumberCell.className =
        "w-10 h-10 bg-white border border-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer";
      finalNumberCell.addEventListener("click", () =>
        attemptMarkCell(finalNumberCell, color, lastNumber)
      );
      box.appendChild(finalNumberCell);

      // Lock cell
      const lockCell = document.createElement("div");
      lockCell.textContent = lock; // Will be updated when locked
      lockCell.className =
        "w-12 h-10 flex items-center justify-center font-bold bg-white text-black border border-gray-300";
      box.appendChild(lockCell);

      finalSection.appendChild(box);
      rowContainer.appendChild(finalSection);
    }
  });

  console.log("Score rows generated");
}

function generatePenaltyBoxes() {
  const penaltiesContainer = document.getElementById("penalties-container");
  penaltiesContainer.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const box = document.createElement("div");
    box.className =
      "w-10 h-10 border-2 border-black flex items-center justify-center font-bold bg-white";
    penaltiesContainer.appendChild(box);
  }
}

function attemptMarkCell(cell, color, number) {
  if (!gameState || !gameState.diceRolledThisTurn) {
    alert("You cannot mark before dice are rolled this turn.");
    return;
  }
  const currentPlayerName = document.getElementById("player-name").value;
  sendAction("markCell", { playerName: currentPlayerName, color, number });
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
  sendAction("endTurn", { playerName: currentPlayerName });

  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    endTurnButton.disabled = true;
  }
}

function resetTurn() {
  const currentPlayerName = document.getElementById("player-name").value;
  sendAction("resetTurnForPlayer", { playerName: currentPlayerName });
}

function calculateMarkingOptions(diceValues, isActivePlayer) {
  const optionsContainer = document.getElementById("marking-options-list");
  if (!optionsContainer) return;

  optionsContainer.innerHTML = "";

  const whiteSum = diceValues.white1 + diceValues.white2;

  const whiteOption = createOptionElement(
    whiteSum,
    "white",
    "bg-white text-black border border-gray-300"
  );
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
      let bgClass = "";
      switch (color) {
        case "red":
          bgClass = "bg-red-500 text-white";
          break;
        case "yellow":
          bgClass = "bg-yellow-300 text-black";
          break;
        case "green":
          bgClass = "bg-green-500 text-white";
          break;
        case "blue":
          bgClass = "bg-blue-500 text-white";
          break;
      }
      const colorOption = createOptionElement(
        value,
        color,
        `${bgClass} border border-gray-300`
      );
      optionsContainer.appendChild(colorOption);
    });
  }
}

function createOptionElement(value, color, additionalClasses = "") {
  const option = document.createElement("div");
  option.className = `w-12 h-12 flex items-center justify-center text-lg font-bold rounded cursor-pointer ${additionalClasses}`;
  option.textContent = value;
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
  scoreboardDiv.innerHTML =
    "<h3 class='text-xl font-bold mb-2'>Final Scores:</h3>";
  const table = document.createElement("table");
  table.className = "mx-auto border-collapse border border-black";
  const header = document.createElement("tr");
  ["Player", "Red", "Yellow", "Green", "Blue", "Penalties", "Total"].forEach(
    (h) => {
      const th = document.createElement("th");
      th.textContent = h;
      th.className = "border border-black px-2 py-1";
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
      td.className = "border border-black px-2 py-1";
      row.appendChild(td);
    });
    table.appendChild(row);
  });

  scoreboardDiv.appendChild(table);
  scoreboardDiv.classList.remove("hidden");
}

function updateGameUI(newState) {
  gameState = newState;

  const joinGameScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");

  // Toggle screens based on game state
  if (gameState.started) {
    joinGameScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
  }

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
  } else {
    const diceIds = ["white1", "white2", "red", "yellow", "green", "blue"];
    diceIds.forEach((dice) => {
      const diceElement = document.getElementById(dice);
      if (diceElement) {
        diceElement.textContent = "🎲";
      }
    });
  }

  // Update marked cells
  if (gameState.boards && gameState.boards[currentPlayerName]) {
    ["red", "yellow", "green", "blue"].forEach((color) => {
      const row = document.getElementById(`${color}-row`);
      if (row) {
        // Gather all w-10.h-10.bg-white cells (normal and final number cell)
        const allCells = row.querySelectorAll(".w-10.h-10.bg-white.border");

        const boardArray = gameState.boards[currentPlayerName][color];
        boardArray.forEach((marked, i) => {
          const cell = allCells[i];
          if (!cell) return;
          cell.classList.remove("bg-gray-300");
          if (marked) {
            cell.classList.add("bg-gray-300");
            cell.textContent = "X"; // Marked cell
          }
        });
      }
    });
  }

  // Update player list
  const playerInfo = document.getElementById("player-info");
  if (gameState.players) {
    playerInfo.innerHTML = `<h3 class="text-xl font-semibold mb-2">Players in the Room:</h3>`;
    gameState.players.forEach((player) => {
      const playerElement = document.createElement("div");
      playerElement.classList.add("player");
      playerElement.textContent = player.name;

      if (
        gameState.turnEndedBy &&
        gameState.turnEndedBy.includes(player.name)
      ) {
        playerElement.classList.add("line-through");
      }

      playerInfo.appendChild(playerElement);
    });
  }

  // Update turn order
  if (gameState.turnOrder) {
    updateTurnOrder(gameState.turnOrder);
  }

  // Update buttons
  const rollDiceButton = document.querySelector("#roll-dice-btn");
  if (rollDiceButton) {
    if (!gameState.started || gameState.gameOver) {
      rollDiceButton.disabled = true;
    } else {
      const canRoll = isActivePlayer && !gameState.diceRolledThisTurn;
      rollDiceButton.disabled = !canRoll;
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

  const resetTurnButton = document.querySelector(
    "button[onclick='resetTurn()']"
  );
  if (resetTurnButton) {
    if (!gameState.started || gameState.gameOver) {
      resetTurnButton.disabled = true;
    } else {
      const alreadyEnded =
        gameState.turnEndedBy &&
        gameState.turnEndedBy.includes(currentPlayerName);
      resetTurnButton.disabled = alreadyEnded || !gameState.diceRolledThisTurn;
    }
  }

  // Update marking options
  const optionsContainer = document.getElementById("marking-options-list");
  if (gameState.diceValues && gameState.started && !gameState.gameOver) {
    calculateMarkingOptions(gameState.diceValues, isActivePlayer);
  } else if (optionsContainer) {
    optionsContainer.innerHTML = "";
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
        box.classList.remove("bg-gray-300", "line-through");
        box.textContent = "";
        if (i < penaltyCount) {
          box.classList.add("bg-gray-300", "line-through");
          box.textContent = "X";
        }
      }
    }
  }

  // Update lock cells: If row is locked, show lock icon instead of "LOCK"
  if (gameState.lockedRows) {
    ["red", "yellow", "green", "blue"].forEach((color) => {
      const row = document.getElementById(`${color}-row`);
      if (!row) return;
      // The lock cell is inside the finalSection box (w-12.h-10)
      const lockCell = row.querySelector(".w-12.h-10");
      if (!lockCell) return;

      if (gameState.lockedRows[color]) {
        lockCell.textContent = "🔒";
        lockCell.classList.remove("text-black", "bg-white");
      } else {
        lockCell.textContent = "LOCK";
        lockCell.classList.add("text-black", "bg-white");
      }
    });
  }

  // If game over, show message and scoreboard
  const gameOverMessage = document.getElementById("game-over-message");
  if (gameState.gameOver) {
    if (gameOverMessage) gameOverMessage.classList.remove("hidden");
    if (gameState.scoreboard) {
      displayScoreboard(gameState.scoreboard);
    }
  } else {
    if (gameOverMessage) gameOverMessage.classList.add("hidden");
  }
}
