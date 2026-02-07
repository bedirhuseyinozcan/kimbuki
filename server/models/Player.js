const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Lütfen oyuncu ismini giriniz']
    },
    team: {
        type: String,
        required: true
    },
    league: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: true
    },
    nation: {
        type: String,
        required: true
    },
    number: {
        type: Number
    },
    career: {
        type: [String],
        default: []
    },
    titles: {
        type: [String],
        default: []
    },
    description: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Player', PlayerSchema);
