const ws = new WebSocket("wss://quixxback.onrender.com");

let gameState = null;
let isRoomCreator = false;
let currentRoom = "";

/**
 * Send a "joinRoom" action to the server
 */
function joinRoom(passcode, playerName) {
  console.log("Sending joinRoom:", passcode, playerName);
  ws.send(JSON.stringify({ type: "joinRoom", passcode, playerName }));
}

// When socket opens, generate rows + penalty boxes
ws.onopen = () => {
  console.log("WebSocket connected. Generating rows/penalties...");
  generateScoreRows();
  generatePenaltyBoxes();
};

/**
 * Called by "Join Game" button
 */
function joinGame() {
  const passcode = document.getElementById("passcode").value;
  const playerName = document.getElementById("player-name").value;
  if (passcode && playerName) {
    joinRoom(passcode, playerName);
  } else {
    alert("Enter both a passcode and your name to join the game.");
  }
}

/**
 * Called by "Start Game" button
 */
function startGame() {
  if (isRoomCreator) {
    const players = Array.from(
      document.querySelectorAll("#player-info .player")
    ).map((el) => el.textContent);
    shuffle(players);
    console.log("Starting game with players:", players);
    sendAction("startGame", { turnOrder: players });
  } else {
    alert("Only the host can start the game.");
  }
}

/**
 * Helper to send an action over WebSocket
 */
function sendAction(type, payload = {}) {
  if (ws.readyState === WebSocket.OPEN) {
    console.log("Sending action:", type, payload);
    ws.send(JSON.stringify({ type, ...payload }));
  } else {
    console.warn("WebSocket not open. Cannot send action:", type);
  }
}

/**
 * Generate the 4 color rows
 */
function generateScoreRows() {
  const rowsConfig = {
    red: {
      start: 2,
      end: 12,
      lock: "LOCK",
      bg: "bg-red-500",
      ascending: true,
    },
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
      const { start, end, lock, bg } = rowsConfig[color];
      rowContainer.className = `flex items-center space-x-1 ${bg} rounded-lg py-2 mb-2 justify-center`;
      const step = start < end ? 1 : -1;
      const numbers = [];
      for (let i = start; i !== end + step; i += step) {
        numbers.push(i);
      }
      const lastNumber = numbers[numbers.length - 1];
      const normalNumbers = numbers.slice(0, -1);

      // Create cells for each number
      normalNumbers.forEach((num) => {
        const cell = document.createElement("div");
        cell.textContent = num;
        cell.setAttribute("data-original-number", num);
        cell.className =
          "w-10 h-10 bg-white border border-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer";
        cell.addEventListener("click", () => attemptMarkCell(cell, color, num));
        rowContainer.appendChild(cell);
      });

      // Final + lock
      const finalSection = document.createElement("div");
      finalSection.className = "flex flex-col items-center space-y-1";

      const label = document.createElement("span");
      label.className = "text-xs font-semibold text-white";
      label.textContent = "At least 5 X's";
      finalSection.appendChild(label);

      const finalRow = document.createElement("div");
      finalRow.className = "flex space-x-1 items-center";

      const finalNumberCell = document.createElement("div");
      finalNumberCell.textContent = lastNumber;
      finalNumberCell.setAttribute("data-original-number", lastNumber);
      finalNumberCell.className =
        "w-10 h-10 bg-white border border-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer";
      finalNumberCell.addEventListener("click", () =>
        attemptMarkCell(finalNumberCell, color, lastNumber)
      );
      finalRow.appendChild(finalNumberCell);

      const lockCell = document.createElement("div");
      lockCell.textContent = lock;
      lockCell.className =
        "w-12 h-10 flex items-center justify-center font-bold bg-white text-black border border-gray-300";
      finalRow.appendChild(lockCell);

      finalSection.appendChild(finalRow);
      rowContainer.appendChild(finalSection);
    }
  });
}

/**
 * Generate 4 penalty boxes
 */
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

/**
 * Attempt to mark a cell
 */
function attemptMarkCell(cell, color, number) {
  if (!gameState || !gameState.diceRolledThisTurn) {
    alert("You cannot mark before dice are rolled this turn.");
    return;
  }
  const currentPlayerName = document.getElementById("player-name").value;
  sendAction("markCell", { playerName: currentPlayerName, color, number });
}

/**
 * Roll Dice action
 */
function rollDice() {
  const currentPlayerName = document.getElementById("player-name").value;
  if (
    gameState &&
    gameState.turnOrder &&
    gameState.turnOrder[gameState.activePlayerIndex] === currentPlayerName
  ) {
    if (!gameState.started || gameState.gameOver) {
      return;
    }
    sendAction("rollDice");
  } else {
    alert("It's not your turn to roll the dice.");
  }
}

