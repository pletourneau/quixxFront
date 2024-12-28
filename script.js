// ==================== WEBSOCKET & GAME STATE LOGIC ====================
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
 * Random "QUIXX" background logic
 */
const QUIXX_FONTS = [
  "'Comic Sans MS', cursive",
  "Georgia, serif",
  "Impact, sans-serif",
  "'Courier New', monospace",
];
const QUIXX_COLORS = ["red", "blue", "green", "yellow"];
const QUIXX_COUNT = 400; // Increase to flood more QUIXX lines

function fillQuixxBackground() {
  const container = document.getElementById("quixx-random-bg");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < QUIXX_COUNT; i++) {
    const span = document.createElement("span");
    span.textContent = "QUIXX  ";

    const font = QUIXX_FONTS[Math.floor(Math.random() * QUIXX_FONTS.length)];
    const color = QUIXX_COLORS[Math.floor(Math.random() * QUIXX_COLORS.length)];
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const rotate = Math.floor(Math.random() * 360);

    span.style.position = "absolute";
    span.style.left = `${x}vw`;
    span.style.top = `${y}vh`;
    span.style.transform = `rotate(${rotate}deg)`;
    span.style.fontFamily = font;
    span.style.color = color;
    span.style.fontSize = "16px";

    container.appendChild(span);
  }
}

/**
 * Called when the "Return to Join Screen" button is clicked on the Game Over screen
 * - Hide #game-over-screen
 * - Hide #game-screen
 * - Show #join-game-screen
 * (Optionally reset the game state, or re-join, or whatever flow you prefer.)
 */
function returnToJoinScreen() {
  const joinScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");
  const gameOverScreen = document.getElementById("game-over-screen");

  if (joinScreen) joinScreen.classList.remove("hidden");
  if (gameScreen) gameScreen.classList.add("hidden");
  if (gameOverScreen) gameOverScreen.classList.add("hidden");

  // Optionally reset any variables or do something else...
  // For example, if you want them to re-join or something:
  // gameState = null;
  // isRoomCreator = false;
  // ...
}

// ==================== WEBSOCKET ONOPEN: Initialize UI ====================
ws.onopen = () => {
  console.log("WebSocket connected. Generating rows/penalties...");

  generateScoreRows();
  generatePenaltyBoxes();
  fillQuixxBackground();
};

// ==================== WEBSOCKET ONMESSAGE: State Updates ====================
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("onmessage received:", data);

  if (data.type === "gameState") {
    updateGameUI(data);
  } else if (data.type === "error") {
    alert(data.message);
    // Re-enable End Turn button if disabled
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
    if (!rowContainer) return;

    rowContainer.innerHTML = "";
    const { start, end, lock, bg } = rowsConfig[color];
    // Use inline-flex with some padding to size to content
    rowContainer.className = `
      inline-flex
      items-center
      space-x-1
      ${bg}
      rounded-lg
      px-5
      py-5
      mb-2
      max-w-min
    `;

    const step = start < end ? 1 : -1;
    const numbers = [];
    for (let i = start; i !== end + step; i += step) {
      numbers.push(i);
    }
    const lastNumber = numbers[numbers.length - 1];
    const normalNumbers = numbers.slice(0, -1);

    // Normal cells
    normalNumbers.forEach((num) => {
      const cell = document.createElement("div");
      cell.textContent = num;
      cell.setAttribute("data-original-number", num);
      cell.className =
        "w-10 h-10 bg-white border border-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer";
      cell.addEventListener("click", () => attemptMarkCell(cell, color, num));
      rowContainer.appendChild(cell);
    });

    // Final number + lock
    const finalSection = document.createElement("div");
    finalSection.className = "relative inline-flex items-center";

    const label = document.createElement("span");
    label.className =
      "absolute text-xs font-semibold text-white bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap";
    label.textContent = "At least 5 X's";
    finalSection.appendChild(label);

    const finalRow = document.createElement("div");
    finalRow.className = "flex space-x-1 items-center";

    const finalNumberCell = document.createElement("div");
    finalNumberCell.textContent = lastNumber;
    finalNumberCell.setAttribute("data-original-number", lastNumber);
    finalNumberCell.className =
      "w-10 h-10 bg-white border border-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer ml-2";
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
  });
}

/**
 * Generate the 4 penalty boxes
 */
