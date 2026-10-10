const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();
const { Server } = require("socket.io");
const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json()); 

const connectDB = require("./config/db");
connectDB(); 

const server = http.createServer(app);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/shop", require("./routes/shop"));
app.use("/api/stats", require("./routes/stats"));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "ben-kimim-futbol-server" });
});


const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const jwt = require("jsonwebtoken");

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "gizli_anahtar_buraya", (err, decoded) => {
      if (!err && decoded) {
        socket.data.userId = decoded.id;
      }
      next();
    });
  } else {
    next();
  }
});

const GameManager = require("./game/GameManager");

const gameManager = new GameManager(io);
app.locals.gameManager = gameManager;

io.on("connection", (socket) => {
  gameManager.handleConnection(socket);
});

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
