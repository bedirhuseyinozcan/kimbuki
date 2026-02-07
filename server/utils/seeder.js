const players = require('../data/players');
const Player = require('../models/Player');

const seedPlayers = async () => {
    try {
        const count = await Player.countDocuments();
        if (count === 0) {
            await Player.create(players);
            console.log('Veriler başarıyla eklendi!');
        }
    } catch (error) {
        console.error('Veri ekleme hatası:', error);
    }
};

module.exports = seedPlayers;
