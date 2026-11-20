const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
require("dotenv").config();
const { Server } = require("socket.io");

const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET ortam değişkeni tanımlanmamış!");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

const DEFAULT_ORIGINS = [
  "https://kimbuki.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

const corsOriginValidator = (origin, callback) => {
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error("CORS policy: origin not allowed"));
};

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: corsOriginValidator, methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json({ limit: "16kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin." }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla istek gönderildi. Lütfen biraz bekleyin." }
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/", apiLimiter);

const connectDB = require("./config/db");

const server = http.createServer(app);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/shop", require("./routes/shop"));
app.use("/api/stats", require("./routes/stats"));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "kimbuki-server" });
});

const io = new Server(server, {
  cors: { origin: corsOriginValidator, methods: ["GET", "POST"] },
});

const jwt = require("jsonwebtoken");

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }, (err, decoded) => {
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

async function bootstrap() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`server running on http://localhost:${PORT}`);
  });
}

bootstrap();

const shutdown = (signal) => {
  console.log(`${signal} alındı, sunucu kapatılıyor...`);
  io.close(() => {
    server.close(async () => {
      try {
        await mongoose.connection.close();
      } catch (e) {
        console.error("MongoDB kapatma hatası:", e);
      }
      process.exit(0);
    });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
