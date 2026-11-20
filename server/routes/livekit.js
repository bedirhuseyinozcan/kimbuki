const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { AccessToken } = require("livekit-server-sdk");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET ortam değişkeni tanımlanmamış!");
    process.exit(1);
}

router.get("/token", async (req, res) => {
    try {
        const rawRoom = req.query.room;
        if (typeof rawRoom !== "string" || !rawRoom.trim()) {
            return res.status(400).json({ error: "Geçersiz oda kodu." });
        }
        const roomCode = rawRoom.trim().toUpperCase();
        if (!/^[A-Z0-9_-]{2,20}$/.test(roomCode)) {
            return res.status(400).json({ error: "Geçersiz oda kodu formatı." });
        }

        const authHeader = req.header("Authorization");
        const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
        if (!token) {
            return res.status(401).json({ error: "Yetkilendirme gerekli." });
        }

        let userId = "";
        try {
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
            userId = decoded?.id ? String(decoded.id) : "";
        } catch {
            return res.status(401).json({ error: "Geçersiz veya süresi dolmuş token." });
        }

        if (!userId) {
            return res.status(401).json({ error: "Geçersiz kullanıcı kimliği." });
        }

        const gameManager = req.app.locals.gameManager;
        const room = gameManager?.rooms?.get(roomCode);
        if (!room) {
            return res.status(404).json({ error: "Oda bulunamadı." });
        }

        // IDOR Protection: verify caller is actually a member of this room
        const member = room.users.find((u) => u.dbId && String(u.dbId) === userId);
        if (!member) {
            return res.status(403).json({ error: "Bu odanın ses kanalına erişim yetkiniz yok." });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        if (!apiKey || !apiSecret) {
            console.error("[LiveKit] LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not configured on server.");
            return res.status(500).json({ error: "Ses sunucusu şu an yapılandırılmamış." });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: userId,
            name: member.name || "Oyuncu",
        });
        at.addGrant({
            room: roomCode,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
        });

        const livekitToken = await at.toJwt();
        return res.json({ token: livekitToken });
    } catch (error) {
        console.error("[LiveKit] Token error:", error);
        return res.status(500).json({ error: "Ses bağlantısı oluşturulamadı." });
    }
});

module.exports = router;
