// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC1LIU2JolH7XBAORbbexRqJjlQgdmXiQA",
  authDomain: "tic-tac-glow-df8d1.firebaseapp.com",
  databaseURL: "https://tic-tac-glow-df8d1-default-rtdb.firebaseio.com",
  projectId: "tic-tac-glow-df8d1",
  storageBucket: "tic-tac-glow-df8d1.appspot.com",
  messagingSenderId: "1098253185974",
  appId: "1:1098253185974:web:e9475e79797bb7f6890717",
  measurementId: "G-57CCH42ZY2"
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
const roomIdInput = document.getElementById("roomId");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");

let currentUser = null;
let currentRoom = null;
let isPlayerX = true;
let gameActive = false;
let board = Array(9).fill("");
const symbols = ["❌", "⭕"];

function renderBoard() {
  boardEl.innerHTML = "";
  board.forEach((cell, i) => {
    const div = document.createElement("div");
    div.classList.add("cell");
    div.textContent = cell;
    div.addEventListener("click", () => makeMove(i));
    boardEl.appendChild(div);
  });
}

function makeMove(index) {
  if (!gameActive || board[index] !== "") return;
  board[index] = isPlayerX ? symbols[0] : symbols[1];
  firebase.database().ref(`rooms/${currentRoom}`).update({
    board,
    currentTurn: !isPlayerX
  });
}

function checkWin(bd, sym) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return wins.some(comb => comb.every(i => bd[i] === sym));
}

function updateStatus() {
  statusEl.textContent = gameActive ? `${isPlayerX ? symbols[0] : symbols[1]}'s turn` : "Game Over";
}

function resetGame() {
  board = Array(9).fill("");
  firebase.database().ref(`rooms/${currentRoom}`).update({
    board,
    currentTurn: true
  });
}

// Auth
loginBtn.onclick = () => auth.signInWithPopup(provider).catch(console.error);
logoutBtn.onclick = () => auth.signOut().catch(console.error);

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.textContent = `👤 ${user.displayName}`;
  } else {
    currentUser = null;
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.textContent = "";
  }
});

// Room System with Feedback
createRoomBtn.onclick = () => {
  if (!currentUser) {
    statusEl.textContent = "❗ Please login first!";
    return;
  }

  const room = Math.random().toString(36).substring(2, 7);
  statusEl.textContent = `🔧 Creating room: ${room}...`;

  database.ref(`rooms/${room}`).set({
    board: Array(9).fill(""),
    currentTurn: true
  }).then(() => {
    statusEl.textContent = `✅ Room "${room}" created! Joining room...`;
    roomIdInput.value = room;
    joinRoom(room);
  }).catch((error) => {
    statusEl.textContent = `❌ Error creating room: ${error.message}`;
    console.error("Firebase error:", error);
  });
};

joinRoomBtn.onclick = () => {
  const room = roomIdInput.value.trim();
  if (!room) {
    statusEl.textContent = "❗ Enter a room ID!";
    return;
  }
  joinRoom(room);
};

function joinRoom(room) {
  currentRoom = room;
  const roomRef = database.ref(`rooms/${room}`);
  statusEl.textContent = `🔄 Joining room: ${room}...`;

  roomRef.on("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      statusEl.textContent = "❌ Room not found!";
      return;
    }

    board = data.board || Array(9).fill("");
    isPlayerX = data.currentTurn === true;
    gameActive = true;
    renderBoard();
    updateStatus();

    const winner = checkWin(board, symbols[+!isPlayerX]);
    if (winner) {
      statusEl.textContent = `🏆 ${symbols[+!isPlayerX]} wins!`;
      gameActive = false;
    } else if (!board.includes("")) {
      statusEl.textContent = "🤝 Draw!";
      gameActive = false;
    }
  });
}

resetBtn.onclick = resetGame;
