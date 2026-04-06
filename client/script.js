let socket;
let nickname = "";
let roomCode = "";

function getTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function joinRoom() {
  nickname = document.getElementById("nickname").value;
  roomCode = document.getElementById("roomCode").value;

  if (!nickname || !roomCode) {
    alert("입력 필요");
    return;
  }

  socket = io();
  socket.emit("join", { nickname, roomCode });

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("chatRoom").classList.remove("hidden");

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
}

function sendMessage() {
  const msg = document.getElementById("message").value;
  if (!msg || msg.trim() === "") return;

  socket.emit("chatMessage", { message: msg, roomCode });
  document.getElementById("message").value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("message");

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }
});