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
        default: 'default-violet'
    },
    gold: {
        type: Number,
        default: 0
    },
    unlockedAvatars: {
        type: [String],
        default: ['default-violet', 'default-red', 'default-blue', 'default-green', 'default-yellow', 'default-pink']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", userSchema);
