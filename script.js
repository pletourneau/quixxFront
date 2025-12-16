// ==================== WEBSOCKET & GAME STATE LOGIC ====================
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

let gameState = null;
let isRoomCreator = false;
let currentRoom = "";

// Initialize WebSocket connection
function connectWebSocket() {
  if (
    ws &&
    (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)
  ) {
    console.log("WebSocket already connected or connecting");
    return;
  }

  console.log("Connecting to WebSocket...");
  ws = new WebSocket("wss://quixxback.onrender.com");

  ws.onopen = () => {
    console.log("WebSocket connected");
    reconnectAttempts = 0;
    generateScoreRows();
    generatePenaltyBoxes();
    fillQuixxBackground();
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = (event) => {
    console.log("WebSocket closed:", event.code, event.reason);

    // Only attempt reconnection if not a normal closure and we have a room
    if (
      event.code !== 1000 &&
      currentRoom &&
      reconnectAttempts < MAX_RECONNECT_ATTEMPTS
    ) {
      reconnectAttempts++;
      console.log(
        `Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`
      );

      setTimeout(() => {
        connectWebSocket();
        // If we were in a game, try to rejoin
        if (currentRoom && document.getElementById("player-name").value) {
          setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              joinRoom(
                currentRoom,
                document.getElementById("player-name").value
              );
            }
          }, 500);
        }
      }, RECONNECT_DELAY * reconnectAttempts);
    } else if (event.code !== 1000) {
      setTimeout(() => {
        alert("Disconnected from server. Please refresh the page.");
        resetGameToJoinScreen();
      }, 1000);
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("onmessage received:", data);

      if (data.type === "gameState") {
        updateGameUI(data);
      } else if (data.type === "error") {
        alert(data.message);
        const endTurnButton = document.querySelector(
          "button[onclick='endTurn()']"
        );
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
        document.getElementById(
          "room-name"
        ).textContent = `Room: ${currentRoom}`;
      } else if (data.type === "gameEnded") {
        console.log("Game ended with scoreboard:", data.scoreboard);
        handleGameEnded(data);
      } else if (data.type === "roomClosing") {
        console.log("Room closing message received:", data.message);
        handleRoomClosing(data);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };
}

// Initialize connection on page load
connectWebSocket();

/**
 * Send a "joinRoom" action to the server
 */
function joinRoom(passcode, playerName) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("Not connected to server. Please wait and try again.");
    return;
  }

  console.log("Sending joinRoom:", passcode, playerName);
  ws.send(JSON.stringify({ type: "joinRoom", passcode, playerName }));
}

/**
 * Called by "Join Game" button
 */
function joinGame() {
  const passcode = document.getElementById("passcode").value.trim();
  const playerName = document.getElementById("player-name").value.trim();

  if (!passcode || !playerName) {
    alert("Enter both a passcode and your name to join the game.");
    return;
  }

  // Check if this room was recently used
  const previousRooms = JSON.parse(
    localStorage.getItem("previousQuixxRooms") || "[]"
  );

  if (previousRooms.includes(passcode)) {
    if (
      !confirm(
        `Room "${passcode}" was recently used in a completed game. Start a fresh game with this code?`
      )
    ) {
      return;
    }
    const index = previousRooms.indexOf(passcode);
    previousRooms.splice(index, 1);
    localStorage.setItem("previousQuixxRooms", JSON.stringify(previousRooms));
  }

  joinRoom(passcode, playerName);
}

/**
 * Called by "Start Game" button
 */
