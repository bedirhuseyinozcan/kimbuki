const BaseJoker = require('./BaseJoker');

class SecretShield extends BaseJoker {
    constructor() {
        super(9, "Gizli Kalkan", "gold");
    }

    execute(room, user, payload, context) {
        user.shieldActive = true;
        room.addChatLog({ system: true, privateTo: user.id, message: "Sistem (Özel): Gizli Kalkan aktif! Bir sonraki ölümcül hatanı veya bombayı engelleyecek.", timestamp: Date.now() });
        room.io.to(user.id).emit("game:visual_effect", { type: 'shield_cast', targetId: user.id });
        return true;
    }
}

module.exports = SecretShield;
