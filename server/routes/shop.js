const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET ortam değişkeni tanımlanmamış!");
    process.exit(1);
}

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

        let collectionKey = 'unlockedAvatars';
        if (itemToBuy.type === 'pedestal') collectionKey = 'unlockedPedestals';
        else if (itemToBuy.type === 'color') collectionKey = 'unlockedNameColors';
        else if (itemToBuy.type === 'title') collectionKey = 'unlockedTitles';

        const updatedUser = await User.findOneAndUpdate(
            {
                _id: req.user.id,
                gold: { $gte: itemToBuy.price },
                [collectionKey]: { $ne: itemId }
            },
            {
                $inc: { gold: -itemToBuy.price },
                $addToSet: { [collectionKey]: itemId }
            },
            { new: true }
        );

        if (!updatedUser) {
            const existingUser = await User.findById(req.user.id);
            if (!existingUser) {
                return res.status(404).json({ error: "Kullanıcı bulunamadı." });
            }
            if (existingUser[collectionKey]?.includes(itemId)) {
                return res.status(400).json({ error: "Bu eşyaya zaten sahipsiniz." });
            }
            if (existingUser.gold < itemToBuy.price) {
                return res.status(400).json({ error: "Yeterli altınınız yok." });
            }
            return res.status(400).json({ error: "Satın alma işlemi gerçekleştirilemedi." });
        }

        if (itemToBuy.type === 'avatar' && updatedUser.quests && updatedUser.quests.active) {
            let questUpdated = false;
            updatedUser.quests.active.forEach(q => {
                if (q.type === 'buy_avatar' && !q.isClaimed && q.progress < q.target) {
                    q.progress++;
                    questUpdated = true;
                }
            });
            if (questUpdated) {
                updatedUser.markModified('quests');
                await updatedUser.save();
            }
        }

        res.json({
            message: "Satın alma başarılı!",
            gold: updatedUser.gold,
            unlockedAvatars: updatedUser.unlockedAvatars,
            unlockedPedestals: updatedUser.unlockedPedestals,
            unlockedNameColors: updatedUser.unlockedNameColors,
            unlockedTitles: updatedUser.unlockedTitles
        });
    } catch (error) {
        console.error("Shop buy error:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