/**
 * End Turn action
 */
function endTurn() {
  const currentPlayerName = document.getElementById("player-name").value;
  sendAction("endTurn", { playerName: currentPlayerName });
  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    endTurnButton.disabled = true;
    endTurnButton.classList.add("opacity-50");
  }
}

/**
 * Reset Turn action
 */
function resetTurn() {
  const currentPlayerName = document.getElementById("player-name").value;
  sendAction("resetTurnForPlayer", { playerName: currentPlayerName });
}

/**
 * Shuffle helper for random turn order
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Display final scoreboard
 */
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

/**
 * Update the turn order row
 */
function updateCurrentTurnRow(activePlayer, turnOrder) {
  const row = document.getElementById("current-turn-row");
  row.innerHTML = "";
  const activeSpan = document.createElement("span");
  activeSpan.textContent = activePlayer;
  activeSpan.className = "font-bold text-green-700";
  row.appendChild(activeSpan);

  const currentIndex = turnOrder.indexOf(activePlayer);
  let nextPlayers = turnOrder
    .slice(currentIndex + 1)
    .concat(turnOrder.slice(0, currentIndex));
  nextPlayers.forEach((p) => {
    const span = document.createElement("span");
    span.textContent = p;
    row.appendChild(span);
  });
}

/**
 * Main UI update function triggered by "gameState" messages
 */
