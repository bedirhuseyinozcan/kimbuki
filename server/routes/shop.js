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
    const authHeader = req.header("Authorization");
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) return res.status(401).json({ error: "Erişim reddedildi. Token yok." });

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Geçersiz veya süresi dolmuş token." });
    }
};

const { ALL_SHOP_ITEMS: ALL_ITEMS } = require("../config/catalog");

router.get("/items", (req, res) => {
    res.json(ALL_ITEMS);
});

router.post("/buy", authMiddleware, async (req, res) => {
    try {
        if (req.user?.isGuest) {
            return res.status(403).json({ error: "Mağazadan alışveriş yapmak için ücretsiz hesap oluşturmalısınız." });
        }
        const { itemId } = req.body || {};
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
