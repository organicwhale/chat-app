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
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname + "/../client"));

const rooms = {};

/*
rooms = {
  secretCode: {
    roomName: "회의실A",
    users: [{ id, nickname }],
    maxCount: 2,
    notice: "공지내용",
    hostId: "socketId"
  }
}
*/

function getPublicRooms() {
  return Object.values(rooms).map((room) => ({
    roomName: room.roomName,
    count: room.users.length,
    maxCount: room.maxCount
  }));
}

function broadcastRoomList() {
  io.emit("roomList", getPublicRooms());
}

function findRoomCodeByName(roomName) {
  const entry = Object.entries(rooms).find(
    ([, room]) => room.roomName === roomName
  );
  return entry ? entry[0] : null;
}

function broadcastRoomUsers(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  io.to(roomCode).emit("roomUsers", {
    count: room.users.length,
    maxCount: room.maxCount,
    hostId: room.hostId,
    roomName: room.roomName
  });
}

function broadcastNotice(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  io.to(roomCode).emit("noticeUpdated", {
    notice: room.notice,
    hostId: room.hostId
  });
}

function leaveCurrentRoom(socket, isDisconnect = false) {
  if (!socket.roomCode) return;
  const roomCode = socket.roomCode;
  const room = rooms[roomCode];
  if (!room) return;

  const oldNickname = socket.nickname;

  socket.leave(roomCode);
  room.users = room.users.filter((user) => user.id !== socket.id);

  if (room.users.length === 0) {
    delete rooms[roomCode];
  } else {
    if (room.hostId === socket.id) {
      room.hostId = room.users[0].id;
    }

    io.to(roomCode).emit("message", {
      nickname: "시스템",
      message: `${oldNickname} 퇴장`
    });

    broadcastRoomUsers(roomCode);
    broadcastNotice(roomCode);
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

  socket.on("join", ({ nickname, roomName, roomCode }) => {
    if (!nickname || !roomName || !roomCode) {
      socket.emit("joinError", "이름, 방이름, 코드를 모두 입력하세요.");
      return;
    }

    const trimmedNickname = nickname.trim();
    const trimmedRoomName = roomName.trim();
    const trimmedRoomCode = roomCode.trim();

    if (!trimmedNickname || !trimmedRoomName || !trimmedRoomCode) {
      socket.emit("joinError", "이름, 방이름, 코드를 모두 입력하세요.");
      return;
    }

    // 같은 이름의 방이 이미 있으면, 그 방의 코드를 알아야 입장 가능
    const existingRoomCode = findRoomCodeByName(trimmedRoomName);

    if (existingRoomCode) {
      if (existingRoomCode !== trimmedRoomCode) {
        socket.emit("joinError", "코드가 올바르지 않습니다.");
        return;
      }
    } else {
      // 같은 코드가 이미 다른 이름의 방에 쓰이고 있으면 생성 불가
      if (rooms[trimmedRoomCode] && rooms[trimmedRoomCode].roomName !== trimmedRoomName) {
        socket.emit("joinError", "이미 사용 중인 코드입니다.");
        return;
      }
    }

    if (socket.roomCode) {
      leaveCurrentRoom(socket);
    }

    if (!rooms[trimmedRoomCode]) {
      rooms[trimmedRoomCode] = {
        roomName: trimmedRoomName,
        users: [],
        maxCount: 0,
        notice: "",
        hostId: null
      };
    }

    const room = rooms[trimmedRoomCode];

    socket.nickname = trimmedNickname;
    socket.roomCode = trimmedRoomCode;
    socket.roomName = room.roomName;

    socket.join(trimmedRoomCode);

    // 새 입장자는 이전 채팅 로그 못 보게
    socket.emit("clearChat");

    room.users.push({
      id: socket.id,
      nickname: trimmedNickname
    });

    if (!room.hostId) {
      room.hostId = socket.id;
    }

    if (room.users.length > room.maxCount) {
      room.maxCount = room.users.length;
    }

    io.to(trimmedRoomCode).emit("message", {
      nickname: "시스템",
      message: `${trimmedNickname} 입장`
    });

    broadcastRoomUsers(trimmedRoomCode);
    broadcastNotice(trimmedRoomCode);
    broadcastRoomList();
  });

  socket.on("updateNotice", ({ notice }) => {
    if (!socket.roomCode) return;
    const room = rooms[socket.roomCode];
    if (!room) return;
    if (room.hostId !== socket.id) return;

    room.notice = notice || "";
    broadcastNotice(socket.roomCode);
  });

  socket.on("chatMessage", ({ message }) => {
    if (!socket.roomCode || !message) return;
    const room = rooms[socket.roomCode];
    if (!room) return;

    io.to(socket.roomCode).emit("message", {
      nickname: socket.nickname,
      message
    });
  });

  socket.on("leaveRoom", () => {
    if (!socket.roomCode) return;
    leaveCurrentRoom(socket);
    socket.emit("leftRoom");
  });

  socket.on("disconnect", () => {
    if (!socket.roomCode) return;
    leaveCurrentRoom(socket, true);
  });
});

http.listen(3000, () => {
  console.log("서버 실행중: http://localhost:3000");
});