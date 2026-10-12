const BaseJoker = require('./BaseJoker');

class RussianRoulette extends BaseJoker {
    constructor() {
        super(6, "Rus Ruleti", "prismatic");
    }

    execute(room, user, payload, context) {
        user.russianRouletteActive = true;
        room.addChatLog({ system: true, message: `💀 RUS RULETİ! ${user.name} hemen tahmin etmek zorunda!`, timestamp: Date.now() });
        room.openLettersForUser(user, 2);
        room.io.to(room.code).emit("game:visual_effect", { type: 'roulette_start', targetId: user.id });
        return true;
    }
}

module.exports = RussianRoulette;
