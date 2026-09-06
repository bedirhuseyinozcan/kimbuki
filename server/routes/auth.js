const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
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
            avatar: 1
        });
        await user.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" });

        res.status(201).json({
            token,
            user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar }
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

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" });

        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar }
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
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const { username, avatar } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

        if (username && username !== user.username) {
            const existing = await User.findOne({ username });
            if (existing) return res.status(400).json({ error: "Bu kullanıcı adı zaten kullanımda." });
            user.username = username;
        }

        if (avatar) user.avatar = avatar;

        await user.save();
        res.json({ id: user._id, username: user.username, avatar: user.avatar });
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
