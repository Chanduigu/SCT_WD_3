// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyC1LIU2JolH7XBAORbbexRqJjlQgdmXiQA",
  authDomain: "tic-tac-glow-df8d1.firebaseapp.com",
  databaseURL: "https://tic-tac-glow-df8d1-default-rtdb.firebaseio.com",
  projectId: "tic-tac-glow-df8d1",
  storageBucket: "tic-tac-glow-df8d1.appspot.com",
  messagingSenderId: "1098253185974",
  appId: "1:1098253185974:web:e9475e79797bb7f6890717"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const provider = new firebase.auth.GoogleAuthProvider();

// --- DOM Elements ---
const loginBtn = document.getElementById("loginBtn"),
      logoutBtn = document.getElementById("logoutBtn"),
      userInfo = document.getElementById("userInfo"),
      boardEl = document.getElementById("board"),
      statusEl = document.getElementById("status"),
      resetBtn = document.getElementById("resetBtn"),
      roomIdInput = document.getElementById("roomId"),
      createRoomBtn = document.getElementById("createRoom"),
      joinRoomBtn = document.getElementById("joinRoom"),
      authPanel = document.getElementById("authPanel"),
      multiPanel = document.getElementById("multiPanel"),
      modeSelector = document.getElementById("modeSelector"),
      startModeBtn = document.getElementById("startModeBtn");

let currentUser = null,
    currentRoom = null,
    isPlayerX = true,
    gameActive = false,
    gameMode = null,
    board = Array(9).fill("");

const symbols = [
  '<span style="color:#ff4d4d;">🪙</span>',
  '<span style="color:#00ffe1;">🧿</span>'
];

// --- Auth State ---
auth.onAuthStateChanged(user => {
  currentUser = user;
  loginBtn.style.display = user ? "none" : "inline-block";
  logoutBtn.style.display = user ? "inline-block" : "none";
  userInfo.textContent = user ? `👤 ${user.displayName}` : "";
});

loginBtn.onclick = () => auth.signInWithPopup(provider);
logoutBtn.onclick = () => auth.signOut();

// --- Render & Status ---
function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((cell, i) => {
    const div = document.createElement("div");
    div.className = "cell";
    div.innerHTML = cell;
    div.onclick = () => makeMove(i);
    boardEl.appendChild(div);
  });
}

function updateStatus() {
  if (!gameActive) return;
  statusEl.textContent = `${isPlayerX ? "🪙" : "🧿"}'s Turn`;
}

// --- Game Logic ---
function makeMove(index) {
  if (!gameActive || board[index] !== "") return;

  if (gameMode === "online" && currentRoom) {
    const roomRef = database.ref(`rooms/${currentRoom}`);
    roomRef.once("value").then(snapshot => {
      const data = snapshot.val();
      const mySymbol = data.players[currentUser.uid].symbol;
      if (data.currentTurn !== mySymbol) return;

      const newBoard = data.board;
      newBoard[index] = symbols[mySymbol === "X" ? 0 : 1];
      const nextTurn = mySymbol === "X" ? "O" : "X";

      roomRef.update({
        board: newBoard,
        currentTurn: nextTurn
      });
    });
    return;
  }

  board[index] = symbols[isPlayerX ? 0 : 1];
  renderBoard();

  const winner = checkWin();
  if (winner) {
    statusEl.textContent = `🏆 ${symbols[+!isPlayerX]} wins!`;
    gameActive = false;
    setTimeout(() => alert(`🏆 Player ${isPlayerX ? "🪙" : "🧿"} wins!`), 300);
    return;
  }

  if (!board.includes("")) {
    statusEl.textContent = "🤝 Draw!";
    gameActive = false;
    setTimeout(() => alert("🤝 It's a Draw!"), 300);
    return;
  }

  isPlayerX = !isPlayerX;
  updateStatus();

  if (gameMode === "cpu" && !isPlayerX) setTimeout(cpuMove, 500);
}

function cpuMove() {
  const empty = board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
  const move = empty[Math.floor(Math.random() * empty.length)];
  makeMove(move);
}

function checkWin() {
  const winPatterns = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return winPatterns.some(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
}

// --- Reset ---
resetBtn.onclick = () => {
  board = Array(9).fill("");
  isPlayerX = true;
  gameActive = true;
  renderBoard();
  updateStatus();
};

// --- Room Creation & Joining ---
createRoomBtn.onclick = () => {
  if (!currentUser) return alert("🔐 Please login first!");
  const room = Math.random().toString(36).substring(2, 7);
  roomIdInput.value = room;
  const players = {
    [currentUser.uid]: { name: currentUser.displayName, symbol: "X" }
  };
  database.ref(`rooms/${room}`).set({
    board: Array(9).fill(""),
    players,
    currentTurn: "X",
    started: false
  }).then(() => {
    navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${room}`);
    joinRoom(room);
  });
};

joinRoomBtn.onclick = () => {
  const room = roomIdInput.value.trim();
  if (!room) return alert("Enter a room ID");
  joinRoom(room);
};

function joinRoom(room) {
  currentRoom = room;
  const roomRef = database.ref(`rooms/${room}`);
  roomRef.once("value").then(snapshot => {
    const data = snapshot.val();
    if (!data) return statusEl.textContent = "❌ Room not found!";
    const players = data.players || {};
    if (!players[currentUser.uid]) {
      if (Object.keys(players).length >= 2) return alert("Room is full!");
      players[currentUser.uid] = {
        name: currentUser.displayName,
        symbol: "O"
      };
      database.ref(`rooms/${room}/players`).set(players);
      database.ref(`rooms/${room}/started`).set(true);
    }

    roomRef.on("value", snap => {
      const state = snap.val();
      if (!state.started) return statusEl.textContent = "Waiting for opponent...";
      board = state.board;
      isPlayerX = state.players[currentUser.uid].symbol === "X";
      gameActive = true;
      renderBoard();
      statusEl.textContent = `${state.currentTurn === state.players[currentUser.uid].symbol ? "Your" : "Opponent's"} Turn (${state.currentTurn})`;
    });
  });
}

// --- Mode Selection & Auto Room Join ---
window.onload = () => {
  const params = new URLSearchParams(location.search);
  if (params.has("room")) {
    roomIdInput.value = params.get("room");
    gameMode = "online";
    modeSelector.style.display = "none";
    authPanel.style.display = "block";
    multiPanel.style.display = "block";
    statusEl.textContent = "Login to join shared room.";
  }

  // Mode selection
  document.querySelectorAll(".mode-card").forEach(card => {
    card.onclick = () => {
      document.querySelectorAll(".mode-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      gameMode = card.dataset.mode;
    };
  });

  // Start Game
  startModeBtn.onclick = () => {
    if (!gameMode) return alert("▶️ Choose a mode!");
    modeSelector.style.display = "none";
    resetBtn.style.display = "inline-block";

    if (gameMode === "online") {
      authPanel.style.display = "block";
      multiPanel.style.display = "block";
      statusEl.textContent = "Login to start.";
    } else {
      gameActive = true;
      renderBoard();
      updateStatus();
    }
  };
};
