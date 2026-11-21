function serializeStateForUser(room, user) {
    const usersPayload = room.users.map(u => ({
        id: u.id,
        dbId: u.id === user.id ? u.dbId : undefined,
        name: u.name,
        isHost: u.isHost,
        avatar: u.avatar,
        pedestal: u.pedestal,
        nameColor: u.nameColor,
        title: u.title,
        reputation: u.reputation || 0,
        status: u.status,
        targetId: u.targetId,
        hasSubmittedWord: u.hasSubmittedWord,
        isVoiceEnabled: u.isVoiceEnabled,
        lives: u.lives,
        disconnected: !!u.disconnected,
        joker: u.id === user.id ? u.joker : null,
        jokerChoices: u.id === user.id ? u.jokerChoices : undefined,
        hasDrafted: u.hasDrafted,
        hasUsedJoker: u.hasUsedJoker,
        russianRouletteActive: u.russianRouletteActive,
        bloodTieTarget: u.bloodTieTarget,
        timeBomb: u.timeBomb,
        mirrorRoundsLeft: (u.id === user.id) ? (u.mirrorRoundsLeft || 0) : 0,
        shieldActive: (u.id === user.id) ? !!u.shieldActive : false,
        extraQuestionChain: (u.id === user.id) ? u.extraQuestionChain : false,
        silencedTurns: u.silencedTurns,
        extraQuestions: u.extraQuestions || 0,
        questionsAskedThisTurn: u.questionsAskedThisTurn || 0,
        lastQuestion: u.lastQuestion,
        lastQuestions: u.lastQuestions || [],
        assignedWord: (room.gameState === "ROUND_END" || u.id !== user.id) ? u.assignedWord : null
    }));

    return {
        gameState: room.gameState,
        category: room.category,
        theme: room.theme,
        map: room.map,
        gameMode: room.gameMode || "classic",
        isBettingEnabled: room.isBettingEnabled,
        betAmount: room.betAmount,
        isJokersEnabled: room.isJokersEnabled,
        activeQuestion: room.activeQuestion,
        resolvedQuestionsThisTurn: room.resolvedQuestionsThisTurn || [],
        users: usersPayload,
        currentTurnUserId: room.gameState === "PLAYING" ? room.users[room.currentTurnIndex]?.id : null,
        turnEndsAt: room.gameState === "PLAYING"
            ? ((room.activeQuestion || room.objection) ? Date.now() + room.pausedRemainingMs : room.turnStartTime + (room.turnTime * 1000))
            : null,
        winners: room.winners,
        objection: room.objection,
        hasObjectionUsed: room.hasObjectionUsed,
        bettingEndTime: room.bettingEndTime,
        jokerDraftEndTime: room.jokerDraftEndTime,
        roundCount: room.roundCount || 1,
        roundLogs: room.gameState === "ROUND_END" ? room.roundLogs : []
    };
}

function broadcastState(room) {
    room.users.forEach(user => {
        if (user.disconnected) return;
        const payload = serializeStateForUser(room, user);
        room.io.to(user.id).emit("game:state", payload);
    });
}

function broadcastHeadRotation(room, socketOrId, payload) {
    if (!payload || typeof payload.pitch !== 'number' || typeof payload.yaw !== 'number') return;

    const isSocket = typeof socketOrId === 'object' && socketOrId !== null && typeof socketOrId.to === 'function';
    const userId = isSocket ? socketOrId.id : socketOrId;
    const user = room.users.find(u => u.id === userId);
    if (!user) return;

    const now = Date.now();
    if (now - user.lastHeadRotTime < 50) return;
    user.lastHeadRotTime = now;

    const emitter = isSocket ? socketOrId.to(room.code) : room.io.to(room.code);
    emitter.emit("game:head_update", {
        userId,
        pitch: payload.pitch,
        yaw: payload.yaw
    });
}

module.exports = {
    serializeStateForUser,
    broadcastState,
    broadcastHeadRotation
};
