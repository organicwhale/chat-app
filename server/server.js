const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname + "/../client"));

const rooms = {};

function ensureRoom(roomCode) {
  if (!rooms[roomCode]) {
    rooms[roomCode] = {
      users: [],
      maxCount: 0,
      notice: "",
      hostId: null
    };
  }
}

function getPublicRooms() {
  return Object.entries(rooms).map(([code, room]) => ({
    code,
    count: room.users.length,
    maxCount: room.maxCount
  }));
}

function broadcastRoomList() {
  io.emit("roomList", getPublicRooms());
}

function broadcastRoomUsers(roomCode) {
  if (!rooms[roomCode]) return;
  io.to(roomCode).emit("roomUsers", {
    users: rooms[roomCode].users,
    count: rooms[roomCode].users.length,
    maxCount: rooms[roomCode].maxCount,
    hostId: rooms[roomCode].hostId
  });
}

function broadcastNotice(roomCode) {
  if (!rooms[roomCode]) return;
  io.to(roomCode).emit("noticeUpdated", {
    notice: rooms[roomCode].notice,
    hostId: rooms[roomCode].hostId
  });
}

function leaveCurrentRoom(socket, isDisconnect = false) {
  if (!socket.roomCode || !rooms[socket.roomCode]) return;

  const oldRoomCode = socket.roomCode;
  const oldRoom = rooms[oldRoomCode];
  const oldNickname = socket.nickname;

  socket.leave(oldRoomCode);

  oldRoom.users = oldRoom.users.filter((user) => user.id !== socket.id);

  if (oldRoom.users.length === 0) {
    delete rooms[oldRoomCode];
  } else {
    if (oldRoom.hostId === socket.id) {
      oldRoom.hostId = oldRoom.users[0].id;
    }

    io.to(oldRoomCode).emit("message", {
      nickname: "시스템",
      message: `${oldNickname} 퇴장`
    });

    broadcastRoomUsers(oldRoomCode);
    broadcastNotice(oldRoomCode);
  }

  if (!isDisconnect) {
    socket.roomCode = null;
  }

  broadcastRoomList();
}

io.on("connection", (socket) => {
  socket.on("getRoomList", () => {
    socket.emit("roomList", getPublicRooms());
  });

  socket.on("join", ({ nickname, roomCode }) => {
    if (!nickname || !roomCode) return;

    if (socket.roomCode) {
      leaveCurrentRoom(socket);
    }

    ensureRoom(roomCode);

    socket.nickname = nickname;
    socket.roomCode = roomCode;

    socket.join(roomCode);

    // 새로 들어온 사람은 이전 채팅을 보지 못하게
    socket.emit("clearChat");

    const room = rooms[roomCode];

    room.users.push({
      id: socket.id,
      nickname
    });

    if (!room.hostId) {
      room.hostId = socket.id;
    }

    if (room.users.length > room.maxCount) {
      room.maxCount = room.users.length;
    }

    io.to(roomCode).emit("message", {
      nickname: "시스템",
      message: `${nickname} 입장`
    });

    broadcastRoomUsers(roomCode);
    broadcastNotice(roomCode);
    broadcastRoomList();
  });

  socket.on("updateNotice", ({ roomCode, notice }) => {
    if (!roomCode || !rooms[roomCode]) return;

    const room = rooms[roomCode];
    if (room.hostId !== socket.id) return;

    room.notice = notice || "";
    broadcastNotice(roomCode);
  });

  socket.on("leaveRoom", () => {
    if (!socket.roomCode) return;
    leaveCurrentRoom(socket);
    socket.emit("leftRoom");
  });

  socket.on("chatMessage", ({ message, roomCode }) => {
    if (!message || !roomCode || !rooms[roomCode]) return;

    io.to(roomCode).emit("message", {
      nickname: socket.nickname,
      message
    });
  });

  socket.on("disconnect", () => {
    if (!socket.roomCode) return;
    leaveCurrentRoom(socket, true);
  });
});

http.listen(3000, () => {
  console.log("서버 실행중: http://localhost:3000");
});