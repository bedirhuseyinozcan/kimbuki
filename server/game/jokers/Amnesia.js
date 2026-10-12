const BaseJoker = require('./BaseJoker');

class Amnesia extends BaseJoker {
    constructor() {
        super(15, "Amnezi", "gold");
    }

    execute(room, user, payload, context) {
        const targetId = context.targetId;
        if (targetId && typeof targetId === 'string') {
            const target = room.users.find(u => u.id === targetId);
            if (target && target.status === 'playing') {
                if (target.shieldActive) {
                    target.shieldActive = false;
                    room.io.to(room.code).emit("game:visual_effect", { type: 'shield_cast', targetId: target.id });
                    room.addChatLog({ system: true, message: `🧠 ${user.name} Amnezi kullanmak istedi ama ${target.name}'in Gizli Kalkanı buna engel oldu!`, timestamp: Date.now() });
                } else {
                    room.io.to(target.id).emit("game:clear_notepad");
                    room.io.to(room.code).emit("game:visual_effect", { type: 'mind_wipe', targetId: target.id });
                    room.addChatLog({ system: true, message: `🧠 AMNEZİ! ${user.name}, ${target.name} isimli oyuncunun hafızasını sildi! Not defteri artık bomboş...`, timestamp: Date.now() });
                }
                return true;
            }
        }
        return false;
    }
}

module.exports = Amnesia;
