const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        default: 'Warrior'
    },
    gold: {
        type: Number,
        default: 0
    },
    unlockedAvatars: {
        type: [String],
        default: ['Warrior']
    },
    pedestal: {
        type: String,
        default: 'default_stone'
    },
    unlockedPedestals: {
        type: [String],
        default: ['default_stone']
    },
    nameColor: {
        type: String,
        default: 'text-white'
    },
    unlockedNameColors: {
        type: [String],
        default: ['text-white']
    },
    title: {
        type: String,
        default: ''
    },
    unlockedTitles: {
        type: [String],
        default: []
    },
    lastLoginDate: {
        type: Date,
        default: null
    },
    loginStreak: {
        type: Number,
        default: 0
    },

    reputation: {
        type: Number,
        default: 0
    },
    quests: {
        active: [{
            id: String,
            type: { type: String },
            target: Number,
            progress: { type: Number, default: 0 },
            rewardGold: { type: Number, default: 0 },
            rewardRep: { type: Number, default: 0 },
            title: String,
            isClaimed: { type: Boolean, default: false }
        }],
        lastResetDate: { type: String, default: null }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", userSchema);
