const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname + "/../client"));

const rooms = {};

function getPublicRooms() {
  return Object.entries(rooms).map(([code, users]) => ({
    code,
    count: users.length
  }));
}

function broadcastRoomList() {
  io.emit("roomList", getPublicRooms());
}

io.on("connection", (socket) => {
  socket.on("getRoomList", () => {
    socket.emit("roomList", getPublicRooms());
  });

  socket.on("join", ({ nickname, roomCode }) => {
    if (!nickname || !roomCode) return;

    // 이미 다른 방에 있었다면 먼저 정리
    if (socket.roomCode) {
      const oldRoom = socket.roomCode;
      const oldNickname = socket.nickname;

      socket.leave(oldRoom);

      if (rooms[oldRoom]) {
        rooms[oldRoom] = rooms[oldRoom].filter((user) => user.id !== socket.id);

        if (rooms[oldRoom].length === 0) {
          delete rooms[oldRoom];
        } else {
          io.to(oldRoom).emit("message", {
            nickname: "시스템",
            message: `${oldNickname} 퇴장`
          });
          io.to(oldRoom).emit("roomUsers", rooms[oldRoom]);
        }
      }
    }

    socket.nickname = nickname;
    socket.roomCode = roomCode;

    socket.join(roomCode);

    // 새로 들어온 사람은 이전 대화 못 보게 강제 초기화
    socket.emit("clearChat");

    if (!rooms[roomCode]) {
      rooms[roomCode] = [];
    }

    const alreadyExists = rooms[roomCode].some((user) => user.id === socket.id);
    if (!alreadyExists) {
      rooms[roomCode].push({
        id: socket.id,
        nickname
      });
    }

    io.to(roomCode).emit("message", {
      nickname: "시스템",
      message: `${nickname} 입장`
    });

    io.to(roomCode).emit("roomUsers", rooms[roomCode]);
    broadcastRoomList();
  });

  socket.on("leaveRoom", () => {
    if (!socket.roomCode) return;

    const oldRoom = socket.roomCode;
    const oldNickname = socket.nickname;

    socket.leave(oldRoom);

    if (rooms[oldRoom]) {
      rooms[oldRoom] = rooms[oldRoom].filter((user) => user.id !== socket.id);

      if (rooms[oldRoom].length === 0) {
        delete rooms[oldRoom];
      } else {
        io.to(oldRoom).emit("message", {
          nickname: "시스템",
          message: `${oldNickname} 퇴장`
        });
        io.to(oldRoom).emit("roomUsers", rooms[oldRoom]);
      }
    }

    socket.roomCode = null;
    broadcastRoomList();
    socket.emit("leftRoom");
  });

  socket.on("chatMessage", ({ message, roomCode }) => {
    if (!message || !roomCode) return;

    io.to(roomCode).emit("message", {
      nickname: socket.nickname,
      message
    });
  });

  socket.on("disconnect", () => {
    if (!socket.roomCode) return;

    const oldRoom = socket.roomCode;
    const oldNickname = socket.nickname;

    if (rooms[oldRoom]) {
      rooms[oldRoom] = rooms[oldRoom].filter((user) => user.id !== socket.id);

      if (rooms[oldRoom].length === 0) {
        delete rooms[oldRoom];
      } else {
        io.to(oldRoom).emit("message", {
          nickname: "시스템",
          message: `${oldNickname} 퇴장`
        });
        io.to(oldRoom).emit("roomUsers", rooms[oldRoom]);
      }
    }

    broadcastRoomList();
  });
});

http.listen(3000, () => {
  console.log("서버 실행중: http://localhost:3000");
});