let socket;
let nickname = "";
let roomCode = "";

function joinRoom() {
  nickname = document.getElementById("nickname").value;
  roomCode = document.getElementById("roomCode").value;

  if (!nickname || !roomCode) {
    alert("닉네임과 방 코드를 입력하세요.");
    return;
  }

  socket = io();

  socket.emit("join", { nickname, roomCode });

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("chatRoom").classList.remove("hidden");

  socket.on("message", (data) => {
    const chat = document.getElementById("chat");

    if (data.nickname === "시스템") {
      chat.innerHTML += `<div class="system-message">${data.message}</div>`;
    } else {
      const messageClass = data.nickname === nickname ? "me" : "other";

      chat.innerHTML += `
        <div class="message-row ${messageClass}">
          <div class="message-bubble">
            <b>${data.nickname}</b><br>
            ${data.message}
          </div>
        </div>
      `;
    }

    chat.scrollTop = chat.scrollHeight;
  });
}

function sendMessage() {
  const msg = document.getElementById("message").value;

  if (!msg || msg.trim() === "") return;
  if (!socket) return;

  socket.emit("chatMessage", { message: msg, roomCode });
  document.getElementById("message").value = "";
}

document.addEventListener("DOMContentLoaded", function () {
  const messageInput = document.getElementById("message");

  if (messageInput) {
    messageInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        sendMessage();
      }
    });
  }
});