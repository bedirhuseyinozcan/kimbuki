const RewardService = require('../services/RewardService');
function startObjection(room, userId) {
    if (room.objection || room.gameState !== "PLAYING" || room.hasObjectionUsed) return;

    const initiator = room.users.find(u => u.id === userId);
    if (!initiator) return;

    room.hasObjectionUsed = true;
    room.pausedRemainingMs = room.turnStartTime + (room.turnTime * 1000) - Date.now();
    if (room.timer) clearTimeout(room.timer);

    room.objection = {
        initiator: initiator.name,
        votes: {},
        endTime: Date.now() + 15000
    };

    room.objection.votes[userId] = true;
    room.broadcastState();

    room.objectionTimer = setTimeout(() => {
        resolveObjection(room);
    }, 15000);
}

function voteObjection(room, userId, vote) {
    if (!room.objection || typeof vote !== 'boolean') return;

    const user = room.users.find(u => u.id === userId);
    if (!user || user.status !== 'playing' || user.disconnected) return;

    room.objection.votes[userId] = vote;

    const playingUsers = room.users.filter(u => u.status === 'playing' && !u.disconnected);
    const voteCount = Object.keys(room.objection.votes).filter(vId => playingUsers.some(p => p.id === vId)).length;

    if (voteCount >= playingUsers.length) {
        if (room.objectionTimer) clearTimeout(room.objectionTimer);
        resolveObjection(room);
    } else {
        room.broadcastState();
    }
}

async function resolveObjection(room) {
    try {
        if (!room.objection) return;

        const playingUsers = room.users.filter(u => u.status === 'playing' && !u.disconnected);
        let yesVotes = 0;
        for (let v of Object.values(room.objection.votes)) {
            if (v === true) yesVotes++;
        }

        const majority = Math.ceil(playingUsers.length / 2);

        if (yesVotes >= majority) {
            if (room.isBettingEnabled) {
                const dbIds = room.users.map(u => u.dbId).filter(Boolean);
                await RewardService.refundBetFees(dbIds, room.betAmount);
                room.io.to(room.code).emit("game:error", { message: `🚨 Şike itirazı kabul edildi! Oyun iptal edildi, herkese ${room.betAmount} Altın iade edildi.` });
            } else {
                room.io.to(room.code).emit("game:error", { message: `🚨 Çoğunluk kararı sağlandı! Eğlenceyi sabote edenler olduğu için oyun iptal edildi.` });
            }

            room.objection = null;
            if (room.timer) clearTimeout(room.timer);
            room.gameState = "LOBBY";
            room.chatHistory = [];
            room.broadcastState();
        } else {
            room.io.to(room.code).emit("game:error", { message: `❌ Şike itirazı reddedildi! Yeterli çoğunluk sağlanamadı.` });
            room.objection = null;

            room.turnStartTime = Date.now() - ((room.turnTime * 1000) - room.pausedRemainingMs);
            room.timer = setTimeout(() => {
                if (room.gameState === "PLAYING") room.nextTurn();
            }, Math.max(5000, room.pausedRemainingMs));

            room.broadcastState();
        }
    } catch (error) {
        console.error(`[objectionHandler] Error in resolveObjection in room ${room?.code}:`, error);
        if (room && room.io && room.code) {
            room.io.to(room.code).emit("game:error", { message: "İtiraz çözümlenirken bir sunucu hatası oluştu." });
        }
    }
}

module.exports = {
    startObjection,
    voteObjection,
    resolveObjection
};
