const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/../client'));

io.on('connection', (socket) => {
  socket.on('join', ({ nickname, roomCode }) => {
    socket.nickname = nickname;
    socket.join(roomCode);
    socket.roomCode = roomCode;
    io.to(roomCode).emit('message', { nickname: '시스템', message: `${nickname}님 입장` });
  });

  socket.on('chatMessage', ({ message, roomCode }) => {
    io.to(roomCode).emit('message', { nickname: socket.nickname, message });
  });

  socket.on('disconnect', () => {
    if (socket.roomCode) {
      io.to(socket.roomCode).emit('message', { nickname: '시스템', message: `${socket.nickname}님 퇴장` });
    }
  });
});

http.listen(3000, () => {
  console.log('서버 실행중: http://localhost:3000');
});
