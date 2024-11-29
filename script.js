function joinGame() {
  const passcode = document.getElementById("passcode").value;
  const playerName = document.getElementById("player-name").value;

  if (passcode && playerName) {
    joinRoom(passcode, playerName);
  } else {
    alert("Enter both a passcode and your name to join the game.");
  }
}

function joinRoom(passcode, playerName) {
  ws.send(JSON.stringify({ type: "joinRoom", passcode, playerName }));
}

// End the current turn
function endTurn() {
  sendAction("endTurn", {});
}

// Mark a number on the score sheet
function markNumber(color, number) {
  sendAction("markNumber", { color, number });
}
