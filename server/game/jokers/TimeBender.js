const BaseJoker = require('./BaseJoker');

class TimeBender extends BaseJoker {
    constructor() {
        super(0, "Zaman Bükücü", "common");
    }

    execute(room, user, payload, context) {
        if (room.currentTurnIndex !== -1 && room.users[room.currentTurnIndex].id === user.id) {
            if (room.timer) clearTimeout(room.timer);
            room.turnTimeLeft = (room.turnStartTime + (room.turnTime * 1000) - Date.now()) / 1000;
            const newTime = room.turnTimeLeft + 60;
            room.turnStartTime = Date.now() - (room.turnTime * 1000 - newTime * 1000); 
            room.timer = setTimeout(() => { if (room.gameState === "PLAYING") room.nextTurn(); }, newTime * 1000);
            room.addChatLog({ system: true, message: `⏳ ${user.name} Zaman Bükücü kullanarak süresine 1 dakika ekledi!`, timestamp: Date.now() });
            room.io.to(room.code).emit("game:visual_effect", { type: 'time_bend', targetId: user.id });
            return true;
        }
        return false;
    }
}

module.exports = TimeBender;
