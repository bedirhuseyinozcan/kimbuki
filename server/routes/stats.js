const express = require("express");
const router = express.Router();
const User = require("../models/User");

let leaderboardCache = null;
let leaderboardCacheTime = 0;
const LEADERBOARD_TTL_MS = 30000;

router.get("/live", (req, res) => {
    const gameManager = req.app.locals.gameManager;
    if (!gameManager) return res.json({ activeRooms: 0, activePlayers: 0 });
    res.json(gameManager.getStats());
});

router.get("/leaderboard", async (req, res) => {
    try {
        const now = Date.now();
        if (leaderboardCache && now - leaderboardCacheTime < LEADERBOARD_TTL_MS) {
            return res.json(leaderboardCache);
        }
        const topUsers = await User.find({}, "-_id username gold reputation avatar nameColor title")
            .sort({ reputation: -1, gold: -1 })
            .limit(10)
            .lean();
        leaderboardCache = topUsers;
        leaderboardCacheTime = now;
        res.json(topUsers);
    } catch (err) {
        console.error("Leaderboard error:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
