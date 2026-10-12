const BaseJoker = require('./BaseJoker');

class Silencer extends BaseJoker {
    constructor() {
        super(3, "Susturucu", "gold");
    }

    execute(room, user, payload, context) {
        const targetId = context.targetId;
        if (targetId && typeof targetId === 'string') {
            const silenceTarget = room.users.find(u => u.id === targetId);
            if (silenceTarget) {
                silenceTarget.silencedTurns = 2;
                room.addChatLog({ system: true, message: `🤫 Susturucu kullanıldı! ${silenceTarget.name}, 2 tur boyunca susturuldu.`, timestamp: Date.now() });
                room.io.to(room.code).emit("game:visual_effect", { type: 'silence_cast', targetId: silenceTarget.id });
                return true;
            }
        }
        return false;
    }
}

module.exports = Silencer;
