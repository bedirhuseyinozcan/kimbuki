const BaseJoker = require('./BaseJoker');

class MirrorShield extends BaseJoker {
    constructor() {
        super(8, "Ayna Kalkanı", "gold");
    }

    execute(room, user, payload, context) {
        user.mirrorRoundsLeft = 3;
        room.addChatLog({ system: true, privateTo: user.id, message: "Sistem (Özel): Ayna (Kalkan) aktif! 3 tur boyunca sana atılan kötü niyetli jokerler atan kişiye geri sekecek.", timestamp: Date.now() });
        room.io.to(user.id).emit("game:visual_effect", { type: 'mirror_cast', targetId: user.id });
        return true;
    }
}

module.exports = MirrorShield;
