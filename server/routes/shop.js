const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "kimbuki_super_secret_key_2026";

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
    { id: 'Warrior', price: 100, label: 'Savaşçı', icon: '⚔️', type: 'avatar' },
    { id: 'Wizard', price: 200, label: 'Büyücü', icon: '🔮', type: 'avatar' },
    { id: 'Rogue', price: 300, label: 'Suikastçi', icon: '🗡️', type: 'avatar' },
    { id: 'Ranger', price: 400, label: 'Okçu', icon: '🏹', type: 'avatar' },
    { id: 'Monk', price: 500, label: 'Keşiş', icon: '🥋', type: 'avatar' },
    { id: 'Cleric', price: 600, label: 'Şifacı', icon: '✨', type: 'avatar' }
];

const PREMIUM_PEDESTALS = [
    { id: 'gold_pedestal', price: 500, label: 'Altın Kaide', icon: '🏆', type: 'pedestal' },
    { id: 'lava_ring', price: 800, label: 'Lav Halkası', icon: '🌋', type: 'pedestal' },
    { id: 'ice_block', price: 600, label: 'Buz Kütlesi', icon: '🧊', type: 'pedestal' },
    { id: 'cloud_base', price: 1000, label: 'Uçan Bulut', icon: '☁️', type: 'pedestal' }
];

const ALL_ITEMS = [...PREMIUM_AVATARS, ...PREMIUM_PEDESTALS];

router.get("/items", (req, res) => {
    res.json(ALL_ITEMS);
});

router.post("/buy", authMiddleware, async (req, res) => {
    try {
        const { itemId } = req.body;
        const itemToBuy = ALL_ITEMS.find(a => a.id === itemId);
        
        if (!itemToBuy) {
            return res.status(400).json({ error: "Böyle bir eşya bulunamadı." });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

        const isAvatar = itemToBuy.type === 'avatar';
        let collection = isAvatar ? user.unlockedAvatars : user.unlockedPedestals;

        if (!isAvatar && !collection.includes('default_stone')) {
            collection.push('default_stone');
        }
        if (isAvatar && !collection.includes('Warrior')) {
            collection.push('Warrior');
        }

        if (collection.includes(itemId)) {
            return res.status(400).json({ error: "Bu eşyaya zaten sahipsiniz." });
        }

        if (user.gold < itemToBuy.price) {
            return res.status(400).json({ error: "Yeterli altınınız yok." });
        }

        user.gold -= itemToBuy.price;
        collection.push(itemId);
        
        if (user.quests && user.quests.active) {
            user.quests.active.forEach(q => {
                if (q.type === 'buy_avatar' && !q.isClaimed && q.progress < q.target) q.progress++;
            });
            user.markModified('quests');
        }
        
        await user.save();

        res.json({
            message: "Satın alma başarılı!",
            gold: user.gold,
            unlockedAvatars: user.unlockedAvatars,
            unlockedPedestals: user.unlockedPedestals
        });
    } catch (error) {
        console.error("Shop buy error:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
