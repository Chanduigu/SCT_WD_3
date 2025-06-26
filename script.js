// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC1LIU2JolH7XBAORbbexRqJjlQgdmXiQA",
  authDomain: "tic-tac-glow-df8d1.firebaseapp.com",
  databaseURL: "https://tic-tac-glow-df8d1-default-rtdb.firebaseio.com/",
  projectId: "tic-tac-glow-df8d1",
  storageBucket: "tic-tac-glow-df8d1.appspot.com",
  messagingSenderId: "1098253185974",
  appId: "1:1098253185974:web:e9475e79797bb7f6890717"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const provider = new firebase.auth.GoogleAuthProvider();

// Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const menuBtn = document.getElementById("menuBtn");
const roomIdInput = document.getElementById("roomId");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const authPanel = document.getElementById("authPanel");
const multiPanel = document.getElementById("multiPanel");
const modeSelector = document.getElementById("modeSelector");
const startModeBtn = document.getElementById("startModeBtn");

// Game state
let currentUser = null;
let currentRoom = null;
let playerSymbol = null;
let currentTurn = "X";
let isPlayerX = true;
let gameActive = false;
let gameMode = null;
let board = Array(9).fill("");

// Symbols
const symbols = [
  '<span style="color:#ff4d4d;">🪙</span>',
  '<span style="color:#00ffe1;">🧿</span>'
];

// Auth
auth.onAuthStateChanged(user => {
  currentUser = user;
  loginBtn.style.display = user ? "none" : "inline-block";
  logoutBtn.style.display = user ? "inline-block" : "none";
  userInfo.textContent = user ? `👤 ${user.displayName}` : "";
  if (user && gameMode === "online") {
    statusEl.innerHTML = "Enter room ID or create one.";
  }
});

loginBtn.onclick = () => auth.signInWithPopup(provider);
logoutBtn.onclick = () => auth.signOut();

// Mode Selection
document.querySelectorAll('.mode-card').forEach(card => {
  card.onclick = () => {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    gameMode = card.dataset.mode;
  };
});

startModeBtn.onclick = () => {
  if (!gameMode) return alert("Choose a mode!");
  modeSelector.style.display = "none";
  menuBtn.style.display = "inline-block";

  if (gameMode === "online") {
    authPanel.style.display = "block";
    multiPanel.style.display = "block";
    statusEl.innerHTML = "Login to start.";
  } else {
    authPanel.style.display = "none";
    multiPanel.style.display = "none";
    startLocalGame();
  }
};

function startLocalGame() {
  board = Array(9).fill("");
  isPlayerX = true;
  gameActive = true;
  renderBoard();
  updateStatus();
  resetBtn.style.display = "inline-block";
}

function updateStatus() {
  if (!gameActive) return;
  if (gameMode === "online") {
    statusEl.innerHTML = (currentTurn === playerSymbol) ? `Your Turn (${playerSymbol})` : `Opponent's Turn`;
  } else {
    statusEl.innerHTML = `${isPlayerX ? "🪙" : "🧿"}'s Turn`;
  }
}

function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((val, i) => {
    const div = document.createElement("div");
    div.className = "cell";
    div.innerHTML = val;
    div.onclick = () => handleCellClick(i);
    boardEl.appendChild(div);
  });
}

function handleCellClick(i) {
  if (!gameActive || board[i] !== "") return;

  if (gameMode === "online") {
    if (currentTurn !== playerSymbol) return;
    board[i] = symbols[playerSymbol === "X" ? 0 : 1];
    currentTurn = playerSymbol === "X" ? "O" : "X";
    database.ref(`rooms/${currentRoom}`).update({
      board: board,
      currentTurn: currentTurn
    });
  } else {
    board[i] = symbols[isPlayerX ? 0 : 1];
    renderBoard();
    if (checkWin()) {
      statusEl.innerHTML = `🏆 ${symbols[+!isPlayerX]} wins!`;
      alert(`🏆 Player ${isPlayerX ? "🪙" : "🧿"} wins!`);
      gameActive = false;
      return;
    }
    if (!board.includes("")) {
      statusEl.innerHTML = "🤝 Draw!";
      alert("🤝 It's a Draw!");
      gameActive = false;
      return;
    }
    isPlayerX = !isPlayerX;
    updateStatus();

    if (gameMode === "cpu" && !isPlayerX && gameActive) {
      setTimeout(cpuMove, 500);
    }
  }

  renderBoard();
}

