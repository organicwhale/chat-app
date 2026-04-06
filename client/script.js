let socket = io();
let nickname = "";
let roomName = "";
let roomCode = "";
let currentHostId = null;
let mySocketId = null;

const personalMemoIds = ["memo8", "memo4", "memo5", "memo1", "memo2"];

function getTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
            <div class="room-name">${escapeHtml(room.roomName)} (${room.count}/${room.maxCount})</div>
            <div class="room-meta">현재 ${room.count}명 / 최대 ${room.maxCount}명</div>
          </div>
          <button onclick="fillRoomName('${escapeHtml(room.roomName)}')">선택</button>
        </div>
      `
    )
    .join("");
}

function fillRoomName(selectedRoomName) {
  document.getElementById("roomNameInput").value = selectedRoomName;
  document.getElementById("roomCodeInput").focus();
}

function clearPersonalMemos() {
  personalMemoIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function setNoticeEditable(isHost) {
  const noticeText = document.getElementById("noticeText");
  const noticeHint = document.getElementById("noticeHint");
  const hostBadge = document.getElementById("hostBadge");

  if (isHost) {
    noticeText.removeAttribute("readonly");
    noticeHint.textContent = "공지 수정 가능";
    hostBadge.textContent = "방장";
  } else {
    noticeText.setAttribute("readonly", true);
    noticeHint.textContent = "방장만 수정 가능";
    hostBadge.textContent = "";
  }
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

const sendNoticeUpdate = debounce(() => {
  if (currentHostId !== mySocketId) return;
  socket.emit("updateNotice", {
    notice: document.getElementById("noticeText").value
  });
}, 300);

function joinRoom() {
  const nicknameInput = document.getElementById("nickname").value.trim();
  const roomNameInput = document.getElementById("roomNameInput").value.trim();
  const roomCodeInput = document.getElementById("roomCodeInput").value.trim();

  if (!nicknameInput || !roomNameInput || !roomCodeInput) {
    alert("이름, 방이름, 코드를 모두 입력하세요.");
    return;
  }

  nickname = nicknameInput;
  roomName = roomNameInput;
  roomCode = roomCodeInput;

  clearPersonalMemos();
  document.getElementById("chat").innerHTML = "";
  document.getElementById("noticeText").value = "";

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("roomListWrap").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  document.getElementById("currentRoomLabel").textContent = `방이름: ${roomName}`;
  document.getElementById("myNicknameLabel").textContent = `이름: ${nickname}`;

  socket.emit("join", {
    nickname,
    roomName,
    roomCode
  });
}

function leaveRoom() {
  socket.emit("leaveRoom");
}

function sendMessage() {
  const msgInput = document.getElementById("message");
  const msg = msgInput.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", { message: msg });
  msgInput.value = "";
}

socket.on("connect", () => {
  mySocketId = socket.id;
});

socket.on("joinError", (message) => {
  alert(message);

  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("setup").classList.remove("hidden");
  document.getElementById("roomListWrap").classList.remove("hidden");
});

socket.on("clearChat", () => {
  document.getElementById("chat").innerHTML = "";
});

socket.on("message", (data) => {
  const chat = document.getElementById("chat");

  if (data.nickname === "시스템") {
    chat.innerHTML += `<div class="system">${escapeHtml(data.message)}</div>`;
  } else {
    const cls = data.nickname === nickname ? "me" : "other";
    chat.innerHTML += `
      <div class="log-row ${cls}">
        ${escapeHtml(data.nickname)}
        <span class="time">${getTime()}</span> :
        ${escapeHtml(data.message)}
      </div>
    `;
  }

  chat.scrollTop = chat.scrollHeight;
});

socket.on("roomList", (rooms) => {
  renderRoomList(rooms);
});

socket.on("roomUsers", (payload) => {
  document.getElementById("userCount").textContent =
    `인원 ${payload.count}명 / 최대 ${payload.maxCount}명`;

  document.getElementById("currentRoomLabel").textContent =
    `방이름: ${payload.roomName}`;

  currentHostId = payload.hostId;
  setNoticeEditable(currentHostId === mySocketId);
});

socket.on("noticeUpdated", ({ notice, hostId }) => {
  currentHostId = hostId;
  const noticeText = document.getElementById("noticeText");

  if (noticeText !== document.activeElement || currentHostId !== mySocketId) {
    noticeText.value = notice || "";
  }

  setNoticeEditable(currentHostId === mySocketId);
});

socket.on("leftRoom", () => {
  roomName = "";
  roomCode = "";
  currentHostId = null;

  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("setup").classList.remove("hidden");
  document.getElementById("roomListWrap").classList.remove("hidden");

  document.getElementById("chat").innerHTML = "";
  document.getElementById("roomNameInput").value = "";
  document.getElementById("roomCodeInput").value = "";
  document.getElementById("message").value = "";
  document.getElementById("noticeText").value = "";
  document.getElementById("userCount").textContent = "인원 0명";
  document.getElementById("hostBadge").textContent = "";
  document.getElementById("currentRoomLabel").textContent = "방이름:";
  document.getElementById("myNicknameLabel").textContent = "이름:";

  clearPersonalMemos();

  socket.emit("getRoomList");
});

document.addEventListener("DOMContentLoaded", () => {
  const messageInput = document.getElementById("message");
  const noticeText = document.getElementById("noticeText");

  if (messageInput) {
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }

  if (noticeText) {
    noticeText.addEventListener("input", () => {
      if (currentHostId === mySocketId) {
        sendNoticeUpdate();
      }
    });
  }

  socket.emit("getRoomList");
});