const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require('./config/db');
const seedPlayers = require('./utils/seeder');

const PORT = process.env.PORT || 4000;


const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

connectDB().then(() => {
  seedPlayers();
});

const server = http.createServer(app);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "ben-kimim-futbol-server" });
});


const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

const GameManager = require("./game/GameManager");

const gameManager = new GameManager(io);

io.on("connection", (socket) => {
  gameManager.handleConnection(socket);
});

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
