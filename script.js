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

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const roomIdInput = document.getElementById("roomId");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const authPanel = document.getElementById("authPanel");
const multiPanel = document.getElementById("multiPanel");
const modeSelector = document.getElementById("modeSelector");
const startModeBtn = document.getElementById("startModeBtn");

let currentUser = null;
let currentRoom = null;
let isPlayerX = true;
let gameActive = false;
let gameMode = null;
let board = Array(9).fill("");

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
    statusEl.textContent = "Enter room ID or create one.";
  }
});

// Login
loginBtn.onclick = () => auth.signInWithPopup(provider);
logoutBtn.onclick = () => auth.signOut();

// UI + Events
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
  if (gameMode === "online") {
    authPanel.style.display = "block";
    multiPanel.style.display = "block";
    statusEl.textContent = "Login to start.";
  } else {
    gameActive = true;
    resetBtn.style.display = "inline-block";
    renderBoard();
    updateStatus();
  }
};

function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((val, i) => {
    const div = document.createElement("div");
    div.className = "cell";
    div.innerHTML = val;
    div.onclick = () => makeMove(i);
    boardEl.appendChild(div);
  });
}

function updateStatus() {
  if (!gameActive) return;
  statusEl.textContent = `${isPlayerX ? "🪙" : "🧿"}'s Turn`;
}

function makeMove(i) {
  if (!gameActive || board[i] !== "") return;
  board[i] = symbols[isPlayerX ? 0 : 1];
  renderBoard();
  if (checkWin()) {
    statusEl.textContent = `🏆 ${symbols[+!isPlayerX]} wins!`;
    gameActive = false;
    alert(`🏆 Player ${isPlayerX ? "🪙" : "🧿"} wins!`);
    return;
  }
  if (!board.includes("")) {
    statusEl.textContent = "🤝 Draw!";
    gameActive = false;
    alert("🤝 It's a Draw!");
    return;
  }
  isPlayerX = !isPlayerX;
  updateStatus();
}

resetBtn.onclick = () => {
  board = Array(9).fill("");
  isPlayerX = true;
  gameActive = true;
  renderBoard();
  updateStatus();
};

// Firebase Online Room
createRoomBtn.onclick = () => {
  if (!currentUser) return alert("Login first!");
  const room = Math.random().toString(36).substring(2, 7);
  roomIdInput.value = room;
  database.ref(`rooms/${room}`).set({
    board: Array(9).fill(""),
    players: { [currentUser.uid]: { symbol: "X", name: currentUser.displayName } },
    currentTurn: "X"
  }).then(() => {
    navigator.clipboard.writeText(location.href.split("?")[0] + "?room=" + room);
    joinRoom(room);
  });
};

joinRoomBtn.onclick = () => {
  const room = roomIdInput.value.trim();
  if (!room) return alert("Enter a room ID");
  if (!currentUser) return alert("Login first!");
  joinRoom(room);
};

function joinRoom(room) {
  currentRoom = room;
  const ref = database.ref(`rooms/${room}`);
  ref.once("value").then(snapshot => {
    const data = snapshot.val();
    if (!data) return alert("Room not found!");
    if (!data.players[currentUser.uid]) {
      const numPlayers = Object.keys(data.players).length;
      if (numPlayers >= 2) return alert("Room full!");
      const symbol = "O";
      data.players[currentUser.uid] = { symbol, name: currentUser.displayName };
      ref.child("players").set(data.players);
    }
    resetBtn.style.display = "inline-block";
    ref.on("value", snap => {
      const d = snap.val();
      board = d.board;
      renderBoard();
      isPlayerX = d.players[currentUser.uid].symbol === "X";
      gameActive = true;
      updateStatus();
    });
  });
}

// Auto-join if room shared
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
};
