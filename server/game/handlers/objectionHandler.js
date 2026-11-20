const RewardService = require('../services/RewardService');

function startObjection(room, userId) {
    if (room.objection || room.activeQuestion || room.gameState !== "PLAYING" || room.hasObjectionUsed) return;

    const initiator = room.users.find(u => u.id === userId);
    if (!initiator || initiator.status !== 'playing' || initiator.disconnected) return;

    room.hasObjectionUsed = true;
    room.pausedRemainingMs = Math.max(0, room.turnStartTime + (room.turnTime * 1000) - Date.now());
    if (room.timer) {
        clearTimeout(room.timer);
        room.timer = null;
    }

    room.objection = {
        initiator: initiator.name,
        votes: {},
        endTime: Date.now() + 15000
    };

    room.objection.votes[userId] = true;
    room.broadcastState();

    if (room.objectionTimer) clearTimeout(room.objectionTimer);
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
        if (room.objectionTimer) {
            clearTimeout(room.objectionTimer);
            room.objectionTimer = null;
        }
        resolveObjection(room);
    } else {
        room.broadcastState();
    }
}

async function resolveObjection(room) {
    try {
        if (!room.objection || room.gameState !== "PLAYING" || room.destroyed) return;

        if (room.objectionTimer) {
            clearTimeout(room.objectionTimer);
            room.objectionTimer = null;
        }

        const playingUsers = room.users.filter(u => u.status === 'playing' && !u.disconnected);
        const playingIds = new Set(playingUsers.map(u => u.id));
        let yesVotes = 0;
        for (const [vId, v] of Object.entries(room.objection.votes)) {
            if (v === true && playingIds.has(vId)) yesVotes++;
        }

        // 2-player games require unanimity (both players); 3+ require strict majority (>50%)
        const requiredYes = playingUsers.length <= 2
            ? Math.max(2, playingUsers.length)
            : Math.floor(playingUsers.length / 2) + 1;

        if (yesVotes >= requiredYes) {
            room.objection = null;
            room.clearAllTimers();
            room.gameState = "LOBBY";
            room.chatHistory = [];

            if (room.isBettingEnabled && room.paidDbIds && room.paidDbIds.size > 0) {
                const refundIds = Array.from(room.paidDbIds);
                room.paidDbIds.clear();
                await RewardService.refundBetFees(refundIds, room.betAmount);
                room.io.to(room.code).emit("game:error", { message: `🚨 Şike itirazı kabul edildi! Oyun iptal edildi, henüz ödül almamış oyunculara ${room.betAmount} Altın iade edildi.` });
            } else {
                room.io.to(room.code).emit("game:error", { message: `🚨 Çoğunluk kararı sağlandı! Eğlenceyi sabote edenler olduğu için oyun iptal edildi.` });
            }

            room.broadcastState();
        } else {
            room.io.to(room.code).emit("game:error", { message: `❌ Şike itirazı reddedildi! Yeterli çoğunluk sağlanamadı.` });
            room.objection = null;

            if (room.timer) clearTimeout(room.timer);
            const remaining = Math.max(5000, room.pausedRemainingMs || 5000);
            room.turnStartTime = Date.now() - ((room.turnTime * 1000) - remaining);
            room.timer = setTimeout(() => {
                if (room.gameState === "PLAYING" && !room.destroyed) room.nextTurn();
            }, remaining);

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
