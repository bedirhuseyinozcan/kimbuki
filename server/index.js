const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "ben-kimim-futbol-server" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});


const rooms = new Map();

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("room:create", ({ name }, cb) => {
    const roomCode = createRoomCode();
    rooms.set(roomCode, { users: [{ id: socket.id, name }] });

    socket.join(roomCode);
    io.to(roomCode).emit("room:users", rooms.get(roomCode).users);

    cb?.({ ok: true, roomCode });
  });

  socket.on("room:join", ({ roomCode, name }, cb) => {
    const code = String(roomCode || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: "ROOM_NOT_FOUND" });

    room.users.push({ id: socket.id, name });
    socket.join(code);

    io.to(code).emit("room:users", room.users);
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const [code, room] of rooms.entries()) {
      const before = room.users.length;
      room.users = room.users.filter((u) => u.id !== socket.id);

      if (room.users.length !== before) {
        if (room.users.length === 0) rooms.delete(code);
        else io.to(code).emit("room:users", room.users);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
