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

let selectedMode = null;
document.querySelectorAll('.mode-card').forEach(card => {
  card.onclick = () => {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedMode = card.getAttribute('data-mode');
  };
});

startModeBtn.onclick = () => {
  if (!selectedMode) return alert("Please choose a game mode.");
  gameMode = selectedMode;
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

loginBtn.onclick = () => auth.signInWithPopup(provider);
logoutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged(user => {
  currentUser = user;
  loginBtn.style.display = user ? "none" : "inline-block";
  logoutBtn.style.display = user ? "inline-block" : "none";
  userInfo.textContent = user ? `👤 ${user.displayName}` : "";
});

function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((cell, i) => {
    const div = document.createElement("div");
    div.classList.add("cell");
    div.innerHTML = cell;
    div.onclick = () => makeMove(i);
    boardEl.appendChild(div);
  });
}

function updateStatus() {
  if (!gameActive) return;
  statusEl.textContent = `${isPlayerX ? "🪙" : "🧿"}'s Turn`;
}

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
      const nextTurn = (mySymbol === "X") ? "O" : "X";

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
    return;
  }
  if (!board.includes("")) {
    statusEl.textContent = "🤝 Draw!";
    gameActive = false;
    return;
  }
  isPlayerX = !isPlayerX;
  updateStatus();

  if (gameMode === "cpu" && !isPlayerX) setTimeout(cpuMove, 500);
}

function cpuMove() {
  const empty = board.map((val, i) => val === "" ? i : null).filter(v => v !== null);
  makeMove(empty[Math.floor(Math.random() * empty.length)]);
}

function checkWin() {
  const win = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return win.some(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
}

resetBtn.onclick = () => {
  board = Array(9).fill("");
  isPlayerX = true;
  gameActive = true;
  renderBoard();
  updateStatus();
};

createRoomBtn.onclick = () => {
  if (!currentUser) return alert("Please login first!");
  const room = Math.random().toString(36).substring(2, 7);
  roomIdInput.value = room;
  const players = {};
  players[currentUser.uid] = { name: currentUser.displayName, symbol: "X" };
  database.ref(`rooms/${room}`).set({
    board: Array(9).fill(""),
    players,
    currentTurn: "X",
    started: false
  }).then(() => {
    navigator.clipboard.writeText(location.href.split("?")[0] + "?room=" + room);
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
      players[currentUser.uid] = { name: current