function generatePenaltyBoxes() {
  const penaltiesContainer = document.getElementById("penalties-container");
  if (!penaltiesContainer) return;

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
 * Roll Dice
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
 * End Turn
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
 * Reset Turn
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
 * Now used only for #scoreboard in the game-over screen
 */
function displayScoreboard(scoreboard) {
  const scoreboardDiv = document.getElementById("scoreboard");
  if (!scoreboardDiv) return;

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

// Checks phone orientation
function checkOrientation() {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const isMobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    navigator.maxTouchPoints > 1;
  const rotateMessage = document.getElementById("rotate-phone-message");

  if (isPortrait && isMobile) {
    rotateMessage.classList.remove("hidden");
  } else {
    rotateMessage.classList.add("hidden");
  }
}

// Initial check
checkOrientation();

// Add event listener to detect orientation changes
window.addEventListener("resize", checkOrientation);

/**
 * Update turn order row
 */
function updateCurrentTurnRow(activePlayer, turnOrder) {
  const row = document.getElementById("current-turn-row");
  if (!row) return;

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

  const joinGameScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");
  const gameOverScreen = document.getElementById("game-over-screen");

  // If the game has started, hide joinGameScreen
  if (gameState.started && joinGameScreen) {
    joinGameScreen.classList.add("hidden");
  }

  // If not gameOver, we show the game screen
  if (gameScreen && gameState.started && !gameState.gameOver) {
    gameScreen.classList.remove("hidden");
  }

  // If the game is not over, hide #game-over-screen
  if (gameOverScreen && !gameState.gameOver) {
    gameOverScreen.classList.add("hidden");
  }

  const currentPlayerName = document.getElementById("player-name").value;

  // Identify active player
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
  if (gameState.turnOrder) {
    updateCurrentTurnRow(activePlayerName, gameState.turnOrder);
  }

  // Show dice or placeholders
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

  // Update board for local player
  if (gameState.boards && gameState.boards[currentPlayerName]) {
    ["red", "yellow", "green", "blue"].forEach((color) => {
      const row = document.getElementById(`${color}-row`);
      if (!row) return;
      const allCells = row.querySelectorAll(
        ".w-10.h-10.bg-white.border, .w-10.h-10.border"
      );
      const boardArray = gameState.boards[currentPlayerName][color];

      boardArray.forEach((marked, i) => {
        const cell = allCells[i];
        if (!cell) return;
        cell.classList.remove("bg-gray-300", "bg-white");
        if (marked) {
          cell.classList.add("bg-gray-300");
          cell.textContent = "X";
        } else {
          cell.classList.add("bg-white");
          const originalNumber = cell.getAttribute("data-original-number");
          cell.textContent = originalNumber;
        }
      });
    });
  }

  // Update player list
  const playerInfo = document.getElementById("player-info");
  if (gameState.players && playerInfo) {
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

      // Ended turn => line-through
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
  const rollDiceButton = document.getElementById("roll-dice-btn");
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
        box.classList.remove("bg-gray-300", "line-through");
        box.textContent = "";
        if (i < penaltyCount) {
          box.classList.add("bg-gray-300");
          box.textContent = "X";
        }
      }
    }
  }

  // Row-locking logic
  if (gameState.lockedRows) {
    ["red", "yellow", "green", "blue"].forEach((color) => {
      const row = document.getElementById(`${color}-row`);
      if (!row) return;
      const lockCell = row.querySelector(".w-12.h-10");
      if (!lockCell) return;

      const lockedBy = gameState.lockedRows[color]; // null or playerName
      if (lockedBy === null) {
        lockCell.textContent = "LOCK";
        lockCell.classList.remove("bg-gray-400", "text-white");
        lockCell.classList.remove("bg-white", "text-black");
        lockCell.classList.add("bg-white", "text-black");
      } else if (lockedBy === currentPlayerName) {
        lockCell.textContent = "🔒";
        lockCell.classList.remove("bg-white", "text-black");
        lockCell.classList.add("bg-gray-400", "text-white");
      } else {
        lockCell.textContent = "🔒";
        lockCell.classList.remove("bg-gray-400", "text-white");
        lockCell.classList.remove("bg-white", "text-black");
        lockCell.classList.add("bg-white", "text-black");
      }
    });
  }

  // Check for game over
  if (gameState.gameOver) {
    // Hide main game screen
    if (gameScreen) {
      gameScreen.classList.add("hidden");
    }
    // Show game over screen
    if (gameOverScreen) {
      gameOverScreen.classList.remove("hidden");
    }
    // Display scoreboard in #scoreboard
    if (gameState.scoreboard) {
      displayScoreboard(gameState.scoreboard);
    }
  } else {
    // Not game over => hide #game-over-screen if present
    if (gameOverScreen) {
      gameOverScreen.classList.add("hidden");
    }
  }
}
