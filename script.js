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
const auth = firebase.auth(), db = firebase.database();
const provider = new firebase.auth.GoogleAuthProvider();

// --- DOM Elements ---
const $ = id => document.getElementById(id);
const boardEl = $("board"), statusEl = $("status");
const resetBtn = $("resetBtn"), backBtn = $("backBtn");
const loginBtn = $("loginBtn"), logoutBtn = $("logoutBtn"), userInfo = $("userInfo");
const roomIdInput = $("roomId"), createRoomBtn = $("createRoom"), joinRoomBtn = $("joinRoom");
const authPanel = $("authPanel"), multiPanel = $("multiPanel");
const modeSelector = $("modeSelector"), startModeBtn = $("startModeBtn");

let currentUser = null, currentRoom = null;
let board = Array(9).fill(""), gameActive = false, isPlayerX = true, gameMode = null;
const symbols = ['<span style="color:#ff4d4d;">🪙</span>', '<span style="color:#00ffe1;">🧿</span>'];

// --- Auth ---
auth.onAuthStateChanged(user => {
  currentUser = user;
  loginBtn.style.display = user ? "none" : "inline-block";
  logoutBtn.style.display = user ? "inline-block" : "none";
  userInfo.textContent = user ? `👤 ${user.displayName}` : "";
});

loginBtn.onclick = () => auth.signInWithPopup(provider);
logoutBtn.onclick = () => auth.signOut();

// --- Game Logic ---
function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((val, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.innerHTML = val;
    cell.onclick = () => makeMove(i);
    boardEl.appendChild(cell);
  });
}

function updateStatus() {
  if (!gameActive) return;
  statusEl.textContent = `${isPlayerX ? "🪙" : "🧿"}'s Turn`;
}

function makeMove(index) {
  if (!gameActive || board[index] !== "") return;

  board[index] = symbols[isPlayerX ? 0 : 1];
  renderBoard();

  if (checkWin()) {
    gameActive = false;
    statusEl.textContent = `🏆 ${symbols[+!isPlayerX]} wins!`;
    alert(`🎉 Player ${isPlayerX ? "🪙" : "🧿"} wins!`);
    return;
  }

  if (!board.includes("")) {
    gameActive = false;
    statusEl.textContent = "🤝 Draw!";
    alert("🤝 It's a draw!");
    return;
  }

  isPlayerX = !isPlayerX;
  updateStatus();

  if (gameMode === "cpu" && !isPlayerX) setTimeout(cpuMove, 400);
}

function cpuMove() {
  const empty = board.map((val, i) => val === "" ? i : null).filter(i => i !== null);
  makeMove(empty[Math.floor(Math.random() * empty.length)]);
}

function checkWin() {
  const winCombos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return winCombos.some(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
}

// --- Reset & Back ---
resetBtn.onclick = () => {
  board = Array(9).fill("");
  isPlayerX = true;
  gameActive = true;
  renderBoard();
  updateStatus();
};

backBtn.onclick = () => {
  gameMode = null;
  modeSelector.style.display = "block";
  authPanel.style.display = "none";
  multiPanel.style.display = "none";
  resetBtn.style.display = "none";
  backBtn.style.display = "none";
  boardEl.innerHTML = "";
  statusEl.textContent = "Select a mode to start";
};

// --- Room Logic (Online) ---
createRoomBtn.onclick = () => {
  if (!currentUser) return alert("Please login!");
  const room = Math.random().toString(36).substr(2, 6);
  roomIdInput.value = room;
  const players = { [currentUser.uid]: { name: currentUser.displayName, symbol: "X" } };
  db.ref(`rooms/${room}`).set({
    board: Array(9).fill(""),
    players,
    currentTurn: "X",
    started: false
  }).then(() => {
    const link = window.location.origin + window.location.pathname + `?room=${room}`;
    navigator.clipboard.writeText(link);
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
  const ref = db.ref(`rooms/${room}`);
  ref.once("value").then(snap => {
    const data = snap.val();
    if (!data) return alert("Room not found!");
    const players = data.players || {};
    if (!players[currentUser.uid]) {
      if (Object.keys(players).length >= 2) return alert("Room full!");
      players[currentUser.uid] = { name: currentUser.displayName, symbol: "O" };
      db.ref(`rooms/${room}/players`).set(players);
      db.ref(`rooms/${room}/started`).set(true);
    }
    ref.on("value", s => {
      const d = s.val();
      if (!d.started) return statusEl.textContent = "Waiting for opponent...";
      board = d.board;
      isPlayerX = d.players[currentUser.uid].symbol === "X";
      gameActive = true;
      renderBoard();
      statusEl.textContent = `${d.currentTurn === (isPlayerX ? "X" : "O") ? "Your" : "Opponent's"} Turn (${d.currentTurn})`;
    });
  });
}

// --- On Page Load ---
window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has("room")) {
    roomIdInput.value = params.get("room");
    gameMode = "online";
    modeSelector.style.display = "none";
    authPanel.style.display = "block";
    multiPanel.style.display = "block";
    statusEl.textContent = "Login to join shared room.";
  }

  document.querySelectorAll(".mode-card").forEach(card => {
    card.onclick = () => {
      document.querySelectorAll(".mode-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      gameMode = card.dataset.mode;
    };
  });

  startModeBtn.onclick = () => {
    if (!gameMode) return alert("Choose a mode!");
    modeSelector.style.display = "none";
    resetBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    if (gameMode === "online") {
      authPanel.style.display = "block";
      multiPanel.style.display = "block";
      statusEl.textContent = "Login to start";
    } else {
      gameActive = true;
      renderBoard();
      updateStatus();
    }
  };
};

