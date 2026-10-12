const BaseJoker = require('./BaseJoker');

class LetterOpener extends BaseJoker {
    constructor() {
        super(1, "Harf Açıcı", "common");
    }

    execute(room, user, payload, context) {
        room.addChatLog({ system: true, message: `🔍 ${user.name}, Harf Açıcı kullanarak gizli bir ipucu elde etti!`, timestamp: Date.now() });
        room.openLettersForUser(user, 1);
        room.io.to(room.code).emit("game:visual_effect", { type: 'letter_reveal', targetId: user.id });
        return true;
    }
}

module.exports = LetterOpener;
