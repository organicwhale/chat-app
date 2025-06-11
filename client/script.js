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
  socket.emit('join', { nickname, roomCode });

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("chatRoom").classList.remove("hidden");

  socket.on('message', (data) => {
    const chat = document.getElementById("chat");
    chat.innerHTML += `<div><b>${data.nickname}:</b> ${data.message}</div>`;
    chat.scrollTop = chat.scrollHeight;
  });
}

function sendMessage() {
  const msg = document.getElementById("message").value;
  if (msg.trim() === "") return;
  socket.emit('chatMessage', { message: msg, roomCode });
  document.getElementById("message").value = "";
}
