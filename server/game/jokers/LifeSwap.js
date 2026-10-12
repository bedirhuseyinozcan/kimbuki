const BaseJoker = require('./BaseJoker');

class LifeSwap extends BaseJoker {
    constructor() {
        super(13, "Can Takası", "prismatic");
    }

    execute(room, user, payload, context) {
        const targetId = context.targetId;
        const initialTargetId = context.initialTargetId;

        if (!targetId || typeof targetId !== 'string') return false;

        const target = room.users.find(u => u.id === targetId);
        if (!target || target.status !== 'playing') return false;

        if (target.id === user.id && initialTargetId !== user.id) {
            room.io.to(room.code).emit("game:visual_effect", { type: 'mind_wipe', targetId: user.id }); 
            room.addChatLog({ system: true, message: `🤡 BÜYÜ GERİ TEPTİ! Ayna yüzünden ${user.name} kendi canını kendisiyle takas etti. Joker tamamen boşa gitti!`, timestamp: Date.now() });
        } else if (target.shieldActive) {
            target.shieldActive = false;
            room.io.to(room.code).emit("game:visual_effect", { type: 'shield_cast', targetId: target.id });
            room.addChatLog({ system: true, message: `🧛‍♂️ ${user.name} Can Takası yapmak istedi ama ${target.name}'in Gizli Kalkanı buna engel oldu!`, timestamp: Date.now() });
        } else {
            const tempLives = user.lives;
            user.lives = target.lives;
            target.lives = tempLives;

            room.io.to(room.code).emit("game:visual_effect", { type: 'blood_tie', targetId: target.id });
            room.io.to(room.code).emit("game:visual_effect", { type: 'blood_tie', targetId: user.id });

            room.addChatLog({ system: true, message: `🧛‍♂️ İHANET! ${user.name}, ${target.name} ile canlarını takas etti!`, timestamp: Date.now() });

            if (user.lives <= 0) {
                user.status = 'spectator';
                room.addChatLog({ system: true, message: `💀 ${user.name}, canı olmayan biriyle takas yapıp kendi kendini eledi!`, timestamp: Date.now() });
            }
            if (target.lives <= 0) {
                target.status = 'spectator';
                room.addChatLog({ system: true, message: `💀 ${target.name} canı kalmadığı için elendi! Kelimesi: ${target.assignedWord}`, timestamp: Date.now() });
            }
        }
        return true;
    }
}

module.exports = LifeSwap;
