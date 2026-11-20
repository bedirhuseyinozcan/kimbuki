const BaseJoker = require('./BaseJoker');

class BloodTie extends BaseJoker {
    constructor() {
        super(5, "Kan Bağı", "prismatic");
    }

    execute(room, user, payload, context) {
        const targetId = context.targetId;
        if (targetId && typeof targetId === 'string') {
            if (targetId === user.id) {
                // Prevent self-link exploit when reflected by MirrorShield
                room.addChatLog({ system: true, message: `🛡️ Kan Bağı aynadan sekti ve boşa gitti! (${user.name} kendine bağlanamaz)`, timestamp: Date.now() });
                return true;
            }
            user.bloodTieTarget = targetId;
            room.addChatLog({ system: true, message: `🩸 Kan Bağı kullanıldı! ${user.name} hedefini seçti, kaderleri artık bir!`, timestamp: Date.now() });
            room.io.to(room.code).emit("game:visual_effect", { type: 'blood_tie', targetId: targetId });
            room.io.to(room.code).emit("game:visual_effect", { type: 'blood_tie', targetId: user.id });
            return true;
        }
        return false;
    }
}

module.exports = BloodTie;
