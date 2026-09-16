const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "notekim_super_secret_key_2026";

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Erişim reddedildi. Token yok." });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Geçersiz veya süresi dolmuş token." });
    }
};

const PREMIUM_AVATARS = [
    { id: 'Warrior', price: 100, label: 'Savaşçı', icon: '⚔️' },
    { id: 'Wizard', price: 200, label: 'Büyücü', icon: '🔮' },
    { id: 'Rogue', price: 300, label: 'Suikastçi', icon: '🗡️' },
    { id: 'Ranger', price: 400, label: 'Okçu', icon: '🏹' },
    { id: 'Monk', price: 500, label: 'Keşiş', icon: '🥋' },
    { id: 'Cleric', price: 600, label: 'Şifacı', icon: '✨' }
];

router.get("/items", (req, res) => {
    res.json(PREMIUM_AVATARS);
});

router.post("/buy", authMiddleware, async (req, res) => {
    try {
        const { avatarId } = req.body;
        const avatarToBuy = PREMIUM_AVATARS.find(a => a.id === avatarId);
        
        if (!avatarToBuy) {
            return res.status(400).json({ error: "Böyle bir karakter bulunamadı." });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

        if (user.unlockedAvatars.includes(avatarId)) {
            return res.status(400).json({ error: "Bu karaktere zaten sahipsiniz." });
        }

        if (user.gold < avatarToBuy.price) {
            return res.status(400).json({ error: "Yeterli altınınız yok." });
        }

        user.gold -= avatarToBuy.price;
        user.unlockedAvatars.push(avatarId);
        await user.save();

        res.json({
            message: "Satın alma başarılı!",
            gold: user.gold,
            unlockedAvatars: user.unlockedAvatars
        });
    } catch (error) {
        console.error("Shop buy error:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
