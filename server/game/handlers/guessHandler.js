const RewardService = require('../services/RewardService');

async function guessWord(room, userId, guess) {
    try {
        if (room.gameState !== "PLAYING" || typeof guess !== 'string') return;

    const currentUser = room.users[room.currentTurnIndex];
    if (!currentUser || currentUser.id !== userId) return;

    const user = room.users.find(u => u.id === userId);
    if (!user || user.status !== 'playing') return;

    const normalizedTarget = (user.assignedWord || "").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]/g, "");
    const normalizedGuess = (guess || "").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]/g, "");
    if (!normalizedGuess || normalizedGuess.length < 3) return;

    const targetTokens = (user.assignedWord || "").toLocaleLowerCase("tr-TR").split(/\s+/).map(w => w.replace(/[^a-z0-9çğıöşü]/g, "")).filter(Boolean);
    const isTokenMatch = targetTokens.some(w => w === normalizedGuess && w.length >= 3);

    const isSubstringMatch = (normalizedTarget.length >= 4 && normalizedGuess.length >= 4) &&
                             (normalizedTarget.includes(normalizedGuess) || normalizedGuess.includes(normalizedTarget));

    const isCorrect = (normalizedTarget === normalizedGuess) || isTokenMatch || isSubstringMatch;
    const isRussianRoulette = user.russianRouletteActive;

    if (isCorrect) {
        user.status = 'spectator';
        user.bloodTieTarget = null;
        room.winners.push(user.id);

        if (user.timeBomb) {
            const caster = room.users.find(c => c.id === user.timeBomb.casterId);
            if (caster && caster.status === 'playing' && caster.id !== user.id) {
                let dmg = 2;
                let shielded = false;
                if (caster.shieldActive) {
                    shielded = true;
                    caster.shieldActive = false;
                    dmg -= 1;
                    room.io.to(room.code).emit("game:visual_effect", { type: 'shield_cast', targetId: caster.id });
                }
                caster.lives -= dmg;
                room.io.to(room.code).emit("game:visual_effect", { type: 'bomb_explode', targetId: caster.id });

                if (shielded) {
                    room.addChatLog({ system: true, message: `🛡️ 💥 İADE! ${user.name} bombayı bildi! ${caster.name}'in kalkanı kırıldı ama yine de 1 can kaybetti!`, timestamp: Date.now() });
                } else {
                    room.addChatLog({ system: true, message: `🔄💥 İADE! ${user.name} kelimesini bildi ve bombayı ${caster.name}'e geri fırlatarak patlattı! (-2 Can)`, timestamp: Date.now() });
                }
                if (caster.lives <= 0) {
                    caster.status = 'spectator';
                    caster.timeBomb = null;
                    caster.bloodTieTarget = null;
                    room.addChatLog({ system: true, message: `💀 ${caster.name} kendi bombasıyla elendi! Kelimesi: ${caster.assignedWord}`, timestamp: Date.now() });
                }
            } else if (caster && caster.id === user.id) {
                room.addChatLog({ system: true, message: `💣 ${user.name} kalkanından seken kendi bombasını başarıyla imha etti!`, timestamp: Date.now() });
            }
            user.timeBomb = null;
        }

        const rank = room.winners.length;
        const playersCount = room.initialPlayerCount || room.users.length;
        const totalPot = playersCount * (room.betAmount || 50);

        const { winnerReward, bettorReward, repReward } = RewardService.calculatePotDistribution({
            isBettingEnabled: room.isBettingEnabled,
            totalPot,
            playersCount,
            rank,
            isRussianRoulette
        });

        let playerRewards = {};
        const addReward = (dbId, gold, rep, type) => {
            if (!dbId) return;
            if (!playerRewards[dbId]) playerRewards[dbId] = { gold: 0, rep: 0, winCount: 0, playCount: 0, betWinCount: 0 };
            playerRewards[dbId].gold += gold;
            playerRewards[dbId].rep += rep;
            if (type === 'win') { playerRewards[dbId].winCount++; playerRewards[dbId].playCount++; }
            if (type === 'bet_win') { playerRewards[dbId].betWinCount++; }
        };

        addReward(user.dbId, winnerReward, repReward, 'win');
        user.reputation = (user.reputation || 0) + repReward;

        let winMsg = "";
        if (isRussianRoulette) {
            winMsg = `💀👑 RUS RULETİ BAŞARILI! ${user.name} hayatını riske attı ve tüm kasayı (${winnerReward || repReward} Ödül) TEK BAŞINA ALDI!`;
        } else if (room.isBettingEnabled) {
            winMsg = `🏆 ${user.name} doğru tahmin etti! (${rank}. oldu) -> Oyun kazancı: ${winnerReward} Altın. (Kelimesi: ${user.assignedWord})`;
        } else {
            winMsg = `🏆 ${user.name} doğru tahmin etti! (${rank}. oldu) -> Oyun kazancı: ${repReward} İtibar. (Kelimesi: ${user.assignedWord})`;
        }
        room.addChatLog({ system: true, message: winMsg, timestamp: Date.now() });
        if (!room.roundLogs) room.roundLogs = [];
        room.roundLogs.push(winMsg);

        if (room.isBettingEnabled && bettorReward > 0 && !isRussianRoulette) {
            const bettors = Object.keys(room.bets || {}).filter(uid => room.bets[uid] === user.id);
            let bettorNames = [];

            for (let uid of bettors) {
                const bettorUser = room.users.find(u => u.id === uid);
                if (bettorUser) {
                    addReward(bettorUser.dbId, bettorReward, 5, 'bet_win');
                    bettorUser.reputation = (bettorUser.reputation || 0) + 5;
                    bettorNames.push(bettorUser.name);
                }
            }

            if (bettorNames.length > 0) {
                const betMsg = `🎲 Bahis Kazananları (${user.name} üzerine oynayanlar): ${bettorNames.join(', ')} -> Bahis kazancı: Ekstra ${bettorReward} Altın!`;
                room.addChatLog({ system: true, message: betMsg, timestamp: Date.now() });
                room.roundLogs.push(betMsg);
            }
        }

        await RewardService.grantBatchRewards(playerRewards);

        if (isRussianRoulette) {
            room.endGame();
            return;
        }

        const playingUsers = room.users.filter(u => u.status === 'playing');
        if (playingUsers.length <= 1) {
            room.endGame();
            return;
        }

        if (room.users[room.currentTurnIndex]?.id === userId) {
            room.nextTurn();
        } else {
            room.broadcastState();
        }
    } else {
        let dmg = isRussianRoulette ? 3 : 1;
        let shielded = false;
        if (user.shieldActive) {
            shielded = true;
            user.shieldActive = false;
            dmg -= 1;
            room.io.to(room.code).emit("game:visual_effect", { type: 'shield_cast', targetId: user.id });
        }

        user.lives -= dmg;
        if (isRussianRoulette) user.russianRouletteActive = false;

        if (user.lives <= 0) {
            user.status = 'spectator';
            user.bloodTieTarget = null;
            user.timeBomb = null;
            if (isRussianRoulette) {
                room.io.to(room.code).emit("game:visual_effect", { type: 'roulette_die', targetId: user.id });
                room.addChatLog({ system: true, message: `💀 RUS RULETİ PATLADI! ${user.name} yanlış bildi ve elendi! Kelimesi: ${user.assignedWord}`, timestamp: Date.now() });
            } else {
                room.addChatLog({ system: true, message: `💀 ${user.name} tüm tahmin haklarını kaybetti ve izleyici oldu! Kelimesi: ${user.assignedWord}`, timestamp: Date.now() });
            }
        } else {
            if (isRussianRoulette) {
                room.addChatLog({ system: true, message: `🛡️ ${user.name} Rus Ruleti'nde yanlış bildi! Kalkanı parçalandı ve ağır yaralandı ama yaşıyor! (Kalan Can: ${user.lives})`, timestamp: Date.now() });
            } else if (shielded) {
                room.addChatLog({ system: true, message: `🛡️ ${user.name} yanlış tahminde bulundu! Gizli Kalkanı kırılarak onu korudu!`, timestamp: Date.now() });
            } else {
                room.addChatLog({ system: true, message: `${user.name} yanlış tahminde bulundu! (${guess}) (Kalan Can: ${user.lives})`, timestamp: Date.now() });
            }
        }

        const playingUsers = room.users.filter(u => u.status === 'playing');
        if (playingUsers.length <= 1) {
            room.endGame();
            return;
        }

        if (room.users[room.currentTurnIndex]?.id === userId) {
            room.nextTurn();
        } else {
            room.broadcastState();
        }
    }
} catch (error) {
    console.error(`[guessHandler] Error in guessWord for user ${userId} in room ${room?.code}:`, error);
    if (room && room.io && userId) {
        room.io.to(userId).emit("game:error", { message: "Tahmin işlenirken bir sunucu hatası oluştu. Lütfen tekrar deneyin." });
    }
}
}

module.exports = {
    guessWord
};
