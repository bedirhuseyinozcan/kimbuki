const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
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

function getRankInfo(reputation) {
    let title = "Çaylak";
    let nextThreshold = 400;
    
    if (reputation >= 5000) {
        title = "Kimbuki Üstadı";
        nextThreshold = null;
    } else if (reputation >= 2500) {
        title = "Zihin Okuyucu";
        nextThreshold = 5000;
    } else if (reputation >= 1000) {
        title = "Dedektif";
        nextThreshold = 2500;
    } else if (reputation >= 400) {
        title = "Gözlemci";
        nextThreshold = 1000;
    }
    
    return { title, reputation, nextThreshold };
}

const QUEST_POOL = [
    { id: "play_1", type: "play", target: 1, rewardGold: 50, rewardRep: 5, title: "Isınma Turu: 1 Oyun Oyna" },
    { id: "play_3", type: "play", target: 3, rewardGold: 100, rewardRep: 10, title: "Günde 3 Oyun Oyna" },
    { id: "play_5", type: "play", target: 5, rewardGold: 200, rewardRep: 15, title: "Maraton: 5 Oyun Oyna" },
    { id: "play_10", type: "play", target: 10, rewardGold: 500, rewardRep: 30, title: "Bağımlı: 10 Oyun Oyna" },
    
    { id: "win_1", type: "win", target: 1, rewardGold: 150, rewardRep: 20, title: "Zihin Okuyucu: 1 Oyun Kazan" },
    { id: "win_3", type: "win", target: 3, rewardGold: 400, rewardRep: 50, title: "Şampiyon: 3 Oyun Kazan" },
    { id: "win_5", type: "win", target: 5, rewardGold: 800, rewardRep: 100, title: "Efsanevi: 5 Oyun Kazan" },
    
    { id: "buy_1", type: "buy_avatar", target: 1, rewardGold: 50, rewardRep: 30, title: "Moda İkonu: Mağazadan 1 Karakter Al" },
    
    { id: "bet_1", type: "bet_win", target: 1, rewardGold: 100, rewardRep: 15, title: "Kumarbaz: 1 Kere Bahis Tuttur" },
    { id: "bet_3", type: "bet_win", target: 3, rewardGold: 350, rewardRep: 40, title: "Kahin: 3 Kere Bahis Tuttur" },

    { id: "joker_1", type: "use_joker", target: 1, rewardGold: 80, rewardRep: 10, title: "Kaos: 1 Kere Joker Kullan" },
    { id: "joker_3", type: "use_joker", target: 3, rewardGold: 250, rewardRep: 25, title: "Trol: 3 Kere Joker Kullan" }
];

