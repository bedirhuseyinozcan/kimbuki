const BaseJoker = require('./BaseJoker');

class DoubleMagazine extends BaseJoker {
    constructor() {
        super(2, "Çift Şarjör", "gold");
    }

    execute(room, user, payload, context) {
        user.extraQuestions = 1;
        user.extraQuestionChain = true;
        room.addChatLog({ system: true, message: `🔫 ${user.name}, Çift Şarjör kullandı! (Ekstra +1 soru hakkı kazandı ve aldığı her 'Evet' oyunda yeni bir hak kazanacak!)`, timestamp: Date.now() });
        room.io.to(room.code).emit("game:visual_effect", { type: 'extra_ammo', targetId: user.id });
        return true;
    }
}

module.exports = DoubleMagazine;
