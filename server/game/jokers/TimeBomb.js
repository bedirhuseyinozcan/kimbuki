const BaseJoker = require('./BaseJoker');

class TimeBomb extends BaseJoker {
    constructor() {
        super(7, "Saatli Bomba", "prismatic");
    }

    execute(room, user, payload, context) {
        const targetId = context.targetId;
        const initialTargetId = context.initialTargetId;

        if (targetId && typeof targetId === 'string') {
            const target = room.users.find(u => u.id === targetId);
            if (target) {
                // Keep casterId = user.id on reflection so defusing doesn't bounce back onto MirrorShield owner
                target.timeBomb = { casterId: user.id, roundsLeft: 3 };
                room.addChatLog({ system: true, message: `💣 SAATLİ BOMBA! ${target.name}'in üzerine bomba yerleştirildi. 3 tur içinde bilemezse patlayacak!`, timestamp: Date.now() });
                room.io.to(room.code).emit("game:visual_effect", { type: 'bomb_plant', targetId: target.id });
                return true;
            }
        }
        return false;
    }
}

module.exports = TimeBomb;