function generateDailyQuests() {
    const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(q => ({ ...q, progress: 0, isClaimed: false }));
}

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Lütfen kullanıcı adı, e-posta ve şifre girin." });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Lütfen geçerli bir e-posta adresi girin." });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: "Kullanıcı adı en az 3 karakter olmalıdır." });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: "Şifre en az 8 karakter olmalıdır." });
        }
        if (!/(?=.*[a-z])/.test(password)) {
            return res.status(400).json({ error: "Şifre en az bir küçük harf içermelidir." });
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            return res.status(400).json({ error: "Şifre en az bir büyük harf içermelidir." });
        }
        if (!/(?=.*\d)/.test(password)) {
            return res.status(400).json({ error: "Şifre en az bir rakam (sayı) içermelidir." });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: "Bu kullanıcı adı veya e-posta zaten kullanımda." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            avatar: "Warrior",
            pedestal: "default_stone",
            gold: 0,
            unlockedAvatars: ["Warrior"],
            unlockedPedestals: ["default_stone"],
            unlockedNameColors: ["text-white"],
            unlockedTitles: []
        });
        await user.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" });

        res.status(201).json({
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email, 
                avatar: user.avatar,
                gold: user.gold,
                unlockedAvatars: user.unlockedAvatars,
rankInfo: getRankInfo(user.reputation || 0)
            }
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Lütfen e-posta ve şifre girin." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Kullanıcı bulunamadı." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Hatalı şifre." });
        }

        let isModified = false;
        if (!user.unlockedAvatars) user.unlockedAvatars = [];
        if (!user.unlockedAvatars.includes('Warrior')) {
            user.unlockedAvatars.push('Warrior');
            isModified = true;
        }
        if (user.avatar && user.avatar.startsWith('default-')) {
            user.avatar = 'Warrior';
            isModified = true;
        }
        if (user.unlockedAvatars.some(a => a.startsWith('default-'))) {
            user.unlockedAvatars = user.unlockedAvatars.filter(a => !a.startsWith('default-'));
            isModified = true;
        }
        if (!user.unlockedPedestals) user.unlockedPedestals = [];
        if (!user.unlockedPedestals.includes('default_stone')) {
            user.unlockedPedestals.push('default_stone');
            if (!user.pedestal) user.pedestal = 'default_stone';
            isModified = true;
        }
        if (!user.unlockedNameColors) user.unlockedNameColors = [];
        if (!user.unlockedNameColors.includes('text-white')) {
            user.unlockedNameColors.push('text-white');
            if (!user.nameColor) user.nameColor = 'text-white';
            isModified = true;
        }
        if (!user.unlockedTitles) {
            user.unlockedTitles = [];
            isModified = true;
        }
        if (isModified) await user.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" });

        res.json({
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email, 
                avatar: user.avatar,
                pedestal: user.pedestal,
                nameColor: user.nameColor,
                title: user.title,
                gold: user.gold,
                unlockedAvatars: user.unlockedAvatars,
                unlockedPedestals: user.unlockedPedestals,
                unlockedNameColors: user.unlockedNameColors,
                unlockedTitles: user.unlockedTitles,
                rankInfo: getRankInfo(user.reputation || 0)
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "Kullanıcı bulunamadı." });
        }

        let arraysUpdated = false;

        if (!user.unlockedAvatars) user.unlockedAvatars = [];
        if (!user.unlockedAvatars.includes('Warrior')) {
            user.unlockedAvatars.push('Warrior');
            arraysUpdated = true;
        }
        if (user.avatar && user.avatar.startsWith('default-')) {
            user.avatar = 'Warrior';
            arraysUpdated = true;
        }
        if (user.unlockedAvatars.some(a => a.startsWith('default-'))) {
            user.unlockedAvatars = user.unlockedAvatars.filter(a => !a.startsWith('default-'));
            arraysUpdated = true;
        }
        if (!user.unlockedPedestals) user.unlockedPedestals = [];
        if (!user.unlockedPedestals.includes('default_stone')) {
            user.unlockedPedestals.push('default_stone');
            if (!user.pedestal) user.pedestal = 'default_stone';
            arraysUpdated = true;
        }

        let canClaimDaily = false;
        let streak = user.loginStreak || 0;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (!user.lastLoginDate || user.lastLoginDate < today) {
            canClaimDaily = true;
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (!user.lastLoginDate || user.lastLoginDate < yesterday) {
                streak = 0; 
            }
        }

        if (!user.unlockedNameColors) user.unlockedNameColors = [];
        if (!user.unlockedNameColors.includes('text-white')) {
            user.unlockedNameColors.push('text-white');
            if (!user.nameColor) user.nameColor = 'text-white';
            arraysUpdated = true;
        }

        if (!user.unlockedTitles) {
            user.unlockedTitles = [];
            arraysUpdated = true;
        }

        const todayStr = new Date().toDateString();
        let questsUpdated = false;
        
        if (!user.quests) {
            user.quests = {};
        }

        if (user.quests.lastResetDate !== todayStr) {
            user.quests.active = generateDailyQuests();
            user.quests.lastResetDate = todayStr;
            user.markModified('quests');
            questsUpdated = true;
        }

        if (arraysUpdated) {
            user.markModified('unlockedAvatars');
            user.markModified('unlockedPedestals');
            user.markModified('unlockedNameColors');
            user.markModified('unlockedTitles');
        }

        if (questsUpdated || canClaimDaily || arraysUpdated) await user.save();

        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            pedestal: user.pedestal,
            nameColor: user.nameColor,
            title: user.title,
            gold: user.gold,
            unlockedAvatars: user.unlockedAvatars,
            unlockedPedestals: user.unlockedPedestals,
            unlockedNameColors: user.unlockedNameColors,
            unlockedTitles: user.unlockedTitles,
            rankInfo: getRankInfo(user.reputation || 0),
            quests: user.quests?.active || [],
            canClaimDaily,
            loginStreak: streak
        });
    } catch (error) {
        console.error("GET /me error:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

router.post("/daily-reward", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (user.lastLoginDate && user.lastLoginDate >= today) {
            return res.status(400).json({ error: "Bugünün ödülünü zaten aldın!" });
        }

        let streak = user.loginStreak || 0;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (user.lastLoginDate && user.lastLoginDate >= yesterday) {
            streak++;
        } else {
            streak = 1;
        }
        if (streak > 7) streak = 7;

        const rewardAmounts = { 1: 50, 2: 100, 3: 150, 4: 200, 5: 250, 6: 300, 7: 500 };
        const amount = rewardAmounts[streak] || 50;

        user.gold += amount;
        user.lastLoginDate = today;
        user.loginStreak = streak;
        await user.save();

        res.json({ success: true, amount, streak, gold: user.gold });
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const { username, avatar, pedestal, nameColor, title } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

        if (username && username !== user.username) {
            const existing = await User.findOne({ username });
            if (existing) return res.status(400).json({ error: "Bu kullanıcı adı zaten kullanımda." });
            user.username = username;
        }

        if (!user.unlockedAvatars) user.unlockedAvatars = ['Warrior'];
        if (!user.unlockedPedestals) user.unlockedPedestals = ['default_stone'];
        if (!user.unlockedNameColors) user.unlockedNameColors = ['text-white'];
        if (!user.unlockedTitles) user.unlockedTitles = [];

        if (avatar && user.unlockedAvatars.includes(avatar)) {
            user.avatar = avatar;
        }

        if (pedestal && user.unlockedPedestals.includes(pedestal)) {
            user.pedestal = pedestal;
        }

        if (nameColor && user.unlockedNameColors.includes(nameColor)) {
            user.nameColor = nameColor;
        }

        if (title !== undefined && (title === '' || user.unlockedTitles.includes(title))) {
            user.title = title;
        }

        await user.save();
        res.json({ 
            id: user._id, 
            username: user.username, 
            avatar: user.avatar,
            pedestal: user.pedestal,
            nameColor: user.nameColor,
            title: user.title,
            gold: user.gold,
            unlockedAvatars: user.unlockedAvatars,
            unlockedPedestals: user.unlockedPedestals,
            unlockedNameColors: user.unlockedNameColors,
            unlockedTitles: user.unlockedTitles,
            rankInfo: getRankInfo(user.reputation || 0)
        });
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

router.post("/claim-quest", authMiddleware, async (req, res) => {
    try {
        const { questId } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user || !user.quests || !user.quests.active) return res.status(400).json({ error: "Görev bulunamadı." });
        
        const quest = user.quests.active.find(q => q.id === questId);
        if (!quest) return res.status(400).json({ error: "Görev bulunamadı." });
        if (quest.isClaimed) return res.status(400).json({ error: "Bu ödülü zaten aldın." });
        if (quest.progress < quest.target) return res.status(400).json({ error: "Görev henüz tamamlanmadı." });

        quest.isClaimed = true;
        user.gold += quest.rewardGold;
        user.reputation += quest.rewardRep;
        
        user.markModified('quests');
        await user.save();

        res.json({
            success: true,
            gold: user.gold,
            rankInfo: getRankInfo(user.reputation),
            quests: user.quests.active
        });
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
