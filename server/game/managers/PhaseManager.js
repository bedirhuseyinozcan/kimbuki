const RewardService = require('../services/RewardService');

function checkPhaseProgression(room) {
    const playingUsers = room.users.filter(u => u.status === 'playing' && !u.disconnected);
    if (playingUsers.length < 2) return;

    if (room.gameState === "BETTING") {
        if (playingUsers.every(u => u.hasPlacedBet)) {
            room.startWordSelection();
        }
    } else if (room.gameState === "WORD_SELECTION") {
        if (playingUsers.every(u => u.hasSubmittedWord)) {
            room.startJokerDraft();
        }
    } else if (room.gameState === "JOKER_DRAFT") {
        if (playingUsers.every(u => u.hasDrafted)) {
            if (room.jokerDraftTimer) clearTimeout(room.jokerDraftTimer);
            room.startPlaying();
        }
    }
}

async function startGame(room, settings = {}) {
    if (room.isStartingGame || room.destroyed) return;
    if (room.gameState !== "LOBBY" && room.gameState !== "ROUND_END") return;

    const activeUsers = room.users.filter(u => !u.disconnected);
    if (activeUsers.length < 2) return;

    room.isStartingGame = true;
    try {
        const isBettingEnabled = Boolean(settings.bettingEnabled);
        const betAmount = settings.betAmount || 50;

        if (isBettingEnabled) {
            const betResult = await RewardService.deductBetFees(activeUsers, betAmount);
            if (room.destroyed) {
                if (betResult.ok) {
                    await RewardService.refundBetFees(activeUsers.map(u => u.dbId).filter(Boolean), betAmount);
                }
                return;
            }
            if (!betResult.ok) {
                room.io.to(room.code).emit("game:error", {
                    message: `${betResult.failedUser?.name || 'Bir oyuncunun'} yeterli altını (${betAmount}) yok veya giriş yapmamış!`
                });
                if (room.gameState === "ROUND_END") {
                    room.gameState = "LOBBY";
                    room.broadcastState();
                }
                return;
            }
            room.paidDbIds = new Set(activeUsers.map(u => u.dbId).filter(Boolean));
        } else {
            room.paidDbIds = new Set();
        }

        room.clearAllTimers();
        room.category = settings.category || "Karışık";
        room.theme = settings.theme || "day";
        room.map = settings.map || "floating_island__low_poly_vr.glb";
        room.initialPlayerCount = activeUsers.length;
        room.isBettingEnabled = isBettingEnabled;
        room.betAmount = betAmount;
        room.isJokersEnabled = settings.jokersEnabled !== undefined ? settings.jokersEnabled : true;
        room.bets = {};
        room.hasObjectionUsed = false;
        room.objection = null;
        room.roundCount = 1;
        room.isProcessingGuess = false;

        room.chatHistory = [];
        room.roundLogs = [];
        room.winners = [];
        room.io.to(room.code).emit("game:init_chat", { chatHistory: [] });
        room.io.to(room.code).emit("game:reset_notepad");
        room.addChatLog({ system: true, message: "🎮 Yeni oyun başladı! Bol şans!", timestamp: Date.now() });

        if (room.isBettingEnabled) {
            room.gameState = "BETTING";
            room.bettingEndTime = Date.now() + 10000;

            for (let i = 0; i < room.users.length; i++) {
                room.users[i].status = room.users[i].disconnected ? 'spectator' : 'playing';
                room.users[i].lives = 3;
                room.users[i].assignedWord = null;
                room.users[i].isWaitingMirrorWord = false;
                room.users[i].hasSubmittedWord = false;
                room.users[i].hasPlacedBet = false;
            }
            room.broadcastState();

            room.betTimer = setTimeout(() => {
                if (!room.destroyed && room.gameState === "BETTING") {
                    room.startWordSelection();
                }
            }, 10000);
            return;
        }

        room.startWordSelection();
    } finally {
        room.isStartingGame = false;
    }
}

function startWordSelection(room) {
    if (room.betTimer) clearTimeout(room.betTimer);
    room.gameState = "WORD_SELECTION";

    const activeUsers = room.users.filter(u => !u.disconnected);

    for (let i = 0; i < room.users.length; i++) {
        room.users[i].status = room.users[i].disconnected ? 'spectator' : 'playing';
        room.users[i].lives = 3;
        room.users[i].assignedWord = null;
        room.users[i].hasSubmittedWord = false;
        room.users[i].joker = null;
        room.users[i].hasDrafted = false;
        room.users[i].jokerChoices = [];
        room.users[i].hasUsedJoker = false;
        room.users[i].russianRouletteActive = false;
        room.users[i].bloodTieTarget = null;
        room.users[i].timeBomb = null;
        room.users[i].detectiveUses = 0;
        room.users[i].lastDetectiveRound = 0;
        room.users[i].mirrorRoundsLeft = 0;
        room.users[i].shieldActive = false;
        room.users[i].extraQuestionChain = false;
        room.users[i].revealedLetters = [];
        room.users[i].silencedTurns = 0;
        room.users[i].extraQuestions = 0;
        room.users[i].questionsAskedThisTurn = 0;
        room.users[i].targetId = null;
    }

    for (let i = 0; i < activeUsers.length; i++) {
        const nextIndex = (i + 1) % activeUsers.length;
        activeUsers[i].targetId = activeUsers[nextIndex].id;
    }

    room.broadcastState();
}