function updateGameUI(newState) {
  console.log("Received gameState:", newState);
  gameState = newState;

  // Switch screens if the game has started
  const joinGameScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");
  if (gameState.started) {
    joinGameScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
  }

  const currentPlayerName = document.getElementById("player-name").value;

  // Identify the active player
  let activePlayerName = null;
  if (gameState.turnOrder && gameState.turnOrder.length > 0) {
    activePlayerName = gameState.turnOrder[gameState.activePlayerIndex];
  }
  console.log(
    "Current player:",
    currentPlayerName,
    "Active player:",
    activePlayerName
  );

  const isActivePlayer = activePlayerName === currentPlayerName;

  // Update turn order display
  if (gameState.turnOrder && gameState.turnOrder.length > 0) {
    updateCurrentTurnRow(activePlayerName, gameState.turnOrder);
  }

  // Show dice values
  if (gameState.diceValues) {
    Object.entries(gameState.diceValues).forEach(([dice, value]) => {
      const diceElement = document.getElementById(dice);
      if (diceElement) diceElement.textContent = value;
    });
  } else {
    // If no diceValues yet
    const diceIds = ["white1", "white2", "red", "yellow", "green", "blue"];
    diceIds.forEach((dice) => {
      const diceElement = document.getElementById(dice);
      if (diceElement) {
        diceElement.textContent = "🎲";
      }
    });
  }

  // Update the board for the local player
  if (gameState.boards && gameState.boards[currentPlayerName]) {
    ["red", "yellow", "green", "blue"].forEach((color) => {
      const row = document.getElementById(`${color}-row`);
      if (row) {
        const allCells = row.querySelectorAll(
          ".w-10.h-10.bg-white.border, .w-10.h-10.border"
        );
        const boardArray = gameState.boards[currentPlayerName][color];

        boardArray.forEach((marked, i) => {
          const cell = allCells[i];
          if (!cell) return;
          cell.classList.remove("bg-gray-300", "bg-white");
          if (marked) {
            // Marked
            cell.classList.add("bg-gray-300");
            cell.textContent = "X";
          } else {
            // Unmarked
            cell.classList.add("bg-white");
            const originalNumber = cell.getAttribute("data-original-number");
            cell.textContent = originalNumber;
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

      // Disconnected => red
      if (player.connected === false) {
        playerElement.style.color = "red";
      } else {
        playerElement.style.color = "black";
      }
      // If they've ended turn => line-through
      if (
        gameState.turnEndedBy &&
        gameState.turnEndedBy.includes(player.name)
      ) {
        playerElement.classList.add("line-through");
      }
      playerInfo.appendChild(playerElement);
    });
  }

  // Roll Dice button
  const rollDiceButton = document.querySelector("#roll-dice-btn");
  if (rollDiceButton) {
    if (!gameState.started || gameState.gameOver) {
      rollDiceButton.disabled = true;
      rollDiceButton.classList.add("opacity-50");
    } else {
      rollDiceButton.disabled = !isActivePlayer;
      if (rollDiceButton.disabled) {
        rollDiceButton.classList.add("opacity-50");
      } else {
        rollDiceButton.classList.remove("opacity-50");
      }
    }
  }

  // End Turn button
  const endTurnButton = document.querySelector("button[onclick='endTurn()']");
  if (endTurnButton) {
    if (!gameState.started || gameState.gameOver) {
      endTurnButton.disabled = true;
      endTurnButton.classList.add("opacity-50");
    } else {
      const alreadyEnded =
        gameState.turnEndedBy &&
        gameState.turnEndedBy.includes(currentPlayerName);
      endTurnButton.disabled = alreadyEnded;
      if (alreadyEnded) {
        endTurnButton.classList.add("opacity-50");
      } else {
        endTurnButton.classList.remove("opacity-50");
      }
    }
  }

  // Reset Turn button
  const resetTurnButton = document.querySelector(
    "button[onclick='resetTurn()']"
  );
  if (resetTurnButton) {
    if (!gameState.started || gameState.gameOver) {
      resetTurnButton.disabled = true;
      resetTurnButton.classList.add("opacity-50");
    } else {
      const alreadyEnded =
        gameState.turnEndedBy &&
        gameState.turnEndedBy.includes(currentPlayerName);
      resetTurnButton.disabled = alreadyEnded || !gameState.diceRolledThisTurn;
      if (resetTurnButton.disabled) {
        resetTurnButton.classList.add("opacity-50");
      } else {
        resetTurnButton.classList.remove("opacity-50");
      }
    }
  }

  // Update penalties for local player
  if (
    gameState.penalties &&
    gameState.penalties[currentPlayerName] !== undefined
  ) {
    const penaltyCount = gameState.penalties[currentPlayerName];
    const penaltiesContainer = document.getElementById("penalties-container");
    if (penaltiesContainer) {
      for (let i = 0; i < 4; i++) {
        const box = penaltiesContainer.children[i];
        // Remove gray & line-through first
        box.classList.remove("bg-gray-300", "line-through");
        box.textContent = "";
        if (i < penaltyCount) {
          // Mark penalty with gray background, no strikethrough
          box.classList.add("bg-gray-300");
          box.textContent = "X";
        }
      }
    }
  }

  // If row is locked by *someone*, show "🔒".
  // If locked by *this* player => we can optionally do gray or white, your choice:
  // Let's do gray if locked by me, white if locked by another, or normal "LOCK" if unlocked.
  if (gameState.lockedRows) {
    ["red", "yellow", "green", "blue"].forEach((color) => {
      const row = document.getElementById(`${color}-row`);
      if (!row) return;
      const lockCell = row.querySelector(".w-12.h-10");
      if (!lockCell) return;

      const lockedBy = gameState.lockedRows[color];
      // either null or a playerName

      if (lockedBy === null) {
        // not locked
        lockCell.textContent = "LOCK";
        lockCell.classList.remove("bg-gray-400", "text-white");
        lockCell.classList.remove("bg-white", "text-black"); // remove both states
        // default to white background
        lockCell.classList.add("bg-white", "text-black");
      } else if (lockedBy === currentPlayerName) {
        // I locked it => show gray lock
        lockCell.textContent = "🔒";
        lockCell.classList.remove("bg-white", "text-black");
        lockCell.classList.add("bg-gray-400", "text-white");
      } else {
        // Someone else locked => white lock
        lockCell.textContent = "🔒";
        lockCell.classList.remove("bg-gray-400", "text-white");
        lockCell.classList.remove("bg-white", "text-black");
        lockCell.classList.add("bg-white", "text-black");
      }
    });
  }

  // Check for game over
  const gameOverMessage = document.getElementById("game-over-message");
  if (gameState.gameOver) {
    if (gameOverMessage) {
      gameOverMessage.classList.remove("hidden");
    }
    if (gameState.scoreboard) {
      displayScoreboard(gameState.scoreboard);
    }
  } else {
    if (gameOverMessage) {
      gameOverMessage.classList.add("hidden");
    }
  }
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("onmessage received:", data);

  if (data.type === "gameState") {
    updateGameUI(data);
  } else if (data.type === "error") {
    alert(data.message);
    const endTurnButton = document.querySelector("button[onclick='endTurn()']");
    if (endTurnButton) {
      endTurnButton.disabled = false;
      endTurnButton.classList.remove("opacity-50");
    }
  } else if (data.type === "roomStatus") {
    alert(`You have ${data.status} the room: ${data.room}`);
    currentRoom = data.room;
  } else if (data.type === "newGame") {
    console.log("Received newGame. You are the room creator.");
    isRoomCreator = true;
    currentRoom = data.room;
    document.getElementById("start-game").style.display = "block";
    document.getElementById("room-name").textContent = `Room: ${currentRoom}`;
  }
};