function startGame() {
  if (isRoomCreator) {
    const players = Array.from(
      document.querySelectorAll("#player-info .player")
    ).map((el) => el.textContent.trim());

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
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket not open. Cannot send action:", type);
    alert("Connection lost. Please refresh the page.");
    return;
  }

  console.log("Sending action:", type, payload);
  ws.send(JSON.stringify({ type, ...payload }));
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
const QUIXX_COUNT = 400;

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
 * Called when the "Return to Join Screen" button is clicked
 */
function returnToJoinScreen() {
  const joinScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");
  const gameOverScreen = document.getElementById("game-over-screen");

  if (joinScreen) joinScreen.classList.remove("hidden");
  if (gameScreen) gameScreen.classList.add("hidden");
  if (gameOverScreen) gameOverScreen.classList.add("hidden");

  // Close WebSocket if open
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(1000, "Returning to join screen");
  }

  // Reset game state
  gameState = null;
  isRoomCreator = false;
  currentRoom = "";
  reconnectAttempts = 0;

  // Clear input fields
  document.getElementById("player-name").value = "";
  document.getElementById("passcode").value = "";

  // Clear scoreboard
  const scoreboardDiv = document.getElementById("scoreboard");
  if (scoreboardDiv) scoreboardDiv.innerHTML = "";

  // Reconnect WebSocket for next game
  setTimeout(() => connectWebSocket(), 500);
}

// ==================== GAME END HANDLERS ====================

/**
 * Handle game ended message from server
 */
function handleGameEnded(data) {
  displayScoreboard(data.scoreboard);

  const gameOverScreen = document.getElementById("game-over-screen");
  const gameScreen = document.getElementById("game-screen");
  const joinScreen = document.getElementById("join-game-screen");

  if (gameScreen) gameScreen.classList.add("hidden");
  if (joinScreen) joinScreen.classList.add("hidden");
  if (gameOverScreen) gameOverScreen.classList.remove("hidden");

  // Store the room as "previously used"
  const previousRooms = JSON.parse(
    localStorage.getItem("previousQuixxRooms") || "[]"
  );
  if (currentRoom && !previousRooms.includes(currentRoom)) {
    previousRooms.push(currentRoom);
    localStorage.setItem("previousQuixxRooms", JSON.stringify(previousRooms));
  }

  gameState = { ...gameState, gameOver: true };
}

/**
 * Handle room closing message from server
 */
function handleRoomClosing(data) {
  alert(data.message || "Room is closing. Game has ended.");
  resetGameToJoinScreen();
}

/**
 * Reset game and return to join screen
 */
