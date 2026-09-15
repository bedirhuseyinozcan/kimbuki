const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.get("/live", (req, res) => {
    const gameManager = req.app.locals.gameManager;
    if (!gameManager) return res.json({ activeRooms: 0, activePlayers: 0 });
    res.json(gameManager.getStats());
});

router.get("/leaderboard", async (req, res) => {
    try {
        const topUsers = await User.find({}, "username gold avatar").sort({ gold: -1 }).limit(10).lean();
        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ error: "Sunucu hatasi" });
    }
});

module.exports = router;
