// Firebase config for online multiplayer
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
let board = Array(9).fill("");
let gameMode = null;
const symbols = [
  '<span style="color:#ff4d4d;">🪙</span>',
  '<span style="color:#00ffe1;">🧿</span>'
];

startModeBtn.onclick = () => {
  const selected = document.querySelector('input[name="mode"]:checked');
  if (!selected) return alert("Please choose a game mode.");
  gameMode = selected.value;
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
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.textContent = `👤 ${user.displayName}`;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.textContent = "";
  }
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

  if (gameMode === "cpu" && !isPlayerX) {
    setTimeout(cpuMove, 500);
  }
}

function cpuMove() {
  const empty = board.map((val, i) => val === "" ? i : null).filter(v => v !== null);
  const move = empty[Math.floor(Math.random() * empty.length)];
  makeMove(move);
}

function checkWin() {
  const combos = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return combos.some(combo => {
    const [a,b,c] = combo;
    return board[a] !== "" && board[a] === board[b] && board[a] === board[c];
  });
}

resetBtn.onclick = () => {
  board = Array(9).fill("");
  isPlayerX = true;
  gameActive = true;
  renderBoard();
  updateStatus();
};

// Online Room Join/Create
createRoomBtn.onclick = () => {
  if (!currentUser) return alert("Please login first!");
  const room = Math.random().toString(36).substring(2, 7);
  roomIdInput.value = room;
  database.ref(`rooms/${room}`).set({
    board: Array(9).fill(""),
    currentTurn: true
  }).then(() => {
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
  roomRef.on("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      statusEl.textContent = "❌ Room not found!";
      return;
    }
    board = data.board;
    isPlayerX = data.currentTurn;
    gameActive = true;
    renderBoard();
    updateStatus();
  });
}
