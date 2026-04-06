let socket = io();
let nickname = "";
let roomCode = "";

function getTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function renderRoomList(rooms) {
  const container = document.getElementById("roomsContainer");

  if (!rooms || rooms.length === 0) {
    container.innerHTML = `<div class="room-meta">현재 활성 방이 없습니다.</div>`;
    return;
  }

  container.innerHTML = rooms
    .map(
      (room) => `
        <div class="room-item">
          <div>
            <div class="room-code">${room.code}</div>
            <div class="room-meta">참여 인원 ${room.count}명</div>
          </div>
          <button onclick="joinSelectedRoom('${room.code}')">입장</button>
        </div>
      `
    )
    .join("");
}

function joinSelectedRoom(selectedCode) {
  document.getElementById("roomCode").value = selectedCode;
  joinRoom();
}

function joinRoom() {
  const nicknameInput = document.getElementById("nickname").value.trim();
  const roomCodeInput = document.getElementById("roomCode").value.trim();

  if (!nicknameInput || !roomCodeInput) {
    alert("이름과 코드를 입력하세요.");
    return;
  }

  nickname = nicknameInput;
  roomCode = roomCodeInput;

  document.getElementById("chat").innerHTML = "";
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("chatRoom").classList.remove("hidden");
  document.getElementById("currentRoomLabel").textContent = `방: ${roomCode}`;

  socket.emit("join", { nickname, roomCode });
}

function leaveRoom() {
  socket.emit("leaveRoom");
}

function sendMessage() {
  const msgInput = document.getElementById("message");
  const msg = msgInput.value.trim();

  if (!msg) return;

  socket.emit("chatMessage", { message: msg, roomCode });
  msgInput.value = "";
}

socket.on("clearChat", () => {
  document.getElementById("chat").innerHTML = "";
});

socket.on("message", (data) => {
  const chat = document.getElementById("chat");

  if (data.nickname === "시스템") {
    chat.innerHTML += `<div class="system">${data.message}</div>`;
  } else {
    const cls = data.nickname === nickname ? "me" : "other";

    chat.innerHTML += `
      <div class="log-row ${cls}">
        ${data.nickname}
        <span class="time">${getTime()}</span> :
        ${data.message}
      </div>
    `;
  }

  chat.scrollTop = chat.scrollHeight;
});

socket.on("roomList", (rooms) => {
  renderRoomList(rooms);
});

socket.on("roomUsers", (users) => {
  document.getElementById("userCount").textContent = `인원 ${users.length}명`;
});

socket.on("leftRoom", () => {
  roomCode = "";
  document.getElementById("chatRoom").classList.add("hidden");
  document.getElementById("setup").classList.remove("hidden");
  document.getElementById("chat").innerHTML = "";
  document.getElementById("roomCode").value = "";
  document.getElementById("message").value = "";
  document.getElementById("userCount").textContent = "인원 0명";
  socket.emit("getRoomList");
});

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("message");

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }

  socket.emit("getRoomList");
});