function resetGameToJoinScreen() {
  const joinScreen = document.getElementById("join-game-screen");
  const gameScreen = document.getElementById("game-screen");
  const gameOverScreen = document.getElementById("game-over-screen");

  if (joinScreen) joinScreen.classList.remove("hidden");
  if (gameScreen) gameScreen.classList.add("hidden");
  if (gameOverScreen) gameOverScreen.classList.add("hidden");

  gameState = null;
  isRoomCreator = false;

  const previousRooms = JSON.parse(
    localStorage.getItem("previousQuixxRooms") || "[]"
  );
  const currentPasscode = document.getElementById("passcode").value;
  if (previousRooms.includes(currentPasscode)) {
    document.getElementById("passcode").value = "";
    alert("This room has ended. Please use a new room code.");
  }

  const scoreboardDiv = document.getElementById("scoreboard");
  if (scoreboardDiv) scoreboardDiv.innerHTML = "";

  const diceIds = ["white1", "white2", "red", "yellow", "green", "blue"];
  diceIds.forEach((dice) => {
    const diceElement = document.getElementById(dice);
    if (diceElement) diceElement.textContent = "🎲";
  });

  const penaltiesContainer = document.getElementById("penalties-container");
  if (penaltiesContainer) {
    for (let i = 0; i < 4; i++) {
      const box = penaltiesContainer.children[i];
      if (box) {
        box.classList.remove("bg-gray-300", "line-through");
        box.textContent = "";
      }
    }
  }

  const playerInfo = document.getElementById("player-info");
  if (playerInfo) {
    const header = playerInfo.querySelector("h3");
    playerInfo.innerHTML = header ? header.outerHTML : "";
  }

  const startButton = document.getElementById("start-game");
  if (startButton) startButton.style.display = "none";

  const roomName = document.getElementById("room-name");
  if (roomName) roomName.textContent = "";

  currentRoom = "";
  reconnectAttempts = 0;
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
    if (!rowContainer) return;

    rowContainer.innerHTML = "";
    const { start, end, lock, bg } = rowsConfig[color];
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

    normalNumbers.forEach((num) => {
      const cell = document.createElement("div");
      cell.textContent = num;
      cell.setAttribute("data-original-number", num);
      cell.className =
        "w-10 h-10 bg-white border border-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer";
      cell.addEventListener("click", () => attemptMarkCell(cell, color, num));
      rowContainer.appendChild(cell);
    });

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
 */
function displayScoreboard(scoreboard) {
  const scoreboardDiv = document.getElementById("scoreboard");
  if (!scoreboardDiv) return;

  localStorage.setItem("lastQuixxScoreboard", JSON.stringify(scoreboard));

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

checkOrientation();
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
  try {
    console.log("Received gameState:", newState);
    gameState = newState;

    const joinGameScreen = document.getElementById("join-game-screen");
    const gameScreen = document.getElementById("game-screen");
    const gameOverScreen = document.getElementById("game-over-screen");

    if (gameState.started && joinGameScreen) {
      joinGameScreen.classList.add("hidden");
    }

    if (gameScreen && gameState.started && !gameState.gameOver) {
      gameScreen.classList.remove("hidden");
    }

    if (gameOverScreen && !gameState.gameOver) {
      gameOverScreen.classList.add("hidden");
    }

    const currentPlayerName = document.getElementById("player-name").value;

    let activePlayerName = null;
    if (gameState.turnOrder && gameState.turnOrder.length > 0) {
      activePlayerName = gameState.turnOrder[gameState.activePlayerIndex];
    }

    const isActivePlayer = activePlayerName === currentPlayerName;

    if (gameState.turnOrder) {
      updateCurrentTurnRow(activePlayerName, gameState.turnOrder);
    }

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

    const playerInfo = document.getElementById("player-info");
    if (gameState.players && playerInfo) {
      playerInfo.innerHTML = `<h3 class="text-xl font-semibold mb-2">Players in the Room:</h3>`;
      gameState.players.forEach((player) => {
        const playerElement = document.createElement("div");
        playerElement.classList.add("player");
        playerElement.textContent = player.name;

        if (player.connected === false) {
          playerElement.style.color = "red";
        } else {
          playerElement.style.color = "black";
        }

        if (
          gameState.turnEndedBy &&
          gameState.turnEndedBy.includes(player.name)
        ) {
          playerElement.classList.add("line-through");
        }
        playerInfo.appendChild(playerElement);
      });
    }

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
        resetTurnButton.disabled =
          alreadyEnded || !gameState.diceRolledThisTurn;
        if (resetTurnButton.disabled) {
          resetTurnButton.classList.add("opacity-50");
        } else {
          resetTurnButton.classList.remove("opacity-50");
        }
      }
    }

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

    if (gameState.lockedRows) {
      ["red", "yellow", "green", "blue"].forEach((color) => {
        const row = document.getElementById(`${color}-row`);
        if (!row) return;
        const lockCell = row.querySelector(".w-12.h-10");
        if (!lockCell) return;

        const lockedBy = gameState.lockedRows[color];
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

    if (gameState.gameOver) {
      if (gameScreen) {
        gameScreen.classList.add("hidden");
      }
      if (gameOverScreen) {
        gameOverScreen.classList.remove("hidden");
      }
      if (gameState.scoreboard) {
        displayScoreboard(gameState.scoreboard);
      }
    } else {
      if (gameOverScreen) {
        gameOverScreen.classList.add("hidden");
      }
    }
  } catch (error) {
    console.error("Error in updateGameUI:", error);
  }
}