// CPU Logic
function cpuMove() {
  const available = board.map((val, idx) => val === "" ? idx : null).filter(i => i !== null);
  const move = available[Math.floor(Math.random() * available.length)];
  handleCellClick(move);
}

// Reset
resetBtn.onclick = () => {
  board = Array(9).fill("");
  isPlayerX = true;
  currentTurn = "X";
  gameActive = true;
  renderBoard();
  updateStatus();
  if (gameMode === "cpu" && !isPlayerX) {
    setTimeout(cpuMove, 500);
  }
};

// Main Menu
menuBtn.onclick = () => {
  gameActive = false;
  board = Array(9).fill("");
  boardEl.innerHTML = "";
  authPanel.style.display = "none";
  multiPanel.style.display = "none";
  resetBtn.style.display = "none";
  menuBtn.style.display = "none";
  modeSelector.style.display = "block";
  statusEl.innerHTML = "Select a mode to start";
  if (currentRoom) database.ref(`rooms/${currentRoom}`).off();
  currentRoom = null;
};

// === Firebase Online Multiplayer ===

createRoomBtn.onclick = () => {
  if (!currentUser) return alert("Login first!");
  const room = Math.random().toString(36).substring(2, 7);
  currentRoom = room;
  setupRoomListener(room);
  const ref = database.ref(`rooms/${room}`);
  ref.set({
    board: Array(9).fill(""),
    players: {
      [currentUser.uid]: {
        symbol: "X",
        name: currentUser.displayName
      }
    },
    currentTurn: "X"
  }).then(() => {
    roomIdInput.value = room;
    navigator.clipboard.writeText(window.location.href.split("?")[0] + "?room=" + room);
  });
};

joinRoomBtn.onclick = () => {
  const room = roomIdInput.value.trim();
  if (!room) return alert("Enter a room ID");
  if (!currentUser) return alert("Login first!");

  currentRoom = room;
  setupRoomListener(room);

  const ref = database.ref(`rooms/${room}`);
  ref.once("value").then(snapshot => {
    const data = snapshot.val();
    if (!data) return alert("Room not found!");

    const players = data.players || {};
    if (!players[currentUser.uid]) {
      if (Object.keys(players).length >= 2) return alert("Room full!");
      players[currentUser.uid] = {
        symbol: "O",
        name: currentUser.displayName
      };
      ref.child("players").set(players);
    }
  });
};

function setupRoomListener(room) {
  const ref = database.ref(`rooms/${room}`);

  ref.on("value", snap => {
    const d = snap.val();
    if (!d) return;

    board = d.board || Array(9).fill("");
    currentTurn = d.currentTurn || "X";
    renderBoard();

    const players = d.players || {};
    const player = players[currentUser.uid];
    if (!player) {
      statusEl.innerHTML = "You are not a player in this room.";
      return;
    }

    playerSymbol = player.symbol;

    if (Object.keys(players).length < 2) {
      statusEl.innerHTML = "Waiting for second player...";
      gameActive = false;
      return;
    }

    const winner = checkWinOnline(board);
    if (winner && gameActive) {
      const winSymbol = symbols[winner === "X" ? 0 : 1];
      statusEl.innerHTML = `🏆 ${winSymbol} wins!`;
      alert(`🏆 Player ${winner === "X" ? "🪙" : "🧿"} wins!`);
      gameActive = false;
      return;
    }

    if (!board.includes("") && gameActive) {
      statusEl.innerHTML = "🤝 Draw!";
      alert("🤝 It's a Draw!");
      gameActive = false;
      return;
    }

    gameActive = true;
    updateStatus();
    resetBtn.style.display = "inline-block";
    menuBtn.style.display = "inline-block";
  });
}

// Auto-join via URL
window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has("room")) {
    roomIdInput.value = params.get("room");
    gameMode = "online";
    modeSelector.style.display = "none";
    authPanel.style.display = "block";
    multiPanel.style.display = "block";
    statusEl.innerHTML = "Login to join shared room.";
  }
};

// Win Logic
function checkWin() {
  const winCombos = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return winCombos.some(([a,b,c]) =>
    board[a] !== "" && board[a] === board[b] && board[b] === board[c]
  );
}

function checkWinOnline(boardState) {
  const winPatterns = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a, b, c] of winPatterns) {
    const va = boardState[a];
    const vb = boardState[b];
    const vc = boardState[c];
    if (va && va === vb && vb === vc) {
      if (va.includes("🪙")) return "X";
      if (va.includes("🧿")) return "O";
    }
  }
  return null;
}