function startJokerDraft(room) {
    if (!room.isJokersEnabled) {
        room.startPlaying();
        return;
    }

    room.gameState = "JOKER_DRAFT";

    const getRandomJoker = () => {
        const r = Math.random() * 100;
        if (r < 10) return [4, 5, 6, 7, 13][Math.floor(Math.random() * 5)];
        if (r < 40) return [2, 3, 8, 12, 15][Math.floor(Math.random() * 5)];
        return [0, 1, 9, 10, 11, 14, 16][Math.floor(Math.random() * 7)];
    };

    for (let u of room.users) {
        if (u.status === 'playing' && !u.disconnected) {
            let j1 = getRandomJoker();
            let j2 = getRandomJoker();
            while (j1 === j2) j2 = getRandomJoker();
            u.jokerChoices = [j1, j2];
            u.hasDrafted = false;
            u.joker = null;
        }
    }

    room.jokerDraftEndTime = Date.now() + 15000;
    room.jokerDraftTimer = setTimeout(() => {
        for (let u of room.users) {
            if (u.status === 'playing' && !u.hasDrafted && room.isJokersEnabled) {
                u.joker = u.jokerChoices ? u.jokerChoices[0] : null;
                u.hasDrafted = true;
            }
        }
        room.startPlaying();
    }, 15000);

    room.broadcastState();
}

function startPlaying(room) {
    room.gameState = "PLAYING";
    room.roundCount = 1;
    room.activeQuestion = null;
    room.resolvedQuestionsThisTurn = [];

    const firstPlayableIndex = room.users.findIndex(u => !u.disconnected && u.status === 'playing');
    room.currentTurnIndex = firstPlayableIndex !== -1 ? firstPlayableIndex : 0;

    room.startTimer();
    room.broadcastState();
}

async function endGame(room) {
    if (room.destroyed || room.gameState === "ROUND_END") return;
    const prevState = room.gameState;
    room.gameState = "ROUND_END";
    room.objection = null;
    room.activeQuestion = null;
    room.clearAllTimers();

    if (prevState === "BETTING" || prevState === "WORD_SELECTION" || prevState === "JOKER_DRAFT") {
        if (room.isBettingEnabled && room.paidDbIds && room.paidDbIds.size > 0) {
            const refundIds = Array.from(room.paidDbIds);
            room.paidDbIds.clear();
            await RewardService.refundBetFees(refundIds, room.betAmount);
            room.addChatLog({
                system: true,
                message: `💸 Oyun başlamadan yetersiz oyuncu nedeniyle iptal edildi. ${room.betAmount} Altın giriş ücretleri iade edildi.`,
                timestamp: Date.now()
            });
        }
        room.broadcastState();
        return;
    }

    const survivors = room.users.filter(u => u.status === 'playing' && !u.disconnected);
    if (prevState === "PLAYING" && room.winners.length === 0 && survivors.length === 1) {
        const survivor = survivors[0];
        if (!room.winners.includes(survivor.id)) {
            room.winners.push(survivor.id);
            survivor.status = 'spectator';

            const rank = room.winners.length;
            const playersCount = room.initialPlayerCount || room.users.length;
            const totalPot = playersCount * (room.betAmount || 50);
            const bettors = room.isBettingEnabled
                ? Object.keys(room.bets || {})
                    .filter(uid => room.bets[uid] === survivor.id)
                    .map(uid => room.users.find(u => u.id === uid))
                    .filter(Boolean)
                : [];

            const { winnerReward, bettorReward, repReward } = RewardService.calculatePotDistribution({
                isBettingEnabled: room.isBettingEnabled,
                totalPot,
                playersCount,
                rank,
                isRussianRoulette: false,
                bettorCount: bettors.length
            });

            const survivorRewards = {};
            if (survivor.dbId) {
                survivorRewards[survivor.dbId] = { gold: winnerReward, rep: repReward, winCount: 1, playCount: 1, betWinCount: 0 };
                room.paidDbIds?.delete(survivor.dbId);
            }
            survivor.reputation = (survivor.reputation || 0) + repReward;

            if (room.isBettingEnabled && bettorReward > 0 && bettors.length > 0) {
                for (const b of bettors) {
                    if (b.dbId) {
                        if (!survivorRewards[b.dbId]) survivorRewards[b.dbId] = { gold: 0, rep: 0, winCount: 0, playCount: 0, betWinCount: 0 };
                        survivorRewards[b.dbId].gold += bettorReward;
                        survivorRewards[b.dbId].rep += 5;
                        survivorRewards[b.dbId].betWinCount += 1;
                    }
                    b.reputation = (b.reputation || 0) + 5;
                }
            }

            const msg = room.isBettingEnabled
                ? `👑 Hayatta kalan son oyuncu ${survivor.name} kazandı! Ödül: ${winnerReward} Altın.`
                : `👑 Hayatta kalan son oyuncu ${survivor.name} kazandı! (+${repReward} İtibar)`;
            room.addChatLog({ system: true, message: msg, timestamp: Date.now() });
            room.roundLogs.push(msg);

            await RewardService.grantBatchRewards(survivorRewards);
        }
    }

    await RewardService.grantParticipationRewards(room.users, room.winners);
    room.broadcastState();
}

module.exports = {
    checkPhaseProgression,
    startGame,
    startWordSelection,
    startJokerDraft,
    startPlaying,
    endGame
};
