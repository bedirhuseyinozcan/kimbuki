const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.post("/login", async (req, res) => {
    try {
        const { username, avatar } = req.body;
        if (!username) {
            return res.status(400).json({ error: "Lütfen bir kullanıcı adı girin." });
        }

        let user = await User.findOne({ username });

        if (user) {
            user.avatar = avatar || user.avatar;
            user.createdAt = Date.now();
            await user.save();
        } else {
            user = new User({ username, avatar: avatar || 1 });
            await user.save();
        }

        res.json({
            id: user._id,
            username: user.username,
            avatar: user.avatar
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

router.get("/me/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "Oturum süresi dolmuş." });
        }
        res.json({
            id: user._id,
            username: user.username,
            avatar: user.avatar
        });
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
