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

const PREMIUM_COLORS = [
    { id: 'color_neon_pink', price: 1000, label: 'Neon Pembe', icon: '🎀', type: 'color' },
    { id: 'color_electric_blue', price: 1000, label: 'Elektrik Mavisi', icon: '⚡', type: 'color' },
    { id: 'color_gold', price: 2000, label: 'Saf Altın', icon: '✨', type: 'color' }
];

const PREMIUM_TITLES = [
    { id: 'title_rich', price: 5000, label: 'Ünvan: Zengin', icon: '👑', type: 'title' },
    { id: 'title_troll', price: 1500, label: 'Ünvan: Trol', icon: '🤡', type: 'title' },
    { id: 'title_collector', price: 2500, label: 'Ünvan: Koleksiyoncu', icon: '💎', type: 'title' }
];

const ALL_ITEMS = [...PREMIUM_AVATARS, ...PREMIUM_PEDESTALS, ...PREMIUM_COLORS, ...PREMIUM_TITLES];

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

        if (!user.unlockedAvatars) user.unlockedAvatars = ['Warrior'];
        if (!user.unlockedPedestals) user.unlockedPedestals = ['default_stone'];
        if (!user.unlockedNameColors) user.unlockedNameColors = ['text-white'];
        if (!user.unlockedTitles) user.unlockedTitles = [];

        let collection;
        if (itemToBuy.type === 'avatar') collection = user.unlockedAvatars;
        else if (itemToBuy.type === 'pedestal') collection = user.unlockedPedestals;
        else if (itemToBuy.type === 'color') collection = user.unlockedNameColors;
        else if (itemToBuy.type === 'title') collection = user.unlockedTitles;

        if (itemToBuy.type === 'pedestal' && !collection.includes('default_stone')) {
            collection.push('default_stone');
        }
        if (itemToBuy.type === 'avatar' && !collection.includes('Warrior')) {
            collection.push('Warrior');
        }
        if (itemToBuy.type === 'color' && !collection.includes('text-white')) {
            collection.push('text-white');
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
        
        user.markModified('unlockedAvatars');
        user.markModified('unlockedPedestals');
        user.markModified('unlockedNameColors');
        user.markModified('unlockedTitles');

        await user.save();

        res.json({
            message: "Satın alma başarılı!",
            gold: user.gold,
            unlockedAvatars: user.unlockedAvatars,
            unlockedPedestals: user.unlockedPedestals,
            unlockedNameColors: user.unlockedNameColors,
            unlockedTitles: user.unlockedTitles
        });
    } catch (error) {
        console.error("Shop buy error:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